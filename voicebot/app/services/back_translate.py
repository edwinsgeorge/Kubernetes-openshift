from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Union
from enum import Enum
import requests
import os
from dotenv import load_dotenv
from loguru import logger
import uvicorn
import httpx 
load_dotenv()

# --- Configuration ---
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_TRANSLATE_URL = os.getenv("SARVAM_TRANSLATE_URL", "https://api.sarvam.ai/translate")
REQUEST_TIMEOUT = 30.0 # Timeout for Sarvam Translate API call

if not SARVAM_API_KEY:
    logger.error("SARVAM_API_KEY not found in environment variables.")
    raise RuntimeError("Missing SARVAM_API_KEY")

# --- Enums based on Sarvam Translate API Docs ---
class TranslateLangCode(str, Enum):
    en_IN = "en-IN"
    hi_IN = "hi-IN"
    bn_IN = "bn-IN"
    gu_IN = "gu-IN"
    kn_IN = "kn-IN"
    ml_IN = "ml-IN"
    mr_IN = "mr-IN"
    od_IN = "od-IN"
    pa_IN = "pa-IN"
    ta_IN = "ta-IN"
    te_IN = "te-IN"
    # 'auto' is special, handle separately if needed or allow as string

class SpeakerGender(str, Enum):
    Male = "Male"
    Female = "Female"

class TranslateMode(str, Enum):
    formal = "formal"
    modern_colloquial = "modern-colloquial"
    classic_colloquial = "classic-colloquial"
    code_mixed = "code-mixed"

class TranslateModel(str, Enum):
    # Note: Docs say this is deprecated, but include for completeness if needed short-term
    mayura_v1 = "mayura:v1"

class OutputScript(str, Enum):
    roman = "roman"
    fully_native = "fully-native"
    spoken_form_in_native = "spoken-form-in-native"

class NumeralsFormat(str, Enum):
    international = "international"
    native = "native"


# --- Input Schema ---
class TranslateRequest(BaseModel):
    text_to_translate: str = Field(..., max_length=1000)
    # Allow 'auto' or specific language codes
    source_language_code: Union[TranslateLangCode, str] # str allows 'auto'
    target_language_code: TranslateLangCode
    speaker_gender: Optional[SpeakerGender] = None
    mode: Optional[TranslateMode] = TranslateMode.formal
    # model: Optional[TranslateModel] = None # Deprecated, omit unless necessary
    enable_preprocessing: Optional[bool] = False
    output_script: Optional[OutputScript] = None
    numerals_format: Optional[NumeralsFormat] = NumeralsFormat.international


# --- Output Schema ---
class TranslateResponse(BaseModel):
    translated_text: str
    detected_source_language: str # API returns the source lang used
    request_id: Optional[str] = None

# --- FastAPI App ---
app = FastAPI(title="Sarvam Translate Microservice")

# Reusable HTTP client
http_client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT)

@app.on_event("startup")
async def startup_event():
    logger.info("Translate Service starting up...")
    logger.info(f"Target Sarvam Translate URL: {SARVAM_TRANSLATE_URL}")

@app.on_event("shutdown")
async def shutdown_event():
    await http_client.aclose()
    logger.info("Translate Service shutting down...")

@app.post("/translate", response_model=TranslateResponse)
async def translate_text_endpoint(request: TranslateRequest):
    """
    Receives text and language codes, calls Sarvam Translate API,
    and returns the translated text.
    """
    logger.info(f"Received Translate request. Source: {request.source_language_code}, Target: {request.target_language_code}, Text: '{request.text_to_translate[:50]}...'")

    # Handle potential Enum values for source language
    source_lang_value = request.source_language_code.value if isinstance(request.source_language_code, Enum) else request.source_language_code

    payload = {
        "input": request.text_to_translate,
        "source_language_code": source_lang_value,
        "target_language_code": request.target_language_code.value, # Target must be an Enum value
        "speaker_gender": request.speaker_gender.value if request.speaker_gender else None,
        "mode": request.mode.value if request.mode else TranslateMode.formal.value,
        # "model": request.model.value if request.model else None, # Deprecated
        "enable_preprocessing": request.enable_preprocessing,
        "output_script": request.output_script.value if request.output_script else None,
        "numerals_format": request.numerals_format.value if request.numerals_format else NumeralsFormat.international.value
    }

    # Filter out None values from payload as API might not expect nulls for optional fields
    payload_filtered = {k: v for k, v in payload.items() if v is not None}

    headers = {
        "Content-Type": "application/json",
        "api-subscription-key": SARVAM_API_KEY
    }

    try:
        logger.debug(f"Sending payload to Sarvam Translate: {payload_filtered}")
        response = await http_client.post(SARVAM_TRANSLATE_URL, json=payload_filtered, headers=headers)
        response.raise_for_status() # Raise exception for non-2xx status codes

        result_json = response.json()
        logger.debug(f"Received response from Sarvam Translate: {result_json}")

        translated = result_json.get("translated_text")
        detected_source = result_json.get("source_language_code") # API returns the actual source used
        req_id = result_json.get("request_id")

        if translated is None or detected_source is None:
            logger.error(f"Incomplete data in Sarvam Translate response: {result_json}")
            raise HTTPException(status_code=500, detail="Translate service returned incomplete data.")

        logger.success(f"Successfully translated text (Request ID: {req_id}). Source detected/used: {detected_source}")

        return TranslateResponse(
            translated_text=translated,
            detected_source_language=detected_source,
            request_id=req_id
        )

    except httpx.RequestError as e:
        logger.error(f"Error requesting Sarvam Translate API: {e}")
        raise HTTPException(status_code=503, detail=f"Could not connect to Translate provider: {e}")
    except httpx.HTTPStatusError as e:
        logger.error(f"Sarvam Translate API returned error {e.response.status_code}: {e.response.text}")
        detail = f"Translate provider error: {e.response.status_code}"
        try: # Try to parse error detail from provider response
            error_detail = e.response.json().get('detail', e.response.text)
            detail = f"Translate provider error: {e.response.status_code} - {error_detail}"
        except: pass
        raise HTTPException(status_code=e.response.status_code, detail=detail)
    except Exception as e:
        logger.exception(f"An unexpected error occurred during translation: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error during translation: {e}")

@app.get("/")
def read_root():
    return {"message": "Translate Service is running. Use POST /translate"}

# --- Run the service ---
if __name__ == "__main__":
    # Make sure to run this on a different port than other services
    uvicorn.run("translate_service:app", host="0.0.0.0", port=8004, reload=True)
