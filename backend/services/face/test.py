from pathlib import Path
from time import perf_counter

from PIL import Image
from rfdetr import RFDETRMedium, RFDETRSmall

ROOT = Path(__file__).resolve().parent
THRESHOLD = 0.5
CASES = [
    (
        "kit",
        RFDETRMedium,
        ["2xsensor", "empty", "sensor"],
        "scan_weights/kit_weights.pt",
        "scan_tests/kit_images",
    ),
    (
        "single",
        RFDETRSmall,
        [
            "Arduino-Nano-33-BLE-Rev2",
            "Arduino-Nano-Every",
            "Arduino-Nano-Motor-Carrier",
            "Arduino-Nano-R4-Headers",
            "Arduino-UNO-R3",
            "Arduino-UNO-R4-WiFi",
            "QR-code",
        ],
        "scan_weights/single_items_weights.pt",
        "scan_tests/singles_images",
    ),
]


def detect(model, image, class_names):
    det = model.predict(image, threshold=THRESHOLD)
    out = []
    for box, conf, cid in zip(det.xyxy, det.confidence, det.class_id):
        cid = int(cid)
        idx = cid - 1  # ids start at 1; 0 is the Roboflow placeholder
        name = class_names[idx] if 0 <= idx < len(class_names) else f"?{cid}"
        out.append({
            "class": name,
            "confidence": round(float(conf), 3),
            "box": [round(float(v)) for v in box],
        })
    return out


for label, model_cls, class_names, weights, folder in CASES:
    model = model_cls(pretrain_weights=str(ROOT / weights), num_classes=len(class_names))
    print(f"\n=== {label} === classes: {class_names}")

    paths = sorted(p for p in (ROOT / folder).iterdir()
                   if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})

    detect(model, Image.open(paths[0]).convert("RGB"), class_names)  # warm-up

    for p in paths:
        img = Image.open(p).convert("RGB")
        t = perf_counter()
        results = detect(model, img, class_names)
        ms = (perf_counter() - t) * 1000

        print(f"\n{p.name}  ({ms:.0f} ms, {len(results)} detections)")
        for r in results:
            print(f"  {r['class']:<28} {r['confidence']:.2f}  {r['box']}")

        if label == "kit":
            counts = {}
            for r in results:
                counts[r["class"]] = counts.get(r["class"], 0) + 1
            print("  counts:", counts)