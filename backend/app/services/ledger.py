"""台账存储与导出。"""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from pathlib import Path

from openpyxl import Workbook

from backend.app.schemas.inference import InferenceResult, LedgerEntry

ROOT = Path(__file__).resolve().parents[3]
LEDGER_DIR = ROOT / "data" / "ledger"
LEDGER_JSON = LEDGER_DIR / "entries.json"


def _ensure() -> None:
    LEDGER_DIR.mkdir(parents=True, exist_ok=True)
    if not LEDGER_JSON.exists():
        LEDGER_JSON.write_text("[]", encoding="utf-8")


def _load() -> list[dict]:
    _ensure()
    return json.loads(LEDGER_JSON.read_text(encoding="utf-8"))


def _save(rows: list[dict]) -> None:
    _ensure()
    LEDGER_JSON.write_text(json.dumps(rows, ensure_ascii=False, indent=2, default=str), encoding="utf-8")


def append_from_result(result: InferenceResult, filename: str) -> LedgerEntry:
    entry = LedgerEntry(
        id=result.id,
        station=result.station,
        created_at=result.created_at,
        route_class=result.route_class,
        branch=result.branch,
        count=result.count,
        count_rounded=result.count_rounded,
        total_ms=result.timing.total_ms,
        filename=filename,
    )
    rows = _load()
    rows.insert(0, entry.model_dump(mode="json"))
    _save(rows[:500])
    return entry


def list_entries(limit: int = 100) -> list[LedgerEntry]:
    rows = _load()[:limit]
    return [LedgerEntry.model_validate(r) for r in rows]


def clear_entries() -> None:
    _save([])


def export_csv(entries: list[LedgerEntry] | None = None) -> bytes:
    rows = entries or list_entries(500)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id", "station", "created_at", "route_class", "branch", "count", "count_rounded", "total_ms", "filename"])
    for e in rows:
        writer.writerow(
            [
                e.id,
                e.station,
                e.created_at.isoformat() if isinstance(e.created_at, datetime) else e.created_at,
                e.route_class,
                e.branch,
                e.count,
                e.count_rounded,
                e.total_ms,
                e.filename,
            ]
        )
    return buf.getvalue().encode("utf-8-sig")


def export_xlsx(entries: list[LedgerEntry] | None = None) -> bytes:
    rows = entries or list_entries(500)
    wb = Workbook()
    ws = wb.active
    ws.title = "巡检计数台账"
    ws.append(["ID", "工位", "时间", "光照类别", "预处理分支", "计数值", "取整", "总耗时(ms)", "文件名"])
    for e in rows:
        ws.append(
            [
                e.id,
                e.station,
                e.created_at.isoformat() if isinstance(e.created_at, datetime) else str(e.created_at),
                e.route_class,
                e.branch,
                e.count,
                e.count_rounded,
                e.total_ms,
                e.filename,
            ]
        )
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()
