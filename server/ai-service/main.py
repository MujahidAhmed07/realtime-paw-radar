"""
PetAlert AI matching service — future integration stub.

Purpose (not required for the working app):
  - Pet image similarity (CLIP image embeddings)
  - Breed classification (EfficientNet)
  - Colour recognition
  - Missing/found matching via pgvector cosine similarity

Run:  pip install fastapi uvicorn torch open_clip_torch psycopg[binary]
      uvicorn main:app --port 8100
Set VITE_AI_SERVICE_URL=http://localhost:8100 in the frontend .env.

All matching output is a *suggestion* — never an automatic identity decision.
"""
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="PetAlert AI Service", version="0.1.0")


class MatchRequest(BaseModel):
    missing_report_id: str
    found_report_id: str


class MatchSuggestion(BaseModel):
    missing_report_id: str
    found_report_id: str
    similarity: float
    method: str


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": False}


@app.post("/match", response_model=MatchSuggestion)
def match(req: MatchRequest):
    """Placeholder — replace with CLIP embedding cosine similarity."""
    return MatchSuggestion(
        missing_report_id=req.missing_report_id,
        found_report_id=req.found_report_id,
        similarity=0.0,
        method="stub-v0",
    )


@app.post("/embed")
def embed(image_url: str):
    """Placeholder — return a zero vector of CLIP embedding dimension."""
    return {"url": image_url, "embedding": [0.0] * 512, "model": "clip-stub"}
