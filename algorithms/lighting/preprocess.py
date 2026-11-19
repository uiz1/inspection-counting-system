"""三分支预处理。框架阶段用可运行近似；后续可替换为正式 Zero-DCE++ / 高光抑制网络。"""

from __future__ import annotations

from typing import Literal

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

BranchName = Literal["identity", "zero_dce_pp", "specular_clahe"]


def apply_branch(image: Image.Image, branch: BranchName) -> Image.Image:
    rgb = image.convert("RGB")
    if branch == "identity":
        return rgb.copy()
    if branch == "zero_dce_pp":
        return _approx_zero_dce(rgb)
    if branch == "specular_clahe":
        return _specular_suppress_clahe(rgb)
    raise ValueError(f"unknown branch: {branch}")


def _approx_zero_dce(image: Image.Image) -> Image.Image:
    """暗光增强近似：曲线拉伸 + 轻度对比度，保持几何尺寸不变。"""
    arr = np.asarray(image, dtype=np.float32) / 255.0
    # 类似 DCE 的逐级曲线：x + x*(1-x)*alpha
    enhanced = arr
    for alpha in (0.55, 0.35, 0.2):
        enhanced = enhanced + enhanced * (1.0 - enhanced) * alpha
    enhanced = np.clip(enhanced, 0.0, 1.0)
    out = Image.fromarray((enhanced * 255.0).astype(np.uint8), mode="RGB")
    return ImageEnhance.Contrast(out).enhance(1.08)


def _specular_suppress_clahe(image: Image.Image) -> Image.Image:
    """高光掩膜软衰减 + L 通道 CLAHE 近似。"""
    rgb = np.asarray(image, dtype=np.float32) / 255.0
    maxc = rgb.max(axis=2)
    minc = rgb.min(axis=2)
    s = np.where(maxc == 0, 0.0, (maxc - minc) / (maxc + 1e-8))
    glare = ((maxc > 0.88) & (s < 0.22)).astype(np.float32)
    # 软衰减高光
    atten = 1.0 - 0.45 * glare
    suppressed = np.clip(rgb * atten[..., None], 0.0, 1.0)
    img = Image.fromarray((suppressed * 255.0).astype(np.uint8), mode="RGB")

    # LAB 上对 L 做自适应直方图均衡（Pillow 近似 CLAHE）
    lab = img.convert("LAB")
    l, a, b = lab.split()
    l_eq = ImageOps.equalize(l)
    # 与原 L 混合，避免过增强伪影
    l_blend = Image.blend(l, l_eq, 0.55)
    merged = Image.merge("LAB", (l_blend, a, b)).convert("RGB")
    return merged.filter(ImageFilter.UnsharpMask(radius=1.0, percent=40, threshold=2))
