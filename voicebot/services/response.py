# llama_service.py (Updated to handle system_prompt_override)

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from loguru import logger
from groq import Groq
import os
import uvicorn
from typing import Dict, List, Optional # Import Optional

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.error("Missing GROQ_API_KEY in environment.")
    raise RuntimeError("Missing GROQ_API_KEY")

# --- Default System Prompt ---
STANDARD_SYSTEM_PROMPT = (
    "You are an AI assistant in a real-time emergency call center in Kerala, India. "
    "Speak calmly, ask only one question at a time, and never refer them to 911. "
    "Never redirect to any other service. Always remain the official emergency contact."
)

# Initialize FastAPI app
app = FastAPI()

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)

# Simple in-memory chat store: session_id -> List[{"role": "user"/"assistant", "content": "..." }]
chat_memory: Dict[str, List[Dict[str, str]]] = {}

# Log service start
logger.info("🚨 LLaMA 4 Disaster Call Center (Kerala) with memory is running on port 8001.")

# --- Request Schema --- ADD system_prompt_override ---
class ChatRequest(BaseModel):
    session_id: str
    input_text: str
    system_prompt_override: Optional[str] = None # Added optional field

# --- Response Schema (Implicit) ---
# Returns {"response_text": str, "emotion": str}

@app.post("/chat")
def chat(request: ChatRequest):
    session_id = request.session_id
    user_text = request.input_text.strip()
    logger.info(f"🧠 session_id={session_id}, Received input: {user_text}")

    # 1) Initialize memory if new session
    if session_id not in chat_memory:
        chat_memory[session_id] = []
        logger.info(f"🆕 Created new chat memory for session {session_id}")

    # 2) Add user’s message to memory BEFORE constructing the prompt
    #    Only add if it's not empty to avoid adding empty user turns if LLaMA failed previously
    if user_text:
         chat_memory[session_id].append({"role": "user", "content": user_text})
    else:
         logger.warning(f"[{session_id}] Received empty input text, not adding to history.")


    try:
        # --- 3) Determine System Prompt --- (MODIFIED)
        system_content = STANDARD_SYSTEM_PROMPT # Default
        if request.system_prompt_override:
            system_content = request.system_prompt_override
            logger.info(f"[{session_id}] Using provided system prompt override.")
        else:
            logger.info(f"[{session_id}] Using standard system prompt.")

        # --- 4) Construct the messages prompt --- (MODIFIED)
        # Start with the determined system prompt
        messages = [{"role": "system", "content": system_content}]

        # Add conversation memory (ensure it exists)
        if session_id in chat_memory:
            messages += chat_memory[session_id]
        else:
             # Should not happen if initialized correctly, but safe guard
             logger.error(f"[{session_id}] Chat memory missing unexpectedly.")
             messages.append({"role": "user", "content": user_text}) # Add current text at least

        # --- 5) Call LLaMA --- (Renumbered)
        logger.debug(f"[{session_id}] Sending messages to Groq: {messages}")
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="meta-llama/llama-4-scout-17b-16e-instruct", # Verify model name if needed
            stream=False,
            # Add other parameters like temperature, max_tokens if desired
        )

        generated_response = chat_completion.choices[0].message.content.strip()
        logger.success(f"✅ [{session_id}] LLaMA response generated.")

        # --- 6) Add assistant response to memory --- (Renumbered)
        # Only add if LLaMA actually responded
        if generated_response:
             chat_memory[session_id].append({"role": "assistant", "content": generated_response})
        else:
             logger.warning(f"[{session_id}] LLaMA generated an empty response, not adding to history.")

        # --- 7) (Optional) Detect emotion from user message --- (Renumbered)
        # Emotion detection still uses only the last user input for simplicity
        emotion = "unknown" # Default emotion
        if user_text: # Only detect emotion if there was user input
            try:
                emotion_completion = client.chat.completions.create(
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
                    model="meta-llama/llama-4-scout-17b-16e-instruct", # Use appropriate model
                    stream=False,
                )
                logger.info(f"[{session_id}] Emotion detection response: {emotion_completion.choices[0].message.content.strip()}")
                detected_emotion = emotion_completion.choices[0].message.content.strip().lower()
                # Basic validation against expected emotions (optional)
                valid_emotions = {"calm", "confused", "urgent", "panicked", "scared", "distressed", "angry", "hopeless", "sad", "uncertain"}
                if detected_emotion in valid_emotions:
                    emotion = detected_emotion
                else:
                    logger.warning(f"[{session_id}] LLaMA returned unexpected emotion: '{detected_emotion}'. Defaulting to 'unknown'.")
                    emotion = "unknown" # Fallback if unexpected output

                logger.success(f"🎭 [{session_id}] Detected emotion: {emotion}")
            except Exception as emotion_err:
                logger.error(f"[{session_id}] Failed to detect emotion: {emotion_err}")
                emotion = "error" # Indicate emotion detection failure
        else:
            logger.info(f"[{session_id}] Skipping emotion detection due to empty user input.")


        # --- 8) Return Response --- (Renumbered)
        return {
            "response_text": generated_response,
            "emotion": emotion
        }

    except Exception as e:
        logger.exception(f"💥 [{session_id}] Error during LLaMA chat processing.")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

# --- Session Management Endpoint ---
@app.post("/end-session")
def end_session(request: ChatRequest): # Re-use ChatRequest for session_id
    """
    Manually end the session/call, clearing memory.
    Note: `input_text` in the request is ignored here.
    """
    session_id = request.session_id
    if session_id in chat_memory:
        del chat_memory[session_id]
        logger.info(f"Session {session_id} ended and memory cleared.")
        return {"msg": "Session ended successfully."}
    else:
        logger.warning(f"Attempted to end non-existent session: {session_id}")
        return {"msg": "Session not found."}

# --- Main Execution ---
if __name__ == "__main__":
    uvicorn.run("llama_service:app", host="0.0.0.0", port=8001, reload=True)