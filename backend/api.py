from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import uvicorn

# Load the model and vectorizer
model = joblib.load("call_routing_model.pkl")
vectorizer = joblib.load("tfidf_vectorizer.pkl")

# Initialize FastAPI app
app = FastAPI()

# Input schema for the API
class TranscriptInput(BaseModel):
    transcript: str

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Call Routing API is running"}

# Endpoint for predicting call routing
@app.post("/route-call")
def route_call(input: TranscriptInput):
    try:
        # Preprocess the input transcript
        vectorized_input = vectorizer.transform([input.transcript])
        predicted_label = model.predict(vectorized_input)[0]
        
        return {
            "transcript": input.transcript,
            "forwarded_to": predicted_label
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing the request: {str(e)}")

# Example usage (uncomment for local testing)
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
