from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import os

app = FastAPI(title="ML Routing Service", version="1.0.0")

MODEL_PATH = os.path.join(os.path.dirname(__file__), "call_routing_model.pkl")
VECTORIZER_PATH = os.path.join(os.path.dirname(__file__), "tfidf_vectorizer.pkl")

model = None
vectorizer = None


def load_model():
    global model, vectorizer
    model = joblib.load(MODEL_PATH)
    vectorizer = joblib.load(VECTORIZER_PATH)


class RouteRequest(BaseModel):
    transcript: str


class RouteResponse(BaseModel):
    forwarded_to: str


@app.on_event("startup")
async def startup_event():
    load_model()


@app.get("/")
async def health_check():
    return {"status": "healthy", "service": "ml-routing"}


@app.post("/route-call", response_model=RouteResponse)
async def route_call(request: RouteRequest):
    text = request.transcript.strip()
    if not text:
        return RouteResponse(forwarded_to="Unknown")

    text_vectorized = vectorizer.transform([text])
    prediction = model.predict(text_vectorized)[0]
    return RouteResponse(forwarded_to=prediction)
