# Unified Voice Bot Backend - TTS, STT, LLaMA Combined
# Run on port 8000

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Set, Any
from enum import Enum
import os
import requests
import httpx
from dotenv import load_dotenv
from loguru import logger
import uvicorn
import asyncpg
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
from groq import Groq

# Load environment variables
load_dotenv()

# ======================
# CONFIGURATION
# ======================

# API Keys
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

# Validate required keys
if not SARVAM_API_KEY:
    logger.error("SARVAM_API_KEY not found")
    raise RuntimeError("Missing SARVAM_API_KEY")
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found")
    raise RuntimeError("Missing GROQ_API_KEY")
if not DATABASE_URL:
    logger.error("DATABASE_URL not found")
    raise RuntimeError("Missing DATABASE_URL")

# API URLs
SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text-translate"
SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"
ROUTING_API_URL = os.getenv("ROUTING_API_URL", "http://192.168.31.30:8002/route-call")

# Timeouts
STT_REQUEST_TIMEOUT = 60.0
TTS_REQUEST_TIMEOUT = 45.0
LLAMA_REQUEST_TIMEOUT = 30.0
ROUTING_REQUEST_TIMEOUT = 10.0

# Initialize Groq client for LLaMA
groq_client = Groq(api_key=GROQ_API_KEY)

# Database pool
db_pool: Optional[asyncpg.Pool] = None

# LLaMA Prompts
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
NON_SPECIFIC_ROUTING_LABELS: Set[str] = {"Unknown", "General Inquiry"}

def create_confirmation_system_prompt(department_name: str) -> str:
    confirmation_phrase = f"Understood. I am recording the details for the {department_name}. Please be assured that someone from that department will contact you shortly."
    return (
        "You are an AI assistant in a real-time emergency call center in Kerala, India.\n"
        f"A specific department has been identified for this user's issue: {department_name}.\n"
        f"Your primary task now is to FIRST acknowledge this and give the confirmation. State clearly: \"{confirmation_phrase}\"\n"
        "AFTER giving that exact confirmation, you MUST then ask the NEXT single, most important question calmly to gather necessary details. Do not ask multiple questions.\n"
        "Speak calmly. Never refer them to 911 or other services. Always remain the official emergency contact."
    )

# ======================
# ENUMS FOR TTS
# ======================

class LanguageCodeTTS(str, Enum):
    bn_IN = "bn-IN"
    en_IN = "en-IN"
    gu_IN = "gu-IN"
    hi_IN = "hi-IN"
    kn_IN = "kn-IN"
    ml_IN = "ml-IN"
    mr_IN = "mr-IN"
    od_IN = "od-IN"
    pa_IN = "pa-IN"
    ta_IN = "ta-IN"
    te_IN = "te-IN"

class Speaker(str, Enum):
    meera = "meera"
    pavithra = "pavithra"
    maitreyi = "maitreyi"
    arvind = "arvind"
    amol = "amol"
    amartya = "amartya"

class SampleRate(int, Enum):
    rate_8000 = 8000
    rate_16000 = 16000
    rate_22050 = 22050

class ModelTTS(str, Enum):
    bulbul_v1 = "bulbul:v1"
    bulbul_v2 = "bulbul:v2"

# ======================
# REQUEST/RESPONSE MODELS
# ======================

class TTSRequest(BaseModel):
    text_to_speak: str = Field(..., max_length=500)
    target_language_code: LanguageCodeTTS = LanguageCodeTTS.ml_IN
    speaker: Optional[Speaker] = Speaker.meera
    pitch: Optional[float] = Field(default=0.0, ge=-1.0, le=1.0)
    pace: Optional[float] = Field(default=1.0, ge=0.3, le=3.0)
    loudness: Optional[float] = Field(default=1.0, ge=0.1, le=3.0)
    speech_sample_rate: Optional[SampleRate] = SampleRate.rate_22050
    enable_preprocessing: Optional[bool] = False
    model: Optional[ModelTTS] = ModelTTS.bulbul_v1

class TTSResponse(BaseModel):
    audio_base64: str
    request_id: Optional[str] = None

class ChatRequest(BaseModel):
    session_id: str
    input_text: str
    system_prompt_override: Optional[str] = None

class ChatResponse(BaseModel):
    response_text: str
    emotion: str

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

# ======================
# FASTAPI APP
# ======================

app = FastAPI(title="Unified VoiceBot Backend - TTS, STT, LLaMA")

# CORS
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://192.168.31.30",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# HTTP client
http_client = httpx.AsyncClient()

# ======================
# DATABASE SETUP
# ======================

@app.on_event("startup")
async def startup_database():
    global db_pool
    try:
        db_pool = await asyncpg.create_pool(DATABASE_URL, min_size=2, max_size=10, command_timeout=60)
        logger.info("✅ Database connection pool established.")
        async with db_pool.acquire() as conn:
            await conn.execute("SELECT 1")
        logger.info("✅ Database connection verified.")
    except Exception as e:
        logger.critical(f"❌ FATAL: Failed to connect to database: {e}")
        db_pool = None

@app.on_event("shutdown")
async def shutdown_database():
    global db_pool
    if db_pool:
        await db_pool.close()
        logger.info("Database connection pool closed.")
    await http_client.aclose()
    logger.info("HTTP client closed.")

# ======================
# HELPER FUNCTIONS
# ======================

async def update_call_data(session_id: str, data_to_update: Dict[str, Any]):
    """Updates call data in database"""
    global db_pool
    if not db_pool or not data_to_update:
        if not db_pool:
            logger.error(f"[{session_id}] DB pool not available for update.")
        return

    data_to_update["last_update_time"] = datetime.now(timezone.utc)
    set_clauses = []
    values = []
    i = 1
    for key, value in data_to_update.items():
        set_clauses.append(f"{key} = ${i}")
        values.append(value)
        i += 1

    values.append(session_id)
    query = f"UPDATE active_calls SET {', '.join(set_clauses)} WHERE session_id = ${i}"

    try:
        async with db_pool.acquire() as conn:
            await conn.execute(query, *values)
    except Exception as e:
        logger.error(f"[{session_id}] Failed to update call data: {e}")

# ======================
# 1. TTS ENDPOINT
# ======================

@app.post("/synthesize", response_model=TTSResponse)
async def synthesize_speech(request: TTSRequest):
    """Text-to-Speech synthesis using Sarvam AI"""
    logger.info(f"TTS request: {request.target_language_code}, text: '{request.text_to_speak[:50]}...'")

    payload = {
        "inputs": [request.text_to_speak],
        "target_language_code": request.target_language_code.value,
        "speaker": request.speaker.value if request.speaker else Speaker.meera.value,
        "pitch": request.pitch,
        "pace": request.pace,
        "loudness": request.loudness,
        "speech_sample_rate": request.speech_sample_rate.value if request.speech_sample_rate else SampleRate.rate_22050.value,
        "enable_preprocessing": request.enable_preprocessing,
        "model": request.model.value if request.model else ModelTTS.bulbul_v1.value
    }
    headers = {
        "Content-Type": "application/json",
        "api-subscription-key": SARVAM_API_KEY
    }

    try:
        response = await http_client.post(SARVAM_TTS_URL, json=payload, headers=headers, timeout=TTS_REQUEST_TIMEOUT)
        response.raise_for_status()

        result_json = response.json()
        audios_base64 = result_json.get("audios")
        request_id = result_json.get("request_id")

        if not audios_base64 or not isinstance(audios_base64, list) or len(audios_base64) == 0:
            logger.error(f"No audio data in TTS response: {result_json}")
            raise HTTPException(status_code=500, detail="TTS service returned no audio data.")

        audio_base64 = audios_base64[0]
        logger.success(f"✅ TTS successful (Request ID: {request_id})")

        return TTSResponse(audio_base64=audio_base64, request_id=request_id)

    except httpx.RequestError as e:
        logger.error(f"TTS request error: {e}")
        raise HTTPException(status_code=503, detail=f"Could not connect to TTS provider: {e}")
    except httpx.HTTPStatusError as e:
        logger.error(f"TTS API error {e.response.status_code}: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"TTS provider error: {e.response.status_code}")
    except Exception as e:
        logger.exception(f"Unexpected TTS error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal TTS error: {e}")

# ======================
# 2. LLAMA CHAT ENDPOINT
# ======================

chat_memory: Dict[str, List[Dict[str, str]]] = {}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """LLaMA chat endpoint with memory"""
    session_id = request.session_id
    user_text = request.input_text.strip()
    logger.info(f"🧠 [{session_id}] Chat request: {user_text}")

    # Initialize memory
    if session_id not in chat_memory:
        chat_memory[session_id] = []
        logger.info(f"🆕 Created new chat memory for {session_id}")

    if user_text:
        chat_memory[session_id].append({"role": "user", "content": user_text})

    try:
        # Determine system prompt
        system_content = request.system_prompt_override if request.system_prompt_override else STANDARD_SYSTEM_PROMPT

        # Build messages
        messages = [{"role": "system", "content": system_content}]
        if session_id in chat_memory:
            messages += chat_memory[session_id]

        # Call LLaMA
        logger.debug(f"[{session_id}] Calling LLaMA...")
        chat_completion = groq_client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            stream=False,
        )

        generated_response = chat_completion.choices[0].message.content.strip()
        logger.success(f"✅ [{session_id}] LLaMA response generated")

        if generated_response:
            chat_memory[session_id].append({"role": "assistant", "content": generated_response})

        # Detect emotion
        emotion = "unknown"
        if user_text:
            try:
                emotion_completion = groq_client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are an AI that detects the emotion of a caller in a disaster helpline. "
                                "Return the dominant emotion in **one word** from this list only: "
                                "calm, confused, urgent, panicked, scared, distressed, angry, hopeless, sad, uncertain."
                            )
                        },
                        {
                            "role": "user",
                            "content": f"Identify emotion in: '{user_text}'"
                        }
                    ],
                    model="llama-3.3-70b-versatile",
                    stream=False,
                )
                detected_emotion = emotion_completion.choices[0].message.content.strip().lower()
                valid_emotions = {"calm", "confused", "urgent", "panicked", "scared", "distressed", "angry", "hopeless", "sad", "uncertain"}
                if detected_emotion in valid_emotions:
                    emotion = detected_emotion
                logger.success(f"🎭 [{session_id}] Detected emotion: {emotion}")
            except Exception as emotion_err:
                logger.error(f"[{session_id}] Emotion detection failed: {emotion_err}")
                emotion = "error"

        return ChatResponse(response_text=generated_response, emotion=emotion)

    except Exception as e:
        logger.exception(f"💥 [{session_id}] LLaMA chat error")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@app.post("/end-session")
async def end_session(request: ChatRequest):
    """End chat session and clear memory"""
    session_id = request.session_id
    if session_id in chat_memory:
        del chat_memory[session_id]
        logger.info(f"Session {session_id} ended and memory cleared.")
        return {"msg": "Session ended successfully."}
    else:
        logger.warning(f"Attempted to end non-existent session: {session_id}")
        return {"msg": "Session not found."}

# ======================
# 3. WEBSOCKET - STT + ORCHESTRATION
# ======================

@app.websocket("/ws/call/{session_id}")
async def call_endpoint(websocket: WebSocket, session_id: str):
    """Main WebSocket endpoint for handling calls - STT + orchestration"""
    global db_pool
    if not db_pool:
        logger.warning(f"[{session_id}] DB pool unavailable. Rejecting WS connection.")
        return

    await websocket.accept()
    logger.info(f"✅ New WS connection: session_id={session_id}")

    db_initialized_for_session = False
    try:
        # Initialize call in database
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO active_calls (session_id, caller_name, caller_number, location, status, routing_label, priority, detected_language, confirmation_given, handled_by)
                VALUES ($1, 'Unknown', NULL, 'Unknown', 'Active', 'Unknown', 'Normal', NULL, FALSE, 'AI')
                ON CONFLICT (session_id) DO UPDATE SET
                    status = 'Active',
                    start_time = CASE WHEN active_calls.status != 'Active' THEN CURRENT_TIMESTAMP ELSE active_calls.start_time END,
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
        logger.info(f"[{session_id}] Call initialized in DB.")
        db_initialized_for_session = True
    except Exception as db_init_err:
        logger.error(f"[{session_id}] DB initialization failed: {db_init_err}")
        await websocket.close(code=1011, reason="Database initialization error")
        return

    # Session state
    confirmation_given_this_session = False
    awaiting_name = False
    caller_name_known = False
    current_handler = "AI"
    TARGET_LANGUAGE_CODE = "ml-IN"

    try:
        # Fetch initial state
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

        # Main processing loop
        while True:
            try:
                message = await websocket.receive()
                message_type = message.get("type")

                if message_type == "websocket.disconnect":
                    logger.info(f"[{session_id}] WebSocket disconnected.")
                    break

                elif message_type == "websocket.receive":
                    if "bytes" in message:
                        audio_chunk = message["bytes"]

                        try:
                            # Check handler status
                            async with db_pool.acquire() as conn:
                                handler_status = await conn.fetchval("SELECT handled_by FROM active_calls WHERE session_id = $1", session_id)
                                if handler_status:
                                    current_handler = handler_status

                            if current_handler == 'Human':
                                logger.debug(f"[{session_id}] Handled by Human. Skipping AI.")
                                continue

                            # 1. STT
                            temp_filename = f"stt_{session_id}.wav"
                            files_payload = {
                                "file": (temp_filename, audio_chunk, "audio/wav"),
                                "model": (None, "saaras:v2"),
                                "with_diarization": (None, "false")
                            }
                            headers = {"api-subscription-key": SARVAM_API_KEY}
                            stt_response = requests.post(SARVAM_STT_URL, files=files_payload, headers=headers, timeout=STT_REQUEST_TIMEOUT)

                            if stt_response.status_code != 200:
                                logger.error(f"[{session_id}] STT error {stt_response.status_code}")
                                await websocket.send_json({"type": "stt-error", "message": f"STT Error {stt_response.status_code}"})
                                continue

                            # Process STT
                            result_json = stt_response.json()
                            user_transcript = result_json.get("transcript", "").strip()
                            stt_detected_language = result_json.get("language_code")
                            logger.info(f"✅ [{session_id}] Transcript: '{user_transcript}' (Lang: {stt_detected_language})")

                            # Update DB
                            update_payload = {"last_transcript": user_transcript}
                            if stt_detected_language:
                                update_payload["detected_language"] = stt_detected_language

                            if awaiting_name and user_transcript and not caller_name_known:
                                logger.info(f"[{session_id}] Storing caller name: '{user_transcript}'")
                                update_payload["caller_name"] = user_transcript[:255]
                                caller_name_known = True
                                awaiting_name = False

                            await update_call_data(session_id, update_payload)

                            # Send transcript to client
                            await websocket.send_json({"type": "transcript", "payload": user_transcript})

                            if not user_transcript:
                                continue

                            # 2. Routing
                            predicted_label = "Unknown"
                            try:
                                routing_response = await http_client.post(
                                    ROUTING_API_URL,
                                    json={"transcript": user_transcript},
                                    timeout=ROUTING_REQUEST_TIMEOUT
                                )
                                routing_response.raise_for_status()
                                routing_result = routing_response.json()
                                predicted_label = routing_result.get("forwarded_to", "Unknown")
                                logger.info(f"🚦 [{session_id}] Routing: {predicted_label}")
                                await update_call_data(session_id, {"routing_label": predicted_label})
                            except Exception as routing_err:
                                logger.error(f"[{session_id}] Routing failed: {routing_err}")

                            # Send routing info
                            await websocket.send_json({"type": "routing_info", "payload": {"department": predicted_label}})

                            # 3. Determine LLaMA prompt
                            system_content = STANDARD_SYSTEM_PROMPT
                            if not caller_name_known:
                                system_content = INITIAL_SYSTEM_PROMPT
                                awaiting_name = True
                            else:
                                is_specific_routing = predicted_label and predicted_label not in NON_SPECIFIC_ROUTING_LABELS
                                should_give_confirmation = is_specific_routing and not confirmation_given_this_session
                                if should_give_confirmation:
                                    system_content = create_confirmation_system_prompt(predicted_label)
                                    logger.info(f"[{session_id}] Using confirmation prompt.")
                                    await update_call_data(session_id, {"confirmation_given": True})
                                    confirmation_given_this_session = True

                            # 4. LLaMA (using internal endpoint)
                            llama_payload = {
                                "session_id": session_id,
                                "input_text": user_transcript,
                                "system_prompt_override": system_content
                            }
                            ai_response_content = ""
                            try:
                                # Call our own /chat endpoint internally
                                chat_req = ChatRequest(**llama_payload)
                                chat_resp = await chat(chat_req)
                                ai_response_content = chat_resp.response_text
                                logger.info(f"🤖 [{session_id}] LLaMA response generated.")
                            except Exception as llama_err:
                                logger.exception(f"[{session_id}] LLaMA error: {llama_err}")
                                ai_response_content = "I apologize, I encountered a problem. Could you please repeat?"

                            # 5. TTS
                            if ai_response_content:
                                tts_req = TTSRequest(
                                    text_to_speak=ai_response_content,
                                    target_language_code=LanguageCodeTTS.ml_IN
                                )
                                try:
                                    tts_resp = await synthesize_speech(tts_req)
                                    audio_base64 = tts_resp.audio_base64

                                    if audio_base64:
                                        await websocket.send_json({
                                            "type": "ai_audio_response",
                                            "payload": {
                                                "text_content": ai_response_content,
                                                "audio_base64": audio_base64,
                                                "language_code": TARGET_LANGUAGE_CODE
                                            }
                                        })
                                        logger.success(f"🔊 [{session_id}] TTS Audio sent.")
                                        await update_call_data(session_id, {})
                                    else:
                                        logger.error(f"[{session_id}] TTS empty audio.")
                                        await websocket.send_json({"type": "ai-response", "payload": {"response": ai_response_content}})
                                except Exception as tts_err:
                                    logger.exception(f"[{session_id}] TTS error: {tts_err}")
                                    await websocket.send_json({"type": "ai-response", "payload": {"response": ai_response_content}})

                        except requests.exceptions.RequestException as req_err:
                            logger.exception(f"[{session_id}] STT request error: {req_err}")
                            await websocket.send_json({"type": "error", "message": "STT service connection error."})
                            await update_call_data(session_id, {"status": "Error"})
                            break
                        except Exception as e:
                            logger.exception(f"[{session_id}] Error processing audio: {e}")
                            await websocket.send_json({"type": "error", "message": "Server error processing audio."})
                            await update_call_data(session_id, {"status": "Error"})
                            break

            except WebSocketDisconnect:
                logger.info(f"[{session_id}] WebSocket closed by client.")
                break
            except Exception as loop_err:
                logger.exception(f"[{session_id}] Error in WebSocket loop: {loop_err}")
                try:
                    await websocket.send_json({"type": "error", "message": "Internal server error."})
                except Exception:
                    pass
                break

    except Exception as e:
        logger.exception(f"[{session_id}] Error setting up WebSocket: {e}")
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        logger.info(f"Closing WS handler for {session_id}")
        if db_initialized_for_session:
            await update_call_data(session_id, {"status": "Ended"})

# ======================
# API ENDPOINTS
# ======================

@app.get("/api/active-calls", response_model=List[ActiveCallResponse])
async def get_active_calls():
    """Get list of active calls"""
    global db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database unavailable")

    query = """
        SELECT session_id, start_time, caller_name, caller_number, location,
               status, detected_language, routing_label, priority,
               last_transcript, confirmation_given, handled_by
        FROM active_calls
        WHERE status = 'Active' ORDER BY start_time ASC;
    """
    try:
        async with db_pool.acquire() as conn:
            records = await conn.fetch(query)
        calls_list = []
        current_time = datetime.now(timezone.utc)
        for record in records:
            call_dict = dict(record)
            start_time_aware = call_dict.get('start_time')
            duration_sec = 0
            if start_time_aware:
                if start_time_aware.tzinfo is None:
                    start_time_aware = start_time_aware.replace(tzinfo=timezone.utc)
                duration_sec = int((current_time - start_time_aware).total_seconds())

            response_item = ActiveCallResponse(
                id=call_dict['session_id'],
                start_time=start_time_aware,
                caller_name=call_dict.get('caller_name'),
                caller_number=call_dict.get('caller_number'),
                location=call_dict.get('location'),
                status=call_dict.get('status'),
                detected_language=call_dict.get('detected_language'),
                callType=call_dict.get('routing_label'),
                priority=call_dict.get('priority'),
                last_transcript=call_dict.get('last_transcript'),
                confirmation_given=call_dict.get('confirmation_given'),
                handled_by=call_dict.get('handled_by'),
                durationSeconds=duration_sec
            )
            calls_list.append(response_item)
        return calls_list
    except Exception as e:
        logger.exception("Error fetching active calls")
        raise HTTPException(status_code=500, detail="Error fetching active call data.")

@app.post("/api/calls/{session_id}/takeover", status_code=200)
async def takeover_call_endpoint(session_id: str):
    """Manual takeover of a call by human operator"""
    global db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database unavailable")

    logger.info(f"[{session_id}] Manual takeover request")
    try:
        async with db_pool.acquire() as conn:
            current_status = await conn.fetchval("SELECT status FROM active_calls WHERE session_id = $1", session_id)
            if not current_status:
                raise HTTPException(status_code=404, detail="Call session not found.")
            if current_status != 'Active':
                raise HTTPException(status_code=400, detail=f"Call is not active (status: {current_status}).")

        await update_call_data(session_id, {"handled_by": "Human"})
        logger.info(f"[{session_id}] Call marked as Human handled.")
        return {"message": f"Takeover signal sent for call {session_id}."}

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        logger.exception(f"[{session_id}] Takeover error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process takeover: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "Unified VoiceBot Backend is Running - TTS, STT, LLaMA combined", "version": "1.0"}

# ======================
# RUN SERVER
# ======================

if __name__ == "__main__":
    logger.info("🚀 Starting Unified VoiceBot Backend on port 8000...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
