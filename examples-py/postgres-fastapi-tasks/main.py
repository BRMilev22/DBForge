"""
DBForge PostgreSQL Tasks Demo (FastAPI)

Small full-stack example:
- FastAPI backend using dbforge-framework to connect to a PostgreSQL instance.
- Serves a tiny HTML frontend (see ./static/index.html).
- Provides CRUD for tasks to showcase select/insert/update/delete helpers.
"""

import os
from pathlib import Path
from typing import List, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from pydantic import BaseModel

from dbforge_framework import DbForgeClient


BASE_DIR = Path(__file__).resolve().parent


def load_env(env_path: Path) -> None:
  if not env_path.exists():
    return
  for line in env_path.read_text().splitlines():
    striped = line.strip()
    if not striped or striped.startswith("#") or "=" not in striped:
      continue
    key, value = striped.split("=", 1)
    os.environ.setdefault(key.strip(), value.strip())


# Load .env and .env.local if present
for env_file in (".env", ".env.local"):
  load_env(BASE_DIR / env_file)


DB_CONFIG = {
  "db_type": "postgresql",
  "host": os.getenv("DBFORGE_PG_HOST", "localhost"),
  "port": int(os.getenv("DBFORGE_PG_PORT", "5432")),
  "username": os.getenv("DBFORGE_PG_USERNAME", "postgres"),
  "password": os.getenv("DBFORGE_PG_PASSWORD", "postgres"),
  "database": os.getenv("DBFORGE_PG_DATABASE", "postgres"),
}

TABLE_NAME = "dbforge_tasks"
STATUS_COLUMN = "completed"  # use existing column name if table already seeded elsewhere


def get_client() -> DbForgeClient:
  return DbForgeClient.from_credentials(**DB_CONFIG)


def ensure_schema() -> None:
  create_sql = f"""
  CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
    id SERIAL PRIMARY KEY,
    title VARCHAR(140) NOT NULL,
    {STATUS_COLUMN} BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  """
  try:
    with get_client() as client:
      client.query(create_sql)
  except Exception as exc:
    # Avoid crashing the app on startup if the DB isn't reachable.
    print(f"[dbforge] ensure_schema skipped: {exc}")


class TaskIn(BaseModel):
  title: str


class Task(TaskIn):
  id: int
  done: bool
  created_at: datetime


def normalize_task(row: Dict[str, Any]) -> Dict[str, Any]:
  return {
    "id": row["id"],
    "title": row["title"],
    "done": bool(row.get("done", row.get(STATUS_COLUMN, False))),
    "created_at": row["created_at"],
  }


app = FastAPI(title="DBForge PostgreSQL Tasks Demo")


@app.on_event("startup")
def _setup() -> None:
  ensure_schema()


@app.get("/api/health")
def health() -> dict:
  return {"status": "ok"}


@app.get("/api/tasks", response_model=List[Task])
def list_tasks() -> List[Task]:
  try:
    with get_client() as client:
      rows = client.select(TABLE_NAME, order_by="id DESC", limit=50)
    return [normalize_task(row) for row in rows]
  except Exception as exc:
    raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc


@app.post("/api/tasks", response_model=Task)
def create_task(payload: TaskIn) -> Task:
  try:
    with get_client() as client:
      client.insert(TABLE_NAME, {"title": payload.title})
      created = client.select(TABLE_NAME, where={"title": payload.title}, order_by="id DESC", limit=1)
    if not created:
      raise HTTPException(status_code=500, detail="Insert failed")
    return normalize_task(created[0])
  except HTTPException:
    raise
  except Exception as exc:
    raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc


@app.post("/api/tasks/{task_id}/toggle", response_model=Task)
def toggle_task(task_id: int) -> Task:
  try:
    with get_client() as client:
      existing = client.select(TABLE_NAME, where={"id": task_id})
      if not existing:
        raise HTTPException(status_code=404, detail="Task not found")
      new_state = not bool(existing[0].get("done", existing[0].get(STATUS_COLUMN, False)))
      client.update(TABLE_NAME, {STATUS_COLUMN: new_state}, {"id": task_id})
      updated = client.select(TABLE_NAME, where={"id": task_id})
    return normalize_task(updated[0])
  except HTTPException:
    raise
  except Exception as exc:
    raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int) -> dict:
  try:
    with get_client() as client:
      deleted = client.delete(TABLE_NAME, {"id": task_id})
    return {"deleted": deleted}
  except Exception as exc:
    raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc


def _read_index_html() -> str:
  html_path = BASE_DIR / "static" / "index.html"
  return html_path.read_text(encoding="utf-8")


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
  return HTMLResponse(content=_read_index_html())


app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
