"""RF-DETR scan endpoints, mounted into the face service.

Class names come from kit_classes.json / single_classes.json next to the weights
(extracted once from the Roboflow COCO export of the trained dataset version).
Model class id 0 is the Roboflow placeholder; real classes start at 1.

Call load_scan_models() at startup: it validates each class map against its
checkpoint, loads both models and runs a warm-up frame, and raises (so the server
refuses to start) if anything does not line up.
"""
import base64
import binascii
import json
import logging
from dataclasses import dataclass
from io import BytesIO
import os
from pathlib import Path
from threading import Lock
from typing import Literal

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from PIL import Image
from pydantic import BaseModel, Field, field_validator


load_dotenv(Path(__file__).resolve().parents[2] / ".env")

log = logging.getLogger("scan_service")

WEIGHTS_DIR = Path(__file__).resolve().parent / "scan_weights"
MAX_SCAN_IMAGE_BYTES = 7 * 1024 * 1024
MAX_IMAGE_B64_CHARS = ((MAX_SCAN_IMAGE_BYTES + 2) // 3) * 4
KIT_DETECTION_THRESHOLD = 0.5
SINGLE_DETECTION_THRESHOLD = 0.5
KIT_SCAN_CONFIDENCE_THRESHOLD = float(os.getenv("KIT_SCAN_CONFIDENCE_THRESHOLD", "0.8"))
KIT_MODEL_VERSION = os.getenv("KIT_SCAN_MODEL_VERSION", "kit-rfdetr-v1")
SINGLE_MODEL_VERSION = os.getenv("SINGLE_SCAN_MODEL_VERSION", "single-rfdetr-v1")
KIT_REQUIRED_CLASSES = {"2xsensor", "empty", "sensor"}
QR_CLASS = "QR-code"

if not 0 <= KIT_SCAN_CONFIDENCE_THRESHOLD <= 1:
    raise ValueError("KIT_SCAN_CONFIDENCE_THRESHOLD must be between 0 and 1")

ScanStatus = Literal["success", "missing", "wrong", "unsure"]
KitCounts = dict[str, int]


# ── Class maps and models ────────────────────────────────────────────────────

def load_class_map(path: Path) -> tuple[str, ...]:
    """Returns class names ordered by model class id (id 1 first)."""
    data = json.loads(path.read_text(encoding="utf-8"))
    classes = data.get("classes")
    if not isinstance(classes, dict) or not classes:
        raise ValueError(f"{path.name}: 'classes' must be a non-empty object")
    try:
        ids = sorted(int(key) for key in classes)
    except ValueError as error:
        raise ValueError(f"{path.name}: class ids must be integers") from error
    if ids != list(range(1, len(ids) + 1)):
        raise ValueError(f"{path.name}: class ids must be 1..N without gaps, got {ids}")
    names = tuple(classes[str(i)] for i in ids)
    if any(not isinstance(n, str) or not n.strip() for n in names):
        raise ValueError(f"{path.name}: class names must be non-empty strings")
    if len(set(names)) != len(names):
        raise ValueError(f"{path.name}: class names must be unique")
    return names


def checkpoint_output_classes(weights: Path) -> int:
    """Number of class logits in the checkpoint head (placeholder included)."""
    import torch

    checkpoint = torch.load(weights, map_location="cpu", weights_only=False)
    bias = checkpoint["model"].get("transformer.enc_out_class_embed.0.bias")
    if bias is None:
        raise ValueError(f"{weights.name}: cannot find the class head in the checkpoint")
    return int(bias.shape[0])


@dataclass
class ScanModel:
    name: str
    model_cls_name: str
    weights: Path
    classes_file: Path
    detection_threshold: float
    model_version: str
    class_names: tuple[str, ...] = ()
    model: object = None
    lock: Lock = None

    def load(self) -> None:
        import rfdetr

        if not self.weights.is_file():
            raise FileNotFoundError(f"{self.name} weights not found: {self.weights}")
        self.class_names = load_class_map(self.classes_file)
        outputs = checkpoint_output_classes(self.weights)
        if outputs != len(self.class_names) + 1:
            raise ValueError(
                f"{self.classes_file.name} lists {len(self.class_names)} classes but "
                f"{self.weights.name} has {outputs} outputs (expected classes + placeholder)"
            )
        self.model = getattr(rfdetr, self.model_cls_name)(
            pretrain_weights=str(self.weights),
            num_classes=len(self.class_names),
        )
        self.lock = Lock()
        # Warm-up so the first student does not pay for lazy initialisation.
        self.model.predict(Image.new("RGB", (640, 480)), threshold=self.detection_threshold)

    def predict(self, image: bytes):
        if self.model is None:
            raise HTTPException(503, f"{self.name} model is not loaded")
        with Image.open(BytesIO(image)) as source, self.lock:
            return self.model.predict(source.convert("RGB"), threshold=self.detection_threshold)

    def class_name(self, class_id) -> str:
        index = int(class_id) - 1
        if not 0 <= index < len(self.class_names):
            raise RuntimeError(f"{self.name} model returned unknown class id: {class_id}")
        return self.class_names[index]


KIT_MODEL = ScanModel(
    name="Kit",
    model_cls_name="RFDETRMedium",
    weights=WEIGHTS_DIR / "kit_weights.pt",
    classes_file=WEIGHTS_DIR / "kit_classes.json",
    detection_threshold=KIT_DETECTION_THRESHOLD,
    model_version=KIT_MODEL_VERSION,
)
SINGLE_MODEL = ScanModel(
    name="Single-item",
    model_cls_name="RFDETRSmall",
    weights=WEIGHTS_DIR / "single_items_weights.pt",
    classes_file=WEIGHTS_DIR / "single_classes.json",
    detection_threshold=SINGLE_DETECTION_THRESHOLD,
    model_version=SINGLE_MODEL_VERSION,
)


def load_scan_models() -> None:
    for scan_model in (KIT_MODEL, SINGLE_MODEL):
        scan_model.load()
        log.info("%s model loaded: %s", scan_model.name, ", ".join(scan_model.class_names))
    missing = KIT_REQUIRED_CLASSES - set(KIT_MODEL.class_names)
    if missing:
        raise ValueError(f"kit class map is missing {sorted(missing)}")
    if QR_CLASS not in SINGLE_MODEL.class_names:
        raise ValueError(f"single-item class map has no '{QR_CLASS}' class")


# ── Request / response models ────────────────────────────────────────────────

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


class ClassesResponse(BaseModel):
    kit: list[str]
    single: list[str]
    qr_class: str
    kit_model_version: str
    single_model_version: str


# ── Inference ────────────────────────────────────────────────────────────────

def predict_kit_contents(image: bytes) -> tuple[KitCounts, float]:
    prediction = KIT_MODEL.predict(image)
    counts = {name: 0 for name in KIT_MODEL.class_names}
    confidences = []
    for confidence, class_id in zip(prediction.confidence, prediction.class_id):
        counts[KIT_MODEL.class_name(class_id)] += 1
        confidences.append(float(confidence))
    # The weakest detection decides how sure the whole count is.
    return counts, min(confidences, default=0.0)


def predict_single_detections(image: bytes) -> list[SingleDetection]:
    prediction = SINGLE_MODEL.predict(image)
    return [
        SingleDetection(
            class_name=SINGLE_MODEL.class_name(class_id),
            confidence=float(confidence),
            box=tuple(float(value) for value in box),
        )
        for box, confidence, class_id in zip(
            prediction.xyxy, prediction.confidence, prediction.class_id
        )
    ]


def classify_kit_contents(
    counts: KitCounts, confidence: float, expected_slots: int, threshold: float
) -> ScanStatus:
    if confidence < threshold:
        return "unsure"
    if sum(counts.values()) != expected_slots:
        return "wrong"
    return "missing" if counts["empty"] else "success"


# ── Routes ───────────────────────────────────────────────────────────────────

router: APIRouter = APIRouter()


@router.get("/scan-frames/classes", response_model=ClassesResponse)
def scan_classes() -> ClassesResponse:
    return ClassesResponse(
        kit=list(KIT_MODEL.class_names),
        single=list(SINGLE_MODEL.class_names),
        qr_class=QR_CLASS,
        kit_model_version=KIT_MODEL_VERSION,
        single_model_version=SINGLE_MODEL_VERSION,
    )


@router.post("/scan-frames/kit", response_model=KitFrameResponse)
def verify_kit_frame(req: KitFrameRequest) -> KitFrameResponse:
    counts, confidence = predict_kit_contents(base64.b64decode(req.image_b64, validate=True))
    return KitFrameResponse(
        expected_slots=req.expected_slots,
        empty_count=counts["empty"],
        sensor_count=counts["sensor"],
        two_sensor_count=counts["2xsensor"],
        status=classify_kit_contents(
            counts, confidence, req.expected_slots, KIT_SCAN_CONFIDENCE_THRESHOLD
        ),
        confidence=confidence,
        confidence_threshold=KIT_SCAN_CONFIDENCE_THRESHOLD,
        model_version=KIT_MODEL_VERSION,
    )


@router.post("/scan-frames/single", response_model=SingleFrameResponse)
def inspect_single_frame(req: ScanImageRequest) -> SingleFrameResponse:
    return SingleFrameResponse(
        detections=predict_single_detections(base64.b64decode(req.image_b64, validate=True)),
        detection_threshold=SINGLE_DETECTION_THRESHOLD,
        model_version=SINGLE_MODEL_VERSION,
    )
