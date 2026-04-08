"""
Face Service — FastAPI + DeepFace
Run: uvicorn face_service:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import uuid
import base64
import shutil
from pathlib import Path

from fastapi            import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic           import BaseModel
from deepface          import DeepFace


# ── Config ────────────────────────────────────────────────────────────────────

FACES_DIR       = Path(os.getenv("FACES_DIR", "reference_faces"))
FACES_DIR.mkdir(exist_ok=True)

ALLOWED_ORIGINS = os.getenv("FACE_CORS_ORIGINS", "http://localhost:3000").split(",")


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Face Service", version="1.0.0")

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
    image_b64:  str   # base64-encoded JPEG/PNG từ browser


class VerifyResponse(BaseModel):
    verified:  bool
    distance:  float
    threshold: float


# ── FaceService class ─────────────────────────────────────────────────────────

class FaceService:
    MODEL     = "ArcFace"
    DETECTOR  = "retinaface"
    THRESHOLD = 0.50        # khoảng cách tối đa để coi là khớp

    # ── File helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def face_path(user_id: str) -> Path:
        return FACES_DIR / f"{user_id}.jpg"

    @classmethod
    def is_registered(cls, user_id: str) -> bool:
        return cls.face_path(user_id).exists()

    # ── Core verify ───────────────────────────────────────────────────────────

    @classmethod
    def verify(cls, probe_path: str, user_id: str) -> VerifyResponse:
        ref = cls.face_path(user_id)
        if not ref.exists():
            raise FileNotFoundError(f"Chưa đăng ký khuôn mặt cho user: {user_id}")

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
            distance  = round(result["distance"], 4),
            threshold = cls.THRESHOLD,
        )

    # ── Register ──────────────────────────────────────────────────────────────

    @staticmethod
    def save_image(user_id: str, src_path: str) -> str:
        dest = FaceService.face_path(user_id)
        shutil.copy(src_path, dest)
        return str(dest)


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "faces_dir": str(FACES_DIR)}


@app.post("/face/register")
async def register_face(user_id: str, file: UploadFile = File(...)):
    """
    Nhận ảnh multipart, lưu vào reference_faces/{user_id}.jpg
    Gọi từ Express sau khi user upload qua POST /api/users/me/face
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Wrong format")

    tmp = Path(f"/tmp/{uuid.uuid4()}.jpg")
    try:
        with open(tmp, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # Kiểm tra có detect được mặt không trước khi lưu
        faces = DeepFace.extract_faces(
            img_path         = str(tmp),
            detector_backend = FaceService.DETECTOR,
            enforce_detection= False,
        )
        if not faces:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                                "No face detected in file")

        saved_path = FaceService.save_image(user_id, str(tmp))
        return {"message": "Face registration success", "path": saved_path}

    finally:
        if tmp.exists():
            tmp.unlink()


@app.post("/face/verify", response_model=VerifyResponse)
async def verify_face(req: VerifyRequest):
    """
    Nhận ảnh base64 + user_id, trả về kết quả xác thực.
    Gọi từ Express khi student check-in điểm danh.
    """
    if not FaceService.is_registered(req.user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND,
                            "Haven't face-registered for this account")

    tmp = Path(f"/tmp/{uuid.uuid4()}.jpg")
    try:
        img_data = base64.b64decode(req.image_b64)
        tmp.write_bytes(img_data)

        result = FaceService.verify(str(tmp), req.user_id)

        if not result.verified:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED,
                                f"Khuôn mặt không khớp (distance={result.distance})")
        return result

    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Lỗi xác thực: {e}")
    finally:
        if tmp.exists():
            tmp.unlink()


@app.delete("/face/{user_id}")
async def delete_face(user_id: str):
    path = FaceService.face_path(user_id)
    if not path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found")
    path.unlink()
    return {"message": "Đã xóa ảnh khuôn mặt"}
