"""
Face Service — FastAPI + DeepFace
Reference face images are stored in MinIO (S3-compatible object storage)
instead of the local filesystem, so they survive independently of any one
container and can be shared if this service is ever scaled out.

Run: uvicorn face_service:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import io
import base64
import tempfile
from contextlib import asynccontextmanager

from fastapi                 import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic                import BaseModel
from deepface                import DeepFace
from minio                   import Minio
from minio.error             import S3Error


# ── Config ────────────────────────────────────────────────────────────────────

MINIO_ENDPOINT   = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_SECURE     = os.getenv("MINIO_SECURE", "false").lower() == "true"
MINIO_BUCKET     = os.getenv("MINIO_BUCKET", "reference-faces")

ALLOWED_ORIGINS  = os.getenv("FACE_CORS_ORIGINS", "http://localhost:3000").split(",")

minio_client = Minio(
    MINIO_ENDPOINT,
    access_key = MINIO_ACCESS_KEY,
    secret_key = MINIO_SECRET_KEY,
    secure     = MINIO_SECURE,
)


# ── App ───────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    DeepFace.build_model("ArcFace")
    if not minio_client.bucket_exists(MINIO_BUCKET):
        minio_client.make_bucket(MINIO_BUCKET)
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


class RegisterRequest(BaseModel):
    user_id:   str
    image_b64: str


# ── FaceService class ─────────────────────────────────────────────────────────

class FaceService:
    MODEL     = "ArcFace"
    DETECTOR  = "mtcnn"
    THRESHOLD = 0.50       # maximum distance to be considered match

    # ── MinIO helpers ─────────────────────────────────────────────────────────

    @staticmethod
    def object_key(user_id: str) -> str:
        return f"{user_id}.jpg"

    @classmethod
    def exists(cls, user_id: str) -> bool:
        try:
            minio_client.stat_object(MINIO_BUCKET, cls.object_key(user_id))
            return True
        except S3Error as e:
            if e.code in ("NoSuchKey", "NoSuchObject"):
                return False
            raise

    @classmethod
    def save(cls, user_id: str, image_bytes: bytes):
        minio_client.put_object(
            MINIO_BUCKET, cls.object_key(user_id),
            data   = io.BytesIO(image_bytes),
            length = len(image_bytes),
            content_type = "image/jpeg",
        )

    @classmethod
    def fetch_to_tempfile(cls, user_id: str) -> str:
        try:
            response = minio_client.get_object(MINIO_BUCKET, cls.object_key(user_id))
            data = response.read()
        except S3Error as e:
            if e.code in ("NoSuchKey", "NoSuchObject"):
                raise FileNotFoundError(f"Face not registered for: {user_id}")
            raise
        finally:
            try:
                response.close()
                response.release_conn()
            except Exception:
                pass

        tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
        tmp.write(data)
        tmp.close()
        return tmp.name

    # ── Core verify ───────────────────────────────────────────────────────────

    @classmethod
    def verify(cls, probe_path: str, user_id: str) -> VerifyResponse:
        ref_path = cls.fetch_to_tempfile(user_id)
        try:
            result = DeepFace.verify(
                img1_path        = probe_path,
                img2_path        = ref_path,
                model_name       = cls.MODEL,
                detector_backend = cls.DETECTOR,
                enforce_detection= False,
                align            = True,
            )
        finally:
            os.unlink(ref_path)

        return VerifyResponse(
            verified  = result["verified"] and result["distance"] < cls.THRESHOLD,
            distance  = round(result["distance"], 2),
            threshold = cls.THRESHOLD,
        )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "bucket": MINIO_BUCKET}


def ensure_b64_prefix(b64: str) -> str:
    if b64.startswith("data:image"):
        return b64
    return f"data:image/jpeg;base64,{b64}"


@app.get("/face/exists/{user_id}")
def face_exists(user_id: str):
    return {"exists": FaceService.exists(user_id)}


@app.post("/face/register")
async def register_face(req: RegisterRequest):
    try:
        image_bytes = base64.b64decode(req.image_b64.split(",")[-1])
        FaceService.save(req.user_id, image_bytes)
        return {"message": "Face registered"}
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Server error: {e}")


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
