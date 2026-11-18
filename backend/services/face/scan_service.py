import base64
import binascii
from io import BytesIO
import os
from pathlib import Path
from threading import Lock
from typing import Literal

from dotenv import load_dotenv
from fastapi import APIRouter
from PIL import Image
from pydantic import BaseModel, Field, field_validator


load_dotenv(Path(__file__).resolve().parents[2] / ".env")

MAX_SCAN_IMAGE_BYTES = 7 * 1024 * 1024
MAX_IMAGE_B64_CHARS = ((MAX_SCAN_IMAGE_BYTES + 2) // 3) * 4
KIT_DETECTION_THRESHOLD = 0.5
SINGLE_DETECTION_THRESHOLD = 0.5
KIT_SCAN_CONFIDENCE_THRESHOLD = float(
    os.getenv("KIT_SCAN_CONFIDENCE_THRESHOLD", "0.8")
)
KIT_MODEL_VERSION = os.getenv("KIT_SCAN_MODEL_VERSION", "kit-rfdetr-v1")
KIT_CLASS_NAMES = ("2xsensor", "empty", "sensor")
KIT_MODEL_PATH = Path(__file__).resolve().parent / "scan_weights" / "kit_weights.pt"
SINGLE_MODEL_VERSION = os.getenv("SINGLE_SCAN_MODEL_VERSION", "single-rfdetr-v1")
SINGLE_CLASS_NAMES = (
    "Arduino-Nano-33-BLE-Rev2",
    "Arduino-Nano-Every",
    "Arduino-Nano-Motor-Carrier",
    "Arduino-Nano-R4-Headers",
    "Arduino-UNO-R3",
    "Arduino-UNO-R4-WiFi",
    "QR-code",
)
SINGLE_MODEL_PATH = (
    Path(__file__).resolve().parent / "scan_weights" / "single_items_weights.pt"
)

if not 0 <= KIT_SCAN_CONFIDENCE_THRESHOLD <= 1:
    raise ValueError("KIT_SCAN_CONFIDENCE_THRESHOLD must be between 0 and 1")

ScanStatus = Literal["success", "missing", "wrong", "unsure"]
KitCounts = dict[str, int]
_kit_model = None
_single_model = None
_kit_model_lock = Lock()


class ScanImageRequest(BaseModel):
    image_b64: str = Field(min_length=4, max_length=MAX_IMAGE_B64_CHARS)

    @field_validator("image_b64")
    @classmethod
    def validate_image(cls, value: str) -> str:
        try:
            image = base64.b64decode(value, validate=True)
        except (ValueError, binascii.Error) as error:
            raise ValueError("image_b64 must contain valid base64") from error
        if not image.startswith(b"\xff\xd8\xff"):
            raise ValueError("image_b64 must contain a JPEG image")
        if len(image) > MAX_SCAN_IMAGE_BYTES:
            raise ValueError("image_b64 exceeds the maximum image size")
        return value


class KitFrameRequest(ScanImageRequest):
    expected_slots: int = Field(gt=0)


class KitFrameResponse(BaseModel):
    expected_slots: int
    empty_count: int = Field(ge=0)
    sensor_count: int = Field(ge=0)
    two_sensor_count: int = Field(ge=0)
    status: ScanStatus
    confidence: float = Field(ge=0, le=1)
    confidence_threshold: float = Field(ge=0, le=1)
    model_version: str


class SingleDetection(BaseModel):
    class_name: str
    confidence: float = Field(ge=0, le=1)
    box: tuple[float, float, float, float]


class SingleFrameResponse(BaseModel):
    detections: list[SingleDetection]
    detection_threshold: float = Field(ge=0, le=1)
    model_version: str


def decode_scan_image(image_b64: str) -> bytes:
    return base64.b64decode(image_b64, validate=True)


def predict_kit_contents(image: bytes) -> tuple[KitCounts, float]:
    global _kit_model
    from rfdetr import RFDETRMedium

    with _kit_model_lock:
        if _kit_model is None:
            if not KIT_MODEL_PATH.is_file():
                raise FileNotFoundError(f"Kit model weights not found: {KIT_MODEL_PATH}")
            _kit_model = RFDETRMedium(
                pretrain_weights=str(KIT_MODEL_PATH),
                num_classes=len(KIT_CLASS_NAMES),
            )

        with Image.open(BytesIO(image)) as source:
            prediction = _kit_model.predict(
                source.convert("RGB"),
                threshold=KIT_DETECTION_THRESHOLD,
            )

    counts = {name: 0 for name in KIT_CLASS_NAMES}
    confidences = []
    for confidence, class_id in zip(prediction.confidence, prediction.class_id):
        class_index = int(class_id)
        index = class_index - 1
        if not 0 <= index < len(KIT_CLASS_NAMES):
            raise RuntimeError(f"Kit model returned unknown class id: {class_index}")
        counts[KIT_CLASS_NAMES[index]] += 1
        confidences.append(float(confidence))

    confidence = min(confidences, default=0.0)
    return counts, confidence


def predict_single_detections(image: bytes) -> list[SingleDetection]:
    global _single_model
    from rfdetr import RFDETRSmall

    with _kit_model_lock:
        if _single_model is None:
            if not SINGLE_MODEL_PATH.is_file():
                raise FileNotFoundError(
                    f"Single-item model weights not found: {SINGLE_MODEL_PATH}"
                )
            _single_model = RFDETRSmall(
                pretrain_weights=str(SINGLE_MODEL_PATH),
                num_classes=len(SINGLE_CLASS_NAMES),
            )

        with Image.open(BytesIO(image)) as source:
            prediction = _single_model.predict(
                source.convert("RGB"),
                threshold=SINGLE_DETECTION_THRESHOLD,
            )

    detections = []
    for box, confidence, class_id in zip(
        prediction.xyxy,
        prediction.confidence,
        prediction.class_id,
    ):
        index = int(class_id) - 1
        if not 0 <= index < len(SINGLE_CLASS_NAMES):
            raise RuntimeError(f"Single-item model returned unknown class id: {class_id}")
        detections.append(
            SingleDetection(
                class_name=SINGLE_CLASS_NAMES[index],
                confidence=float(confidence),
                box=tuple(float(value) for value in box),
            )
        )
    return detections


def classify_kit_contents(
    counts: KitCounts,
    confidence: float,
    expected_slots: int,
    threshold: float,
) -> ScanStatus:
    if confidence < threshold:
        return "unsure"
    if sum(counts.values()) != expected_slots:
        return "wrong"
    return "missing" if counts["empty"] else "success"


router: APIRouter = APIRouter()


@router.post("/scan-frames/kit", response_model=KitFrameResponse)
def verify_kit_frame(req: KitFrameRequest) -> KitFrameResponse:
    image = decode_scan_image(req.image_b64)
    counts, confidence = predict_kit_contents(image)
    result_status = classify_kit_contents(
        counts,
        confidence,
        req.expected_slots,
        KIT_SCAN_CONFIDENCE_THRESHOLD,
    )
    return KitFrameResponse(
        expected_slots=req.expected_slots,
        empty_count=counts["empty"],
        sensor_count=counts["sensor"],
        two_sensor_count=counts["2xsensor"],
        status=result_status,
        confidence=confidence,
        confidence_threshold=KIT_SCAN_CONFIDENCE_THRESHOLD,
        model_version=KIT_MODEL_VERSION,
    )


@router.post("/scan-frames/single", response_model=SingleFrameResponse)
def inspect_single_frame(req: ScanImageRequest) -> SingleFrameResponse:
    image = decode_scan_image(req.image_b64)
    return SingleFrameResponse(
        detections=predict_single_detections(image),
        detection_threshold=SINGLE_DETECTION_THRESHOLD,
        model_version=SINGLE_MODEL_VERSION,
    )
