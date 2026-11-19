"""异构光照动态路由：规则树（阈值可由验证集网格搜索标定）。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from .features import LightingFeatureVector

RouteClass = Literal["normal", "low", "high"]
BranchName = Literal["identity", "zero_dce_pp", "specular_clahe"]

BRANCH_MAP: dict[RouteClass, BranchName] = {
    "normal": "identity",
    "low": "zero_dce_pp",
    "high": "specular_clahe",
}


@dataclass(frozen=True)
class RouteDecision:
    route_class: RouteClass
    branch: BranchName
    reason: str


@dataclass(frozen=True)
class RouteThresholds:
    """离线标定得到的默认阈值（框架初值，后续用 MAE+时延搜索替换）。"""

    low_l_mean: float = 0.32
    low_r_dark: float = 0.28
    high_r_sat: float = 0.045
    high_a_glare: float = 0.02
    mixed_l_std: float = 0.22


def decide_route(
    features: LightingFeatureVector,
    thresholds: RouteThresholds | None = None,
) -> RouteDecision:
    th = thresholds or RouteThresholds()

    # 高光优先：强反光对密度回归破坏更大
    if features.r_sat >= th.high_r_sat or features.a_glare >= th.high_a_glare:
        return RouteDecision(
            route_class="high",
            branch=BRANCH_MAP["high"],
            reason="高光饱和像素或眩光连通域超阈值 → 高光抑制+CLAHE",
        )

    if features.l_mean <= th.low_l_mean or features.r_dark >= th.low_r_dark:
        return RouteDecision(
            route_class="low",
            branch=BRANCH_MAP["low"],
            reason="全局偏暗或暗部占比过高 → Zero-DCE++ 暗光增强",
        )

    # 高对比混合场景：暂按 normal 直通，后续可做分块路由消融
    if features.l_std >= th.mixed_l_std:
        return RouteDecision(
            route_class="normal",
            branch=BRANCH_MAP["normal"],
            reason="亮度方差偏高但未触发高低阈值 → 直通（混合场景消融入口）",
        )

    return RouteDecision(
        route_class="normal",
        branch=BRANCH_MAP["normal"],
        reason="光照特征落在正常区间 → 直通",
    )
