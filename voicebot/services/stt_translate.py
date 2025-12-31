# stt_translate.py (Complete File - Includes DB, Takeover, Ask Name Logic)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends
from loguru import logger
import os
import uuid
import requests # Using requests for the STT multipart/form-data call
from dotenv import load_dotenv
import json
import httpx # Using httpx for async calls to other microservices
from typing import Optional, Dict, Set, List, Any
import re # Import the regular expression module
import asyncpg # Import asyncpg
from fastapi.middleware.cors import CORSMiddleware
import time
from datetime import datetime, timezone # For timestamp calculations
from pydantic import BaseModel # For request/response models

# --- Load Environment Variables ---
load_dotenv()

# --- Database Configuration ---
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("DATABASE_URL not found in environment variables.")
    raise RuntimeError("Missing DATABASE_URL")
db_pool: Optional[asyncpg.Pool] = None # Global variable for connection pool

# --- Service URLs & API Keys ---
SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text-translate"
LLAMA_SERVICE_URL = os.getenv("LLAMA_SERVICE_URL", "http://192.168.31.30:8001/chat")
# Ensure ROUTING_API_URL points to where api.py (or similar) runs, default assumed 8002
ROUTING_API_URL = os.getenv("ROUTING_API_URL", "http://192.168.31.30:8002/route-call")
TTS_SERVICE_URL = os.getenv("TTS_SERVICE_URL", "http://192.168.31.30:8003/synthesize")
TRANSLATE_SERVICE_URL = os.getenv("TRANSLATE_SERVICE_URL", "http://192.168.31.30:8004/translate")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

# --- Timeouts ---
LLAMA_REQUEST_TIMEOUT = 30.0
ROUTING_REQUEST_TIMEOUT = 10.0
TTS_REQUEST_TIMEOUT = 45.0
TRANSLATE_REQUEST_TIMEOUT = 30.0
STT_REQUEST_TIMEOUT = 60.0

# --- Configuration ---
NON_SPECIFIC_ROUTING_LABELS: Set[str] = {"Unknown", "General Inquiry"} # Adjust as needed

# --- LLaMA Prompts ---
INITIAL_SYSTEM_PROMPT = (
    "You are an AI assistant in a real-time emergency call center in Kerala, India. "
    "Your FIRST task is to calmly ask the caller for their name. "
    "Say EXACTLY this: \"This is the emergency line. Could I please get your name?\" "
    "Do not ask any other questions or add any other text in this first turn. "
    "Wait for their response."
)
STANDARD_SYSTEM_PROMPT = (
    "You are an AI assistant in a real-time emergency call center in Kerala, India. "
    "Speak calmly, ask only one question at a time, and never refer them to 911. "
    "Never redirect to any other service. Always remain the official emergency contact. "
    "The user may have already provided their name."
)
NAME_REQUEST_PHRASE = "Could I please get your name?" # Phrase used in initial prompt
def create_confirmation_system_prompt(department_name: str) -> str:
    confirmation_phrase = f"Understood. I am recording the details for the {department_name}. Please be assured that someone from that department will contact you shortly."
    return (
        "You are an AI assistant in a real-time emergency call center in Kerala, India.\n"
        f"A specific department has been identified for this user's issue: {department_name}.\n"
        f"Your primary task now is to FIRST acknowledge this and give the confirmation. State clearly: \"{confirmation_phrase}\"\n"
        "AFTER giving that exact confirmation, you MUST then ask the NEXT single, most important question calmly to gather necessary details (like location, number of people, current status etc.). Do not ask multiple questions.\n"
        "Speak calmly. Never refer them to 911 or other services. Always remain the official emergency contact."
    )

# --- FastAPI App Initialization ---
app = FastAPI(title="STT Translate Service with Call Management")

# --- CORS Middleware ---
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://192.168.31.30", # Allow backend IP itself
    # Add your deployed frontend URL in production
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info(f"CORS middleware enabled for origins: {origins}")

# --- Database Connection Pool Management ---
@app.on_event("startup")
async def startup_database():
    global db_pool
    try:
        # Increase connection timeout if needed, default is 60s
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10, command_timeout=60)
        logger.info("✅ Database connection pool established.")
        # Optional: Check connection
        async with db_pool.acquire() as conn:
            await conn.execute("SELECT 1")
        logger.info("✅ Database connection verified.")
    except Exception as e:
        logger.critical(f"❌ FATAL: Failed to connect to database on startup: {e}")
        db_pool = None # Ensure pool is None if connection failed

@app.on_event("shutdown")
async def shutdown_database():
    global db_pool
    if db_pool:
        logger.info("Closing database connection pool...")
        await db_pool.close()
        logger.info("Database connection pool closed.")

# --- HTTP Client Management ---
http_client = httpx.AsyncClient() # No timeout here, set per request
@app.on_event("shutdown")
async def shutdown_http_client():
    await http_client.aclose()
    logger.info("HTTPX client closed.")

# --- Helper Function to Update Call ---
async def update_call_data(session_id: str, data_to_update: Dict[str, Any]):
    """Updates specific fields for an active call in the database."""
    global db_pool
    # Do not proceed if pool is not initialized or no data provided
    if not db_pool or not data_to_update:
        if not db_pool: logger.error(f"[{session_id}] DB pool not available for update.")
        return

    # Always update last_update_time
    data_to_update["last_update_time"] = datetime.now(timezone.utc)

    set_clauses = []
    values = []
    i = 1
    # Build SET clauses and values list for parameterized query
    for key, value in data_to_update.items():
        # Basic validation/sanitization could happen here if needed
        set_clauses.append(f"{key} = ${i}")
        values.append(value)
        i += 1

    # Add session_id as the last parameter for the WHERE clause
    values.append(session_id)
    query = f"UPDATE active_calls SET {', '.join(set_clauses)} WHERE session_id = ${i}"

    try:
        async with db_pool.acquire() as conn:
            result = await conn.execute(query, *values)
            # Optional: Check result status if needed ('UPDATE 1' etc.)
            # logger.debug(f"[{session_id}] DB update result: {result}. Fields: {list(data_to_update.keys())}")
    except asyncpg.PostgresError as db_err:
        logger.error(f"[{session_id}] DB Update Error: {db_err}. Query: {query}, Values: {values[:-1]}") # Log query details on error
    except Exception as e:
        logger.error(f"[{session_id}] Failed to update call data in DB (Non-DB Error): {e}")


# --- WebSocket Endpoint ---
@app.websocket("/ws/call/{session_id}")
async def call_endpoint(websocket: WebSocket, session_id: str):
    global db_pool
    if not db_pool:
        logger.warning(f"[{session_id}] DB pool unavailable. Rejecting WS connection.")
        # Cannot accept then close with reason easily before accept, client will just fail
        return

    await websocket.accept()
    logger.info(f"New WS connection. session_id={session_id}")

    db_initialized_for_session = False
    try:
        async with db_pool.acquire() as conn:
            # Initialize/reset call state in DB
            await conn.execute(
                """
                INSERT INTO active_calls (session_id, caller_name, caller_number, location, status, routing_label, priority, detected_language, confirmation_given, handled_by)
                VALUES ($1, 'Unknown', NULL, 'Unknown', 'Active', 'Unknown', 'Normal', NULL, FALSE, 'AI')
                ON CONFLICT (session_id) DO UPDATE SET
                    status = 'Active',
                    start_time = CASE WHEN active_calls.status != 'Active' THEN CURRENT_TIMESTAMP ELSE active_calls.start_time END, -- Only reset start time if it wasn't already active
                    last_update_time = CURRENT_TIMESTAMP,
                    caller_name = 'Unknown',
                    caller_number = NULL,
                    location = 'Unknown',
                    routing_label = 'Unknown',
                    priority = 'Normal',
                    detected_language = NULL,
                    confirmation_given = FALSE,
                    handled_by = 'AI';
                """,
                session_id
            )
        logger.info(f"[{session_id}] Initialized/Reset call state in DB.")
        db_initialized_for_session = True # DB interaction successful
    except Exception as db_init_err:
        logger.error(f"[{session_id}] Failed to initialize call in DB: {db_init_err}")
        await websocket.close(code=1011, reason="Database initialization error")
        return

    # --- Session State Variables ---
    confirmation_given_this_session: bool = False
    chat_history: List[Dict[str, str]] = []
    awaiting_name: bool = False
    caller_name_known: bool = False
    current_handler: str = "AI" # Default, will be updated from DB
    TARGET_LANGUAGE_CODE = "ml-IN"
    LLAMA_RESPONSE_LANGUAGE_CODE = "en-IN"

    try:
        # Fetch initial state after ensuring initialization
        async with db_pool.acquire() as conn:
             initial_state = await conn.fetchrow(
                 "SELECT caller_name, confirmation_given, handled_by FROM active_calls WHERE session_id = $1",
                 session_id
             )
             if initial_state:
                 confirmation_given_this_session = initial_state['confirmation_given']
                 current_handler = initial_state['handled_by']
                 if initial_state['caller_name'] and initial_state['caller_name'] != 'Unknown':
                     caller_name_known = True
                     logger.info(f"[{session_id}] Initial handler: {current_handler}, Name known: {caller_name_known}, Conf given: {confirmation_given_this_session}")


        # --- Main Processing Loop ---
        while True:
            try:
                message = await websocket.receive()
                message_type = message.get("type")

                if message_type == "websocket.disconnect":
                    logger.info(f"[{session_id}] WebSocket disconnected event.")
                    break

                elif message_type == "websocket.receive":
                    if "bytes" in message:
                        audio_chunk = message["bytes"]
                        user_transcript = ""
                        stt_detected_language: Optional[str] = None
                        predicted_label: str = "Unknown"

                        try:
                            # --- Check Handler Status from DB ---
                            async with db_pool.acquire() as conn:
                                handler_status = await conn.fetchval("SELECT handled_by FROM active_calls WHERE session_id = $1", session_id)
                                if handler_status: current_handler = handler_status

                            if current_handler == 'Human':
                                logger.debug(f"[{session_id}] Handled by Human. Skipping AI processing.")
                                # Keep connection alive, maybe reduce logging frequency
                                continue # Ignore audio chunk for AI pipeline

                            # --- 1. STT ---
                            temp_filename_for_api = f"stt_{session_id}.wav" # Use simpler temp name
                            files_payload = {"file": (temp_filename_for_api, audio_chunk, "audio/wav"), "model": (None, "saaras:v2"), "with_diarization": (None, "false")}
                            headers = {"api-subscription-key": SARVAM_API_KEY}
                            stt_response = requests.post(SARVAM_STT_URL, files=files_payload, headers=headers, timeout=STT_REQUEST_TIMEOUT)

                            if stt_response.status_code != 200:
                                logger.error(f"[{session_id}] STT error {stt_response.status_code}: {stt_response.text}")
                                await websocket.send_text(json.dumps({"type": "stt-error", "message": f"STT Error {stt_response.status_code}"}))
                                continue
                            else:
                                # --- 2. Process STT & Update State/History ---
                                result_json = stt_response.json()
                                user_transcript = result_json.get("transcript", "").strip()
                                stt_detected_language = result_json.get("language_code")
                                logger.info(f"✅ [{session_id}] Transcript: '{user_transcript}' (Lang: {stt_detected_language})")

                                update_payload = {"last_transcript": user_transcript}
                                if stt_detected_language: update_payload["detected_language"] = stt_detected_language

                                if awaiting_name and user_transcript and not caller_name_known:
                                    logger.info(f"[{session_id}] Storing caller name: '{user_transcript}'")
                                    update_payload["caller_name"] = user_transcript[:255] # Limit length for DB
                                    caller_name_known = True
                                    awaiting_name = False
                                await update_call_data(session_id, update_payload)

                                if user_transcript: chat_history.append({"role": "user", "content": user_transcript})

                                escaped_transcript = json.dumps(user_transcript)
                                await websocket.send_text(f'{{"type":"transcript","payload": {escaped_transcript}}}')

                                if not user_transcript and not chat_history: continue # Skip rest only if empty on first turn

                                # --- 3. Routing ---
                                routing_payload = {"transcript": user_transcript or " "}
                                predicted_label_from_api = "Unknown"
                                try:
                                    routing_response = await http_client.post(ROUTING_API_URL, json=routing_payload, timeout=ROUTING_REQUEST_TIMEOUT)
                                    routing_response.raise_for_status()
                                    routing_result = routing_response.json()
                                    predicted_label_from_api = routing_result.get("forwarded_to", "Unknown")
                                    logger.info(f"🚦 [{session_id}] Routing: {predicted_label_from_api}")
                                    await update_call_data(session_id, {"routing_label": predicted_label_from_api})
                                    predicted_label = predicted_label_from_api
                                except Exception as routing_err:
                                    logger.error(f"[{session_id}] Routing failed: {routing_err}")
                                    # Don't send error to user here, just log it and proceed

                                # --- 4. Send Routing Info ---
                                escaped_label = json.dumps(predicted_label)
                                await websocket.send_text(f'{{"type":"routing_info", "payload": {{"department": {escaped_label}}}}}')

                                # --- 5. Determine LLaMA prompt ---
                                system_content = STANDARD_SYSTEM_PROMPT
                                if not chat_history or (len(chat_history) == 1 and chat_history[0]["role"] == "user" and not caller_name_known):
                                    system_content = INITIAL_SYSTEM_PROMPT
                                    awaiting_name = True
                                    logger.info(f"[{session_id}] Using initial prompt.")
                                else:
                                    awaiting_name = False
                                    is_specific_routing = predicted_label and predicted_label not in NON_SPECIFIC_ROUTING_LABELS
                                    should_give_confirmation = is_specific_routing and not confirmation_given_this_session
                                    if should_give_confirmation:
                                        system_content = create_confirmation_system_prompt(predicted_label)
                                        logger.info(f"[{session_id}] Using confirmation prompt.")
                                        await update_call_data(session_id, {"confirmation_given": True})
                                        confirmation_given_this_session = True
                                    # else: logger.debug(f"[{session_id}] Using standard prompt.") # Less verbose

                                # --- 6. LLaMA ---
                                llama_payload = {"session_id": session_id, "input_text": user_transcript, "system_prompt_override": system_content}
                                ai_response_content = ""
                                try:
                                    llama_response = await http_client.post(LLAMA_SERVICE_URL, json=llama_payload, timeout=LLAMA_REQUEST_TIMEOUT)
                                    llama_response.raise_for_status()
                                    llama_result = llama_response.json()
                                    ai_response_content = llama_result.get("response_text", "").strip()
                                    if ai_response_content:
                                        logger.info(f"🤖 [{session_id}] LLaMA response generated.")
                                        chat_history.append({"role": "assistant", "content": ai_response_content})
                                        # Optional: Update priority based on emotion
                                        # if 'emotion' in llama_result: await update_call_data(session_id, {"priority": llama_result['emotion']})
                                    else: logger.warning(f"[{session_id}] LLaMA empty response.")
                                except Exception as llama_err:
                                    logger.exception(f"[{session_id}] LLaMA error: {llama_err}")
                                    # Don't stop the loop, maybe TTS fallback can say something generic?
                                    ai_response_content = "I apologize, I encountered a problem. Could you please repeat?" # Generic fallback

                                # --- 7. Translate ---
                                translated_ai_response_content = ""
                                if ai_response_content:
                                    translate_payload = {"text_to_translate": ai_response_content, "source_language_code": LLAMA_RESPONSE_LANGUAGE_CODE, "target_language_code": TARGET_LANGUAGE_CODE}
                                    try:
                                        translate_response = await http_client.post(TRANSLATE_SERVICE_URL, json=translate_payload, timeout=TRANSLATE_REQUEST_TIMEOUT)
                                        translate_response.raise_for_status()
                                        translate_result = translate_response.json()
                                        translated_ai_response_content = translate_result.get("translated_text", "").strip()
                                        if translated_ai_response_content: logger.success(f"🔄 [{session_id}] Translated.")
                                        else: translated_ai_response_content = ai_response_content # Fallback
                                    except Exception as translate_err:
                                        logger.exception(f"[{session_id}] Translation error: {translate_err}")
                                        translated_ai_response_content = ai_response_content # Fallback
                                else: translated_ai_response_content = ""


                                # --- 8. Clean Text for TTS ---
                                text_for_tts = translated_ai_response_content
                                if text_for_tts:
                                    text_for_tts = re.sub(r'[?!]+', '', text_for_tts)
                                    text_for_tts = re.sub(r'\s+', ' ', text_for_tts).strip()
                                    logger.info(f"[{session_id}] Cleaned TTS text ready.")


                                # --- 9. TTS ---
                                if text_for_tts:
                                    tts_payload = {"text_to_speak": text_for_tts, "target_language_code": TARGET_LANGUAGE_CODE}
                                    try:
                                        tts_response = await http_client.post(TTS_SERVICE_URL, json=tts_payload, timeout=TTS_REQUEST_TIMEOUT)
                                        tts_response.raise_for_status()
                                        tts_result = tts_response.json()
                                        audio_base64 = tts_result.get("audio_base64")

                                        if audio_base64:
                                            # --- 10. Send Audio Response ---
                                            tts_ws_payload = {"type": "ai_audio_response", "payload": {"text_content": translated_ai_response_content, "audio_base64": audio_base64, "language_code": TARGET_LANGUAGE_CODE}}
                                            await websocket.send_text(json.dumps(tts_ws_payload))
                                            logger.success(f"🔊 [{session_id}] TTS Audio sent.")
                                            await update_call_data(session_id, {}) # Update timestamp
                                        else:
                                            logger.error(f"[{session_id}] TTS empty audio data.")
                                            escaped_ai_text = json.dumps(translated_ai_response_content)
                                            await websocket.send_text(f'{{"type":"ai-response", "payload": {{"response": {escaped_ai_text}}}}}')
                                    except Exception as tts_err:
                                        logger.exception(f"[{session_id}] TTS error: {tts_err}")
                                        escaped_ai_text = json.dumps(translated_ai_response_content)
                                        await websocket.send_text(f'{{"type":"ai-response", "payload": {{"response": {escaped_ai_text}}}}}')
                                else:
                                    logger.warning(f"[{session_id}] Skipping TTS (empty text).")
                                    escaped_ai_text = json.dumps("")
                                    await websocket.send_text(f'{{"type":"ai-response", "payload": {{"response": {escaped_ai_text}}}}}')

                        except requests.exceptions.RequestException as req_err:
                            logger.exception(f"[{session_id}] STT request error: {req_err}")
                            await websocket.send_text(json.dumps({"type":"error","message":"STT service connection error."}))
                            await update_call_data(session_id, {"status": "Error"})
                            break # Critical error, end session
                        except Exception as e:
                            logger.exception(f"[{session_id}] Error processing audio chunk: {e}")
                            await websocket.send_text(json.dumps({"type":"error","message":"Server error processing audio."}))
                            await update_call_data(session_id, {"status": "Error"})
                            break # Critical error, end session
                        finally:
                            pass # No file cleanup

                    # ... (handle text messages etc.) ...

                else:
                    logger.warning(f"[{session_id}] Unhandled WebSocket event type: {message_type}")

            except WebSocketDisconnect:
                logger.info(f"[{session_id}] WebSocket closed by client.")
                break
            except Exception as loop_err:
                logger.exception(f"[{session_id}] Error in WebSocket loop: {loop_err}")
                try: await websocket.send_text(json.dumps({"type":"error","message":"Internal server error."}))
                except Exception: pass
                break # Assume critical loop error

    except Exception as e:
        logger.exception(f"[{session_id}] Error setting up WebSocket connection: {e}")
        try: await websocket.close(code=1011)
        except Exception: pass
    finally:
        logger.info(f"Closing WS handler and marking session {session_id} as Ended in DB.")
        if db_initialized_for_session: # Only update status if DB init worked
            await update_call_data(session_id, {"status": "Ended"})


# --- Response Model for API Endpoint (Example) ---
class ActiveCallResponse(BaseModel):
    id: str
    start_time: Optional[datetime] = None
    caller_name: Optional[str] = None
    caller_number: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    detected_language: Optional[str] = None
    callType: Optional[str] = None
    priority: Optional[str] = None
    last_transcript: Optional[str] = None
    confirmation_given: Optional[bool] = None
    handled_by: Optional[str] = None
    durationSeconds: int

# --- HTTP Endpoint for Active Calls ---
@app.get("/api/active-calls", response_model=List[ActiveCallResponse])
async def get_active_calls():
    global db_pool
    if not db_pool: raise HTTPException(status_code=503, detail="Database unavailable")

    query = """
        SELECT session_id, start_time, caller_name, caller_number, location,
               status, detected_language, routing_label, priority,
               last_transcript, confirmation_given, handled_by
        FROM active_calls
        WHERE status = 'Active' ORDER BY start_time ASC;
    """
    try:
        async with db_pool.acquire() as conn: records = await conn.fetch(query)
        calls_list = []
        current_time = datetime.now(timezone.utc)
        for record in records:
            call_dict = dict(record)
            start_time_aware = call_dict.get('start_time')
            duration_sec = 0
            if start_time_aware:
                 # Ensure timezone aware comparison
                 if start_time_aware.tzinfo is None: start_time_aware = start_time_aware.replace(tzinfo=timezone.utc)
                 duration_sec = int((current_time - start_time_aware).total_seconds())

            # Prepare dict matching the response model structure
            response_item = ActiveCallResponse(
                id=call_dict['session_id'],
                start_time=start_time_aware,
                caller_name=call_dict.get('caller_name'),
                caller_number=call_dict.get('caller_number'),
                location=call_dict.get('location'),
                status=call_dict.get('status'),
                detected_language=call_dict.get('detected_language'),
                callType=call_dict.get('routing_label'), # Map db name to api name
                priority=call_dict.get('priority'),
                last_transcript=call_dict.get('last_transcript'),
                confirmation_given=call_dict.get('confirmation_given'),
                handled_by=call_dict.get('handled_by'),
                durationSeconds=duration_sec
            )
            calls_list.append(response_item)
        return calls_list
    except Exception as e:
        logger.exception("Error fetching active calls from database.")
        raise HTTPException(status_code=500, detail="Error fetching active call data.")


# --- HTTP Endpoint for Manual Takeover ---
@app.post("/api/calls/{session_id}/takeover", status_code=200) # Return 200 OK on success
async def takeover_call_endpoint(session_id: str):
    global db_pool
    if not db_pool: raise HTTPException(status_code=503, detail="Database unavailable")

    logger.info(f"[{session_id}] Received manual takeover request.")
    update_payload = { "handled_by": "Human" }
    try:
        async with db_pool.acquire() as conn:
            # Check if active before takeover
            current_status = await conn.fetchval("SELECT status FROM active_calls WHERE session_id = $1", session_id)
            if not current_status: raise HTTPException(status_code=404, detail="Call session not found.")
            if current_status != 'Active': raise HTTPException(status_code=400, detail=f"Call is not active (status: {current_status}).")

        await update_call_data(session_id, update_payload)
        # TODO: Implement actual operator notification/connection logic here
        logger.info(f"[{session_id}] Call marked 'Human' handled. Operator notification needed.")
        return {"message": f"Takeover signal sent for call {session_id}."}

    except HTTPException as http_exc: raise http_exc
    except Exception as e:
        logger.exception(f"[{session_id}] Error processing takeover request: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process takeover: {str(e)}")

@app.get("/api/recent-calls", response_model=List[ActiveCallResponse]) # Reuse the same response model
async def get_recent_calls():
    """ Fetches recently ended or errored calls from the database. """
    global db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database unavailable")

    # Fetch calls that are not 'Active', order by last update descending, limit results
    query = """
        SELECT
            session_id as id, start_time, last_update_time, -- Need last_update_time for final duration
            caller_name, caller_number, location, status,
            detected_language, routing_label as callType, priority,
            last_transcript, confirmation_given, handled_by
        FROM active_calls
        WHERE status != 'Active' -- Fetch Ended or Error status calls
        ORDER BY last_update_time DESC
        LIMIT 10; -- Limit to the 10 most recent ended calls
    """
    try:
        async with db_pool.acquire() as conn:
            records = await conn.fetch(query)

        calls_list = []
        for record in records:
            call_dict = dict(record)
            start_time_aware = call_dict.get('start_time')
            last_update_aware = call_dict.get('last_update_time')
            duration_sec = 0

            # Calculate final duration based on start and last update time
            if start_time_aware and last_update_aware:
                 if start_time_aware.tzinfo is None: start_time_aware = start_time_aware.replace(tzinfo=timezone.utc)
                 if last_update_aware.tzinfo is None: last_update_aware = last_update_aware.replace(tzinfo=timezone.utc)
                 # Ensure last_update_time is after start_time
                 if last_update_aware > start_time_aware:
                     duration_sec = int((last_update_aware - start_time_aware).total_seconds())
                 else: # Handle potential edge cases or clock skew issues
                    logger.warning(f"Recent call {call_dict['id']} has last_update_time before start_time.")

            # Prepare dict matching the response model structure
            response_item = ActiveCallResponse(
                id=call_dict['id'],
                start_time=start_time_aware.isoformat() if start_time_aware else None,
                caller_name=call_dict.get('caller_name'),
                caller_number=call_dict.get('caller_number'),
                location=call_dict.get('location'),
                status=call_dict.get('status'),
                detected_language=call_dict.get('detected_language'),
                callType=call_dict.get('callType'), # Already renamed in query
                priority=call_dict.get('priority'),
                last_transcript=call_dict.get('last_transcript'),
                confirmation_given=call_dict.get('confirmation_given'),
                handled_by=call_dict.get('handled_by'),
                durationSeconds=duration_sec
            )
            calls_list.append(response_item)
        return calls_list
    except Exception as e:
        logger.exception("Error fetching recent calls from database.")
        raise HTTPException(status_code=500, detail="Error fetching recent call data.")


# --- Root endpoint ---
@app.get("/")
def read_root():
    return {"message": "STT Translate Service with Call Management is Running"}

