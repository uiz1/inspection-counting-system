from __future__ import annotations

import io
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import Response
from PIL import Image

from backend.app.schemas.inference import HealthResponse, InferenceResult, LedgerEntry
from backend.app.services import ledger as ledger_service
from backend.app.services.pipeline import run_inference

router = APIRouter()
UPLOAD_DIR = Path(__file__).resolve().parents[3] / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="光巡计数 API",
        version="0.1.0",
        mode="framework-mock",
    )


@router.post("/infer", response_model=InferenceResult)
async def infer(
    file: UploadFile = File(...),
    station: str = Form("工位-A"),
    save_ledger: bool = Form(True),
) -> InferenceResult:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="请上传图片文件")

    raw = await file.read()
    if len(raw) > 12 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="图片过大（限制 12MB）")

    try:
        image = Image.open(io.BytesIO(raw))
        image.load()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"无法解析图片: {exc}") from exc

    filename = file.filename or "upload.jpg"
    safe_name = Path(filename).name
    (UPLOAD_DIR / safe_name).write_bytes(raw)

    result = run_inference(image, station=station or "工位-A", filename=safe_name)
    if save_ledger:
        ledger_service.append_from_result(result, filename=safe_name)
    return result


@router.get("/ledger", response_model=list[LedgerEntry])
def get_ledger(limit: int = Query(100, ge=1, le=500)) -> list[LedgerEntry]:
    return ledger_service.list_entries(limit)


@router.delete("/ledger")
def clear_ledger() -> dict[str, str]:
    ledger_service.clear_entries()
    return {"status": "cleared"}


@router.get("/ledger/export")
def export_ledger(fmt: str = Query("xlsx", pattern="^(xlsx|csv)$")) -> Response:
    if fmt == "csv":
        data = ledger_service.export_csv()
        return Response(
            content=data,
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": "attachment; filename=inspection-ledger.csv"},
        )
    data = ledger_service.export_xlsx()
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=inspection-ledger.xlsx"},
    )
