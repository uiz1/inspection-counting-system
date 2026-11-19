"""端到端推理管线：特征 → 路由 → 预处理 → 计数。"""

from __future__ import annotations

import base64
import io
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.counting.density import estimate_count_with_density, overlay_density
from algorithms.lighting import apply_branch, decide_route, extract_lighting_features
from backend.app.schemas.inference import (
    InferenceResult,
    LightingFeatures,
    TimingBreakdown,
)


def _image_to_data_url(image: Image.Image, fmt: str = "JPEG", quality: int = 88) -> str:
    buf = io.BytesIO()
    save_kwargs = {"quality": quality} if fmt.upper() == "JPEG" else {}
    image.save(buf, format=fmt, **save_kwargs)
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    mime = "image/jpeg" if fmt.upper() == "JPEG" else f"image/{fmt.lower()}"
    return f"data:{mime};base64,{b64}"


def run_inference(image: Image.Image, *, station: str = "工位-A", filename: str = "") -> InferenceResult:
    t0 = time.perf_counter()

    t = time.perf_counter()
    feats = extract_lighting_features(image)
    feature_ms = (time.perf_counter() - t) * 1000

    t = time.perf_counter()
    decision = decide_route(feats)
    route_ms = (time.perf_counter() - t) * 1000

    t = time.perf_counter()
    corrected = apply_branch(image, decision.branch)
    preprocess_ms = (time.perf_counter() - t) * 1000

    t = time.perf_counter()
    count_result = estimate_count_with_density(corrected)
    overlay = overlay_density(corrected, count_result.density)
    count_ms = (time.perf_counter() - t) * 1000

    total_ms = (time.perf_counter() - t0) * 1000
    now = datetime.now(timezone.utc)

    return InferenceResult(
        id=str(uuid.uuid4()),
        station=station,
        created_at=now,
        route_class=decision.route_class,
        branch=decision.branch,
        features=LightingFeatures(
            l_mean=feats.l_mean,
            r_dark=feats.r_dark,
            r_sat=feats.r_sat,
            l_std=feats.l_std,
            a_glare=feats.a_glare,
        ),
        count=count_result.count,
        count_rounded=int(round(count_result.count)),
        timing=TimingBreakdown(
            feature_ms=round(feature_ms, 2),
            route_ms=round(route_ms, 2),
            preprocess_ms=round(preprocess_ms, 2),
            count_ms=round(count_ms, 2),
            total_ms=round(total_ms, 2),
        ),
        original_image=_image_to_data_url(image.convert("RGB")),
        corrected_image=_image_to_data_url(corrected),
        density_overlay=_image_to_data_url(overlay),
        mock=True,
        note=f"{decision.reason}；密度计数为框架占位，待 MobileCount ONNX 接入。",
    )
