 # tts_service.py

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
import requests
import os
from dotenv import load_dotenv
from loguru import logger
import uvicorn
import httpx # Use httpx for consistency

load_dotenv()

# --- Configuration ---
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_TTS_URL = os.getenv("SARVAM_TTS_URL", "https://api.sarvam.ai/text-to-speech")
REQUEST_TIMEOUT = 45.0 # Timeout for Sarvam TTS API call

if not SARVAM_API_KEY:
    logger.error("SARVAM_API_KEY not found in environment variables.")
    raise RuntimeError("Missing SARVAM_API_KEY")

# --- Enums based on Sarvam API Docs ---
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
    diya = "diya"
    neel = "neel"
    misha = "misha"
    vian = "vian"
    arjun = "arjun"
    maya = "maya"
    anushka = "anushka"
    abhilash = "abhilash"
    manisha = "manisha"
    vidya = "vidya"
    arya = "arya"
    karun = "karun"
    hitesh = "hitesh"

class SampleRate(int, Enum):
    rate_8000 = 8000
    rate_16000 = 16000
    rate_22050 = 22050

class ModelTTS(str, Enum):
    bulbul_v1 = "bulbul:v1"
    bulbul_v2 = "bulbul:v2"


# --- Input Schema ---
class TTSRequest(BaseModel):
    text_to_speak: str = Field(..., max_length=500) # Sarvam limit per input
    target_language_code: LanguageCodeTTS
    speaker: Optional[Speaker] = Speaker.amol
    pitch: Optional[float] = Field(default=0.0, ge=-1.0, le=1.0)
    pace: Optional[float] = Field(default=1.0, ge=0.3, le=3.0)
    loudness: Optional[float] = Field(default=1.0, ge=0.1, le=3.0)
    speech_sample_rate: Optional[SampleRate] = SampleRate.rate_22050
    enable_preprocessing: Optional[bool] = False
    model: Optional[ModelTTS] = ModelTTS.bulbul_v1


# --- Output Schema ---
class TTSResponse(BaseModel):
    audio_base64: str
    request_id: Optional[str] = None

# --- FastAPI App ---
app = FastAPI(title="Sarvam TTS Microservice")

# Reusable HTTP client
http_client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT)

@app.on_event("startup")
async def startup_event():
    logger.info("TTS Service starting up...")
    logger.info(f"Target Sarvam TTS URL: {SARVAM_TTS_URL}")

@app.on_event("shutdown")
async def shutdown_event():
    await http_client.aclose()
    logger.info("TTS Service shutting down...")

@app.post("/synthesize", response_model=TTSResponse)
async def synthesize_speech(request: TTSRequest):
    """
    Receives text and language code, calls Sarvam TTS API,
    and returns the base64 encoded audio.
    """
    logger.info(f"Received TTS request for language: {request.target_language_code}, text: '{request.text_to_speak[:50]}...'")

    payload = {
        "inputs": [request.text_to_speak], # API expects a list
        "target_language_code": "ml-IN",
        "speaker": "meera",
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
        response = await http_client.post(SARVAM_TTS_URL, json=payload, headers=headers)
        response.raise_for_status() # Raise exception for non-2xx status codes

        result_json = response.json()
        audios_base64 = result_json.get("audios")
        request_id = result_json.get("request_id")

        if not audios_base64 or not isinstance(audios_base64, list) or len(audios_base64) == 0:
            logger.error(f"No audio data found in Sarvam TTS response: {result_json}")
            raise HTTPException(status_code=500, detail="TTS service returned no audio data.")

        # Assuming single input text, return the first audio
        audio_base64 = audios_base64[0]
        logger.success(f"Successfully synthesized audio (Request ID: {request_id}). Length: {len(audio_base64)}")

        return TTSResponse(audio_base64=audio_base64, request_id=request_id)

    except httpx.RequestError as e:
        logger.error(f"Error requesting Sarvam TTS API: {e}")
        raise HTTPException(status_code=503, detail=f"Could not connect to TTS provider: {e}")
    except httpx.HTTPStatusError as e:
        logger.error(f"Sarvam TTS API returned error {e.response.status_code}: {e.response.text}")
        detail = f"TTS provider error: {e.response.status_code}"
        try: # Try to parse error detail from provider response
           error_detail = e.response.json().get('detail', e.response.text)
           detail = f"TTS provider error: {e.response.status_code} - {error_detail}"
        except: pass
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.exception(f"An unexpected error occurred during TTS synthesis: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error during TTS: {e}")

@app.get("/")
def read_root():
    return {"message": "TTS Service is running. Use POST /synthesize"}

# --- Run the service ---
if __name__ == "__main__":
    uvicorn.run("tts_service:app", host="0.0.0.0", port=8003, reload=True)
