"""轻量密度图回归占位实现。

正式阶段将替换为 MobileCount（≤1M 参数）ONNX 推理。
框架阶段用局部对比度响应生成伪密度图，保证前后端可联调演示。
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from PIL import Image, ImageFilter


@dataclass(frozen=True)
class CountResult:
    count: float
    density: np.ndarray  # HxW float32
    mock: bool = True


def estimate_count_with_density(image: Image.Image) -> CountResult:
    gray = image.convert("L")
    # 缩小推理分辨率，模拟边缘端轻量输入
    work = gray.copy()
    work.thumbnail((320, 240), Image.Resampling.BILINEAR)
    arr = np.asarray(work, dtype=np.float32) / 255.0

    blur = np.asarray(work.filter(ImageFilter.GaussianBlur(radius=1.2)), dtype=np.float32) / 255.0
    detail = np.abs(arr - blur)
    # 边缘/纹理响应作为伪密度
    density = np.clip(detail * 6.5, 0.0, 1.0)
    density = density ** 1.35

    # 积分计数（标定系数，仅用于演示量级）
    raw = float(density.sum())
    count = max(0.0, raw * 0.045)

    # 还原到原图尺寸热力叠加用
    dens_img = Image.fromarray((density * 255.0).astype(np.uint8), mode="L")
    dens_img = dens_img.resize(image.size, Image.Resampling.BILINEAR)
    density_full = np.asarray(dens_img, dtype=np.float32) / 255.0

    return CountResult(count=round(count, 2), density=density_full, mock=True)


def overlay_density(image: Image.Image, density: np.ndarray, alpha: float = 0.45) -> Image.Image:
    """将密度图以热力伪彩叠加到原图。"""
    base = np.asarray(image.convert("RGB"), dtype=np.float32)
    d = np.clip(density, 0.0, 1.0)
    if d.shape[:2] != base.shape[:2]:
        d_img = Image.fromarray((d * 255).astype(np.uint8)).resize(
            (base.shape[1], base.shape[0]), Image.Resampling.BILINEAR
        )
        d = np.asarray(d_img, dtype=np.float32) / 255.0

    # 简易 turbo-ish：蓝 → 青 → 黄 → 红
    r = np.clip(1.5 * d - 0.2, 0, 1)
    g = np.clip(1.5 * (1 - np.abs(d - 0.55) * 1.6), 0, 1)
    b = np.clip(1.2 * (1 - d) - 0.1, 0, 1)
    heat = np.stack([r, g, b], axis=-1) * 255.0

    mask = (d > 0.08).astype(np.float32)[..., None] * alpha
    out = base * (1 - mask) + heat * mask
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), mode="RGB")
