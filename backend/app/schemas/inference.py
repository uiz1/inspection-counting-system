from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

RouteClass = Literal["normal", "low", "high"]
BranchName = Literal["identity", "zero_dce_pp", "specular_clahe"]


class LightingFeatures(BaseModel):
    l_mean: float = Field(..., description="全局平均亮度 [0,1]")
    r_dark: float = Field(..., description="暗部像素占比")
    r_sat: float = Field(..., description="高光饱和像素占比")
    l_std: float = Field(..., description="亮度标准差")
    a_glare: float = Field(..., description="最大高光连通域面积比")


class TimingBreakdown(BaseModel):
    feature_ms: float
    route_ms: float
    preprocess_ms: float
    count_ms: float
    total_ms: float


class InferenceResult(BaseModel):
    id: str
    station: str
    created_at: datetime
    route_class: RouteClass
    branch: BranchName
    features: LightingFeatures
    count: float
    count_rounded: int
    timing: TimingBreakdown
    original_image: str
    corrected_image: str
    density_overlay: str
    mock: bool = True
    note: str = "当前为框架阶段 mock 推理；算法模块接入后将替换。"


class LedgerEntry(BaseModel):
    id: str
    station: str
    created_at: datetime
    route_class: RouteClass
    branch: BranchName
    count: float
    count_rounded: int
    total_ms: float
    filename: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    mode: str
