import os
import uvicorn
import httpx
import requests # Using requests for sync chunked upload as per original code
import psycopg2 # For PostgreSQL interaction
from psycopg2.extras import DictCursor
from typing import Optional, Dict, Any, List, Tuple
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field # Added Field
from loguru import logger
from dotenv import load_dotenv
import time # For media processing wait

# ----------------- Load environment variables -----------------
load_dotenv()

# --- Twitter (X) ---
X_BEARER_TOKEN = os.getenv("X_BEARER_TOKEN")
if not X_BEARER_TOKEN:
    logger.error("Missing X_BEARER_TOKEN for Twitter (X) API v2 usage.")
    raise RuntimeError("Missing X_BEARER_TOKEN in environment.")

# --- Groq (LLaMA) ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.error("Missing GROQ_API_KEY in environment.")
    raise RuntimeError("Missing GROQ_API_KEY")

# --- PostgreSQL ---
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    logger.error("Missing DATABASE_URL for PostgreSQL connection.")
    raise RuntimeError("Missing DATABASE_URL in environment.")

# ----------------- LLaMA (Groq) Setup -----------------
from groq import Groq
groq_client = Groq(api_key=GROQ_API_KEY)

# System prompt for LLaMA specific to summarizing for a tweet
SUMMARY_SYSTEM_PROMPT = (
    "You are an AI assistant tasked with summarizing real-time emergency call transcripts from Kerala, India, for a public Twitter (X) post."
    "Your goal is to create a concise, factual, and neutral summary suitable for public dissemination."
    "Guidelines:"
    "1.  **Conciseness:** Keep the summary under 280 characters."
    "2.  **Anonymity:** Remove all personally identifiable information (names, specific addresses unless crucial like a landmark, phone numbers, etc.). Refer to individuals as 'the caller', 'the person involved', etc."
    "3.  **Factuality:** Stick to the key events and outcome reported in the transcript."
    "4.  **Neutral Tone:** Avoid speculation, emotional language, or judgment. Present the information calmly and officially."
    "5.  **Context:** Briefly mention the type of emergency if clear (e.g., 'Medical assistance requested...', 'Fire reported...', 'Road accident involving...')."
    "6.  **Location:** Use general location if mentioned (e.g., 'near [Landmark], [City]'). Avoid precise street addresses."
    "7.  **Outcome:** Briefly state the resolution if available (e.g., 'Emergency services dispatched.', 'Caller confirmed assistance arrived.', 'Situation resolved.')."
    "Do not add hashtags unless specifically requested."
    "Focus solely on generating the tweet text based *only* on the provided transcript."
)

# ----------------- X (Twitter) Upload & Tweet URLs -----------------
# Using v2 Upload endpoint which supports chunking and categories
TWITTER_UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json" # v1.1 for chunked upload
TWITTER_TWEET_URL  = "https://api.x.com/2/tweets"

# ----------------- PostgreSQL Connection -----------------

def get_db_connection():
    """Establishes a connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except psycopg2.OperationalError as e:
        logger.error(f"Database connection failed: {e}")
        raise HTTPException(status_code=503, detail="Database connection unavailable.")

def get_conversation_history(session_id: str, conn) -> List[Tuple[str, str]]:
    """Fetches conversation history for a given session_id."""
    # Adjust table and column names as per your schema
    # Example assumes: table='call_transcripts', columns='speaker', 'transcript', ordered by 'timestamp'
    query = """
        SELECT speaker, transcript
        FROM call_transcripts
        WHERE session_id = %s
        ORDER BY timestamp ASC;
    """
    history = []
    try:
        with conn.cursor(cursor_factory=DictCursor) as cur:
            cur.execute(query, (session_id,))
            results = cur.fetchall()
            if not results:
                logger.warning(f"No conversation history found for session_id: {session_id}")
                return [] # Return empty list if no history found
            for row in results:
                history.append((row['speaker'], row['transcript']))
        return history
    except Exception as e:
        logger.exception(f"Error fetching conversation history for session_id {session_id}: {e}")
        # Raise HTTPException to be caught by FastAPI
        raise HTTPException(status_code=500, detail=f"Error fetching conversation history: {e}")


def format_transcript_for_llama(history: List[Tuple[str, str]]) -> str:
    """Formats the fetched history into a single string for LLaMA prompt."""
    if not history:
        return "No conversation transcript available."
    # Simple formatting, adjust as needed
    return "\n".join([f"{speaker}: {text}" for speaker, text in history])


# ----------------- FastAPI Setup -----------------
app = FastAPI(
    title="Tweet Summary Microservice",
    description="Generates Tweet summaries from call conversations via LLaMA (Groq), optionally uploads media, and posts to X (Twitter).",
)

# ----------------- Request/Response Schemas -----------------
class TweetSummaryRequest(BaseModel):
    session_id: str = Field(..., description="The unique ID of the call session to summarize.")
    system_prompt_override: Optional[str] = Field(None, description="Optional override for the LLaMA system prompt for summary generation.")
    want_media: bool = Field(False, description="Set to true if media should be uploaded and attached.")
    media_path: Optional[str] = Field(None, description="Local path to the media file to upload (required if want_media is true).")
    # You could add more fields, e.g., specific instructions for the summary prompt

class TweetResponse(BaseModel):
    tweet_id: str
    text: str
    media_id_str: Optional[str] = Field(None, description="The media ID string returned by Twitter API v1.1 upload.")

# ----------------- 1) LLaMA Summary Generation -----------------
def generate_tweet_summary(session_id: str, conversation_transcript: str, system_prompt: Optional[str] = None) -> str:
    """
    Generates a tweet summary using LLaMA based on the provided transcript.
    """
    if not system_prompt:
        system_prompt = SUMMARY_SYSTEM_PROMPT

    # The user prompt now contains the actual transcript and instructions
    user_prompt = (
        f"Please generate a tweet summary based on the following emergency call transcript (session: {session_id}). "
        f"Follow the guidelines provided in the system prompt precisely.\n\n"
        f"Transcript:\n---\n{conversation_transcript}\n---"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user",   "content": user_prompt}
    ]

    logger.info(f"[{session_id}] Generating tweet summary via LLaMA.")
    logger.debug(f"[{session_id}] LLaMA messages:\nSystem: {system_prompt[:200]}...\nUser: {user_prompt[:300]}...")

    try:
        completion = groq_client.chat.completions.create(
            messages=messages,
            model="llama3-8b-8192", # Using llama3-8b, adjust if needed
            # model="meta-llama/llama-4-scout-17b-16e-instruct", # Or your previous model
            stream=False,
            temperature=0.2, # Lower temperature for factual summary
            max_tokens=150 # Max tokens for a tweet summary (~300 chars)
        )
        llama_response = completion.choices[0].message.content.strip()
        logger.info(f"[{session_id}] LLaMA generated summary: {llama_response}")

        # Basic validation (optional)
        if not llama_response:
             logger.warning(f"[{session_id}] LLaMA returned an empty summary.")
             return "Unable to generate summary for this session."
        if len(llama_response) > 300: # A bit over 280 to be safe
             logger.warning(f"[{session_id}] LLaMA summary potentially too long ({len(llama_response)} chars). Truncating slightly.")
             # Find last space before limit (simple truncation)
             limit = 275
             last_space = llama_response[:limit].rfind(' ')
             if last_space != -1:
                 llama_response = llama_response[:last_space] + "..."
             else:
                 llama_response = llama_response[:limit] + "..."

        return llama_response
    except Exception as e:
        logger.exception(f"[{session_id}] Error calling Groq API: {e}")
        raise HTTPException(status_code=500, detail=f"LLaMA summary generation failed: {e}")


# ----------------- 2) Chunked Media Upload to X (v1.1 API) -----------------
# Note: This uses the synchronous 'requests' library as per the original code.
# For a fully async service, consider rewriting with httpx.
# Twitter's v1.1 upload API requires OAuth 1.0a or Bearer Token from v2 context.
# Assuming Bearer Token works here based on v2 context. If not, OAuth1.0a needed.

def build_auth_header() -> Dict[str, str]:
    # Using Bearer Token from v2 - ensure this has write permissions for media upload
    return {"Authorization": f"Bearer {X_BEARER_TOKEN}"}

def chunked_media_upload_v1_1(file_path: str, media_category: Optional[str] = None) -> str:
    """
    Performs chunked media upload using Twitter API v1.1 endpoint.
    Returns media_id_string.
    Raises HTTPException on failure.
    """
    if not os.path.exists(file_path):
         raise HTTPException(status_code=400, detail=f"Media file not found: {file_path}")

    file_size = os.path.getsize(file_path)
    ext = os.path.splitext(file_path)[-1].lower()

    # Determine media type and category
    media_type = None
    if ext in [".jpg", ".jpeg"]: media_type = "image/jpeg"
    elif ext == ".png": media_type = "image/png"
    elif ext == ".gif": media_type = "image/gif"; media_category = media_category or "tweet_gif"
    elif ext == ".webp": media_type = "image/webp"
    elif ext == ".mp4": media_type = "video/mp4"; media_category = media_category or "tweet_video"
    # Add other supported types if needed

    if not media_type:
        raise HTTPException(status_code=400, detail=f"Unsupported media file extension: {ext}")

    if not media_category:
        media_category = "tweet_image" # Default category

    headers = build_auth_header()

    # 1) INIT
    logger.info(f"INIT media upload: size={file_size}, type={media_type}, category={media_category}")
    init_data = {
        "command": "INIT",
        "media_type": media_type,
        "total_bytes": file_size,
        "media_category": media_category,
    }
    try:
        init_resp = requests.post(TWITTER_UPLOAD_URL, headers=headers, data=init_data)
        init_resp.raise_for_status() # Raises HTTPError for bad responses (4xx or 5xx)
        init_json = init_resp.json()
        media_id_str = init_json.get("media_id_string")
        if not media_id_str:
             raise ValueError("media_id_string not found in INIT response.")
        logger.info(f"INIT success, media_id_string={media_id_str}")
    except requests.exceptions.RequestException as e:
        logger.error(f"INIT request failed: {e}. Response: {getattr(e, 'response', None).text if getattr(e, 'response', None) else 'N/A'}")
        raise HTTPException(status_code=500, detail=f"Twitter media INIT failed: {e}")
    except (ValueError, KeyError) as e:
         logger.error(f"Error parsing INIT response: {e}. Response: {init_resp.text}")
         raise HTTPException(status_code=500, detail=f"Twitter media INIT response error: {e}")


    # 2) APPEND
    chunk_size = 4 * 1024 * 1024 # 4MB chunks recommended
    segment_index = 0
    bytes_sent = 0
    try:
        with open(file_path, "rb") as f:
            while bytes_sent < file_size:
                chunk = f.read(chunk_size)
                if not chunk: break # Should not happen if file_size is correct

                logger.info(f"APPEND segment {segment_index}...")
                append_data = {
                    "command": "APPEND",
                    "media_id": media_id_str,
                    "segment_index": segment_index,
                }
                append_files = {"media": chunk} # 'files' param handles multipart/form-data

                append_resp = requests.post(
                    TWITTER_UPLOAD_URL,
                    headers=headers,
                    data=append_data,
                    files=append_files,
                    timeout=60 # Increase timeout for upload
                )
                append_resp.raise_for_status() # Check for errors

                bytes_sent += len(chunk)
                segment_index += 1
                logger.info(f"APPEND segment {segment_index-1} success.")
        logger.info("All chunks appended.")
    except requests.exceptions.RequestException as e:
        logger.error(f"APPEND request failed at seg={segment_index}: {e}. Response: {getattr(e, 'response', None).text if getattr(e, 'response', None) else 'N/A'}")
        raise HTTPException(status_code=500, detail=f"Twitter media APPEND failed: {e}")
    except Exception as e:
        logger.exception(f"Error during media APPEND at seg={segment_index}")
        raise HTTPException(status_code=500, detail=f"Unexpected error during media APPEND: {e}")


    # 3) FINALIZE
    logger.info("FINALIZE media upload...")
    finalize_data = {
        "command": "FINALIZE",
        "media_id": media_id_str,
    }
    try:
        finalize_resp = requests.post(
            TWITTER_UPLOAD_URL,
            headers=headers,
            data=finalize_data,
            timeout=60
        )
        finalize_resp.raise_for_status()
        finalize_json = finalize_resp.json()
        logger.info(f"FINALIZE response: {finalize_json}")

        # Check for processing info (especially for videos)
        processing_info = finalize_json.get("processing_info")
        if processing_info:
            state = processing_info.get("state")
            check_after_secs = processing_info.get("check_after_secs", 5) # Default wait 5s
            wait_time = 0
            max_wait = 300 # Max 5 minutes wait
            while state in ("pending", "in_progress") and wait_time < max_wait:
                logger.info(f"Media processing state={state}, waiting {check_after_secs}s...")
                time.sleep(check_after_secs)
                wait_time += check_after_secs

                status_params = {
                    "command": "STATUS",
                    "media_id": media_id_str,
                }
                status_resp = requests.get(
                    TWITTER_UPLOAD_URL,
                    headers=headers,
                    params=status_params,
                    timeout=30
                )
                status_resp.raise_for_status()
                status_json = status_resp.json()
                processing_info = status_json.get("processing_info", {})
                state = processing_info.get("state")
                check_after_secs = processing_info.get("check_after_secs", check_after_secs + 5) # Increase wait time
                logger.info(f"Media processing STATUS check: state={state}")

            if state == "failed":
                error_info = processing_info.get("error", {})
                logger.error(f"Media processing failed: {error_info}")
                raise HTTPException(status_code=500, detail=f"Media processing failed: {error_info.get('name')} - {error_info.get('message')}")
            elif state != "succeeded":
                 logger.error(f"Media processing did not succeed after {max_wait}s. Final state: {state}")
                 raise HTTPException(status_code=500, detail=f"Media processing timed out or ended in unexpected state: {state}")

        logger.info(f"FINALIZE successful for media_id_string: {media_id_str}")
        return media_id_str

    except requests.exceptions.RequestException as e:
        logger.error(f"FINALIZE/STATUS request failed: {e}. Response: {getattr(e, 'response', None).text if getattr(e, 'response', None) else 'N/A'}")
        raise HTTPException(status_code=500, detail=f"Twitter media FINALIZE/STATUS failed: {e}")
    except Exception as e:
         logger.exception(f"Error during media FINALIZE/STATUS")
         raise HTTPException(status_code=500, detail=f"Unexpected error during media FINALIZE/STATUS: {e}")

# ----------------- 3) Post Tweet to X (v2 API) -----------------
async def post_tweet(text: str, media_id_str: Optional[str] = None) -> Dict[str, Any]:
    """
    Creates a tweet using v2 endpoint with optional media_id_string from v1.1 upload.
    """
    payload = {"text": text}
    if media_id_str:
        # v2 endpoint expects media_ids in this structure
        payload["media"] = {"media_ids": [media_id_str]}

    headers = {
        "Content-Type": "application/json",
        # Use the same Bearer Token
        "Authorization": f"Bearer {X_BEARER_TOKEN}"
    }
    logger.info(f"Posting tweet with payload: {payload}")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(TWITTER_TWEET_URL, headers=headers, json=payload)
            resp.raise_for_status() # Raise HTTPStatusError for 4xx/5xx responses
            logger.success(f"Tweet posted successfully. Response: {resp.json()}")
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Tweet creation failed: Status {e.response.status_code}, Response: {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"Tweet creation failed: {e.response.text}")
        except httpx.RequestError as e:
            logger.error(f"Tweet creation request failed: {e}")
            raise HTTPException(status_code=500, detail=f"Tweet creation request failed: {e}")

# ----------------- 4) Main Endpoint: POST /tweet_summary -----------------
@app.post("/tweet_summary", response_model=TweetResponse)
async def tweet_summary_from_history(body: TweetSummaryRequest):
    """
    1.  Fetch conversation history from PostgreSQL for the given session_id.
    2.  Generate a tweet summary using LLaMA (Groq).
    3.  (Optional) Upload media using chunked upload (v1.1 API).
    4.  Post the tweet (v2 API) with the generated text and optional media ID.
    """
    session_id = body.session_id
    system_prompt_override = body.system_prompt_override
    want_media = body.want_media
    local_media_path = body.media_path

    # --- Get Conversation History ---
    db_conn = None
    try:
        db_conn = get_db_connection()
        history = get_conversation_history(session_id, db_conn)
        if not history:
             # Raise 404 if specifically no history found, vs 500 for DB error during fetch
             raise HTTPException(status_code=404, detail=f"No conversation history found for session_id: {session_id}")

        transcript_text = format_transcript_for_llama(history)
    except HTTPException as e:
         # Re-raise HTTPExceptions from DB functions directly
         raise e
    except Exception as e:
        logger.exception(f"[{session_id}] Unexpected error getting history.")
        raise HTTPException(status_code=500, detail="Failed to retrieve conversation history.")
    finally:
        if db_conn:
            db_conn.close()

    # --- Generate Tweet Summary ---
    # generate_tweet_summary raises HTTPException on failure
    tweet_text = generate_tweet_summary(session_id, transcript_text, system_prompt_override)

    # --- (Optional) Upload Media ---
    media_id_string = None
    if want_media:
        if not local_media_path:
            raise HTTPException(status_code=400, detail="media_path is required when want_media is true.")
        logger.info(f"[{session_id}] Attempting media upload: {local_media_path}")
        try:
            # This function raises HTTPException on failure
            media_id_string = chunked_media_upload_v1_1(local_media_path)
            logger.info(f"[{session_id}] Media upload success => media_id_string={media_id_string}")
        except HTTPException as e:
            # Log the specific media upload error but allow tweet posting without media?
            # Or fail the whole request? Let's fail it for now.
            logger.error(f"[{session_id}] Media upload failed: {e.detail}. Aborting tweet.")
            raise # Re-raise the HTTPException from upload function
        except Exception as e:
            logger.exception(f"[{session_id}] Unexpected error uploading media.")
            raise HTTPException(status_code=500, detail=f"Unexpected error during media upload: {e}")

    # --- Post the Tweet ---
    try:
        # This function raises HTTPException on failure
        tweet_json = await post_tweet(tweet_text, media_id_string)
        tweet_id = tweet_json.get("data", {}).get("id")
        posted_text = tweet_json.get("data", {}).get("text")

        if not tweet_id or not posted_text:
             logger.error(f"[{session_id}] Tweet post response missing data: {tweet_json}")
             raise HTTPException(status_code=500, detail="Tweet posted but response format was unexpected.")

        logger.success(f"[{session_id}] Tweet posted => tweet_id={tweet_id}")
        return TweetResponse(tweet_id=tweet_id, text=posted_text, media_id_str=media_id_string)
    except HTTPException as e:
        # Re-raise exceptions from post_tweet
        raise e
    except Exception as e:
        logger.exception(f"[{session_id}] Unexpected error posting tweet.")
        raise HTTPException(status_code=500, detail=f"Unexpected error posting tweet: {e}")

# ----------------- Root Endpoint -----------------
@app.get("/")
def root():
    return {"message": "Tweet Summary Microservice running. Use POST /tweet_summary"}

# ----------------- Run Server -----------------
if __name__ == "__main__":
    logger.info("Starting Tweet Summary Microservice on port 8005...")
    # Use the filename for running, e.g., "tweet_microservice_v2:app"
    uvicorn.run("tweet_microservice_v2:app", host="0.0.0.0", port=8005, reload=True)