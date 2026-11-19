"""光照特征提取（5 维轻量特征）。"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from PIL import Image


@dataclass(frozen=True)
class LightingFeatureVector:
    l_mean: float
    r_dark: float
    r_sat: float
    l_std: float
    a_glare: float


def _to_hsv_arrays(image: Image.Image) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    v = maxc
    s = np.where(maxc == 0, 0.0, (maxc - minc) / (maxc + 1e-8))
    return s, v, (0.299 * r + 0.587 * g + 0.114 * b)


def _max_glare_area_ratio(mask: np.ndarray) -> float:
    """简易 4-连通域扫描，返回最大连通域面积占比。"""
    h, w = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    best = 0
    total = h * w

    for y in range(h):
        for x in range(w):
            if not mask[y, x] or visited[y, x]:
                continue
            stack = [(y, x)]
            visited[y, x] = True
            area = 0
            while stack:
                cy, cx = stack.pop()
                area += 1
                for ny, nx in (
                    (cy - 1, cx),
                    (cy + 1, cx),
                    (cy, cx - 1),
                    (cy, cx + 1),
                ):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        stack.append((ny, nx))
            best = max(best, area)
    return float(best / total) if total else 0.0


def extract_lighting_features(
    image: Image.Image,
    *,
    dark_thresh: float = 0.18,
    hi_thresh: float = 0.88,
    sat_low: float = 0.22,
) -> LightingFeatureVector:
    """提取全局平均亮度、暗部比、高光比、亮度标准差、高光连通域面积比。"""
    # 全局统计用中等分辨率；连通域再用更粗网格，保证边缘端时延
    work = image.copy()
    work.thumbnail((512, 512), Image.Resampling.BILINEAR)
    s, v, luma = _to_hsv_arrays(work)
    l_mean = float(luma.mean())
    l_std = float(luma.std())
    r_dark = float((v < dark_thresh).mean())
    glare = (v > hi_thresh) & (s < sat_low)
    r_sat = float(glare.mean())

    glare_small = Image.fromarray((glare.astype(np.uint8) * 255)).resize(
        (128, 128), Image.Resampling.NEAREST
    )
    a_glare = _max_glare_area_ratio(np.asarray(glare_small) > 0)

    return LightingFeatureVector(
        l_mean=round(l_mean, 4),
        r_dark=round(r_dark, 4),
        r_sat=round(r_sat, 4),
        l_std=round(l_std, 4),
        a_glare=round(a_glare, 4),
    )
