from __future__ import annotations

from fastapi import APIRouter

from backend.app.schemas.envelope import ok

router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health() -> dict:
    """契约 §5.1 / §7.1 HealthInfo，统一信封。"""
    return ok(
        {
            "status": "ok",
            "service": "光巡计数 API",
            "version": "0.1.0",
            "mode": "mock",
            "robot_online": False,
        }
    )
