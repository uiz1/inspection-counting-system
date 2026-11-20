from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from datetime import datetime, timezone

from fastapi import WebSocket, WebSocketDisconnect

from backend.app.api.routes import router
from backend.app.api.v1 import router as v1_router

app = FastAPI(
    title="光巡计数 API",
    description="基于光照自适应预处理的巡检机器人目标计数系统 — 推理与台账服务",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 迁移期双挂：旧 /api/* + 契约 /api/v1/*
app.include_router(router, prefix="/api")
app.include_router(v1_router)


@app.websocket("/ws/v1")
async def ws_v1(websocket: WebSocket) -> None:
    """契约 §6 唯一 WebSocket 端点（骨架：心跳 pong）。"""
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_json()
            event = raw.get("event")
            if event == "ping":
                await websocket.send_json(
                    {
                        "event": "pong",
                        "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                        "data": {},
                    }
                )
            elif event == "subscribe":
                await websocket.send_json(
                    {
                        "event": "robot.status",
                        "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                        "data": {
                            "online": False,
                            "mode": "idle",
                            "battery": None,
                            "message": "WS skeleton · waiting for robot bridge",
                        },
                    }
                )
    except WebSocketDisconnect:
        return

FRONTEND_DIST = ROOT / "frontend" / "dist"


@app.get("/api")
def api_root() -> dict[str, str]:
    return {
        "service": "光巡计数",
        "docs": "/docs",
        "health": "/api/health",
    }


if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
else:

    @app.get("/")
    def root() -> JSONResponse:
        return JSONResponse(
            {
                "service": "光巡计数",
                "message": "前端未构建。开发请启动 frontend Vite，或先执行 npm run build。",
                "docs": "/docs",
                "health": "/api/health",
            }
        )
