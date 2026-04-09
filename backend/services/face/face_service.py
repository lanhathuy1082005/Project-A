"""
Face Service — FastAPI + DeepFace
Run: uvicorn face_service:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import base64
from pathlib import Path

from fastapi            import FastAPI, HTTPException, status
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from pydantic           import BaseModel
from deepface          import DeepFace


# ── Config ────────────────────────────────────────────────────────────────────

FACES_DIR       = Path(os.getenv("FACES_DIR", "reference_faces"))
FACES_DIR.mkdir(exist_ok=True)

ALLOWED_ORIGINS = os.getenv("FACE_CORS_ORIGINS", "http://localhost:3000").split(",")


# ── App ───────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    DeepFace.build_model("ArcFace")
    yield


app = FastAPI(title="Face Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = ALLOWED_ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ── DTOs ─────────────────────────────────────────────────────────────────────

class VerifyRequest(BaseModel):
    user_id:    str
    image_b64:  str   # base64-encoded JPEG/PNG from AuthService


class VerifyResponse(BaseModel):
    verified:  bool
    distance:  float
    threshold: float


# ── FaceService class ─────────────────────────────────────────────────────────

class FaceService:
    MODEL     = "ArcFace"
    DETECTOR  = "mtcnn"
    THRESHOLD = 0.50       # maximum distance to be considered match

    # ── File helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def face_path(user_id: str) -> Path:
        return FACES_DIR / f"{user_id}.jpg"

    # ── Core verify ───────────────────────────────────────────────────────────

    @classmethod
    def verify(cls, probe_path: str, user_id: str) -> VerifyResponse:
        ref = cls.face_path(user_id)
        if not ref.exists():
            raise FileNotFoundError(f"Face likely not registered for: {user_id}")

        result = DeepFace.verify(
            img1_path        = probe_path,
            img2_path        = str(ref),
            model_name       = cls.MODEL,
            detector_backend = cls.DETECTOR,
            enforce_detection= False,
            align            = True,
        )
        return VerifyResponse(
            verified  = result["verified"] and result["distance"] < cls.THRESHOLD,
            distance  = round(result["distance"], 2),
            threshold = cls.THRESHOLD,
        )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "faces_dir": str(FACES_DIR)}

def ensure_b64_prefix(b64: str) -> str:
    if b64.startswith("data:image"):
        return b64
    return f"data:image/jpeg;base64,{b64}"
    
@app.post("/face/verify", response_model=VerifyResponse)
async def verify_face(req: VerifyRequest):
    """
    Get base64 + user_id, return verification results.
    Called from Express when student does attendance check.
    """

    try:
        img_data = base64.b64decode(req.image_b64)
        b64_string = ensure_b64_prefix(base64.b64encode(img_data).decode('utf-8')) #redundant but im hopeless


        result = FaceService.verify(probe_path= b64_string,user_id= req.user_id)

        return result

    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Server error: {e}")
