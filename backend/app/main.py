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

from backend.app.api.routes import router

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

app.include_router(router, prefix="/api")

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
