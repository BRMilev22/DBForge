"""
DBForge Redis Queue Demo (FastAPI)

Small full-stack example:
- FastAPI backend using dbforge-framework to connect to Redis.
- Serves a tiny HTML frontend (see ./static/index.html).
- Demonstrates LPUSH/LRANGE/RPOP via the helper methods.
"""

import os
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from dbforge_framework import DbForgeClient


BASE_DIR = Path(__file__).resolve().parent
QUEUE_KEY = "dbforge:queue:python"


def load_env(env_path: Path) -> None:
  if not env_path.exists():
    return
  for line in env_path.read_text().splitlines():
    striped = line.strip()
    if not striped or striped.startswith("#") or "=" not in striped:
      continue
    key, value = striped.split("=", 1)
    os.environ.setdefault(key.strip(), value.strip())


# Load .env and .env.local (local wins if set in shell)
for env_file in (".env", ".env.local"):
  load_env(BASE_DIR / env_file)


DB_CONFIG = {
  "db_type": "redis",
  "host": os.getenv("DBFORGE_REDIS_HOST", "localhost"),
  "port": int(os.getenv("DBFORGE_REDIS_PORT", "6379")),
  "password": os.getenv("DBFORGE_REDIS_PASSWORD", ""),
  "username": os.getenv("DBFORGE_REDIS_USERNAME", ""),
  "database": os.getenv("DBFORGE_REDIS_DB", "0"),
}


def get_client() -> DbForgeClient:
  return DbForgeClient.from_credentials(**DB_CONFIG)


class JobIn(BaseModel):
  payload: str


app = FastAPI(title="DBForge Redis Queue Demo")


@app.get("/api/health")
def health() -> dict:
  return {"status": "ok"}


@app.get("/api/jobs", response_model=List[str])
def list_jobs() -> List[str]:
  try:
    with get_client() as client:
      jobs = client.helpers.lrange(QUEUE_KEY, 0, -1)
    return jobs
  except Exception as exc:
    print(f"[dbforge][redis] list_jobs error: {exc}")
    raise HTTPException(status_code=503, detail=f"Redis unavailable: {exc}") from exc


@app.post("/api/jobs")
def enqueue(job: JobIn) -> dict:
  try:
    with get_client() as client:
      client.helpers.lpush(QUEUE_KEY, job.payload)
      jobs = client.helpers.lrange(QUEUE_KEY, 0, -1)
    return {"enqueued": job.payload, "count": len(jobs)}
  except Exception as exc:
    print(f"[dbforge][redis] enqueue error: {exc}")
    raise HTTPException(status_code=503, detail=f"Redis unavailable: {exc}") from exc


@app.post("/api/jobs/consume")
def consume() -> dict:
  try:
    with get_client() as client:
      job = client.connection.rpop(QUEUE_KEY)
    return {"job": job}
  except Exception as exc:
    print(f"[dbforge][redis] consume error: {exc}")
    raise HTTPException(status_code=503, detail=f"Redis unavailable: {exc}") from exc


@app.delete("/api/jobs")
def clear() -> dict:
  try:
    with get_client() as client:
      deleted = client.helpers.delete(QUEUE_KEY)
    return {"deleted": deleted}
  except Exception as exc:
    print(f"[dbforge][redis] clear error: {exc}")
    raise HTTPException(status_code=503, detail=f"Redis unavailable: {exc}") from exc


def _read_index_html() -> str:
  html_path = BASE_DIR / "static" / "index.html"
  return html_path.read_text(encoding="utf-8")


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
  return HTMLResponse(content=_read_index_html())


app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
