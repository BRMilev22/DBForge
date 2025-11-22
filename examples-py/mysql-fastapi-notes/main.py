"""
DBForge MySQL Notes Demo (FastAPI)

Small full-stack example:
- FastAPI backend using dbforge-framework to connect to a MySQL instance.
- Serves a tiny HTML frontend (see ./static/index.html).
- Provides CRUD for notes to showcase select/insert/update/delete helpers.
"""

import os
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from datetime import datetime
from pydantic import BaseModel

from dbforge_framework import DbForgeClient


BASE_DIR = Path(__file__).resolve().parent


def load_env(env_path: Path) -> None:
  """Minimal .env loader to avoid extra dependencies."""
  if not env_path.exists():
    return
  for line in env_path.read_text().splitlines():
    striped = line.strip()
    if not striped or striped.startswith("#") or "=" not in striped:
      continue
    key, value = striped.split("=", 1)
    os.environ.setdefault(key.strip(), value.strip())


# Load .env and .env.local if present so users can choose either.
for env_file in (".env", ".env.local"):
  load_env(BASE_DIR / env_file)


DB_CONFIG = {
  "db_type": "mysql",
  "host": os.getenv("DBFORGE_MYSQL_HOST", "79.100.101.80"),
  "port": int(os.getenv("DBFORGE_MYSQL_PORT", "10010")),
  "username": os.getenv("DBFORGE_MYSQL_USERNAME", "mysql-test1"),
  "password": os.getenv("DBFORGE_MYSQL_PASSWORD", "mysql-test1"),
  "database": os.getenv("DBFORGE_MYSQL_DATABASE", "mysql_test1"),
}

TABLE_NAME = "dbforge_notes"


def get_client() -> DbForgeClient:
  return DbForgeClient.from_credentials(**DB_CONFIG)


def ensure_schema() -> None:
  create_sql = f"""
  CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  """
  try:
    with get_client() as client:
      client.query(create_sql)
  except Exception as exc:
    # Avoid crashing the app on startup when DB is unreachable.
    print(f"[dbforge] ensure_schema skipped: {exc}")


class NoteIn(BaseModel):
  title: str
  body: str


class Note(NoteIn):
  id: int
  created_at: datetime


app = FastAPI(title="DBForge MySQL Notes Demo")


@app.on_event("startup")
def _setup() -> None:
  ensure_schema()


@app.get("/api/health")
def health() -> dict:
  return {"status": "ok"}


@app.get("/api/notes", response_model=List[Note])
def list_notes() -> List[Note]:
  try:
    with get_client() as client:
      rows = client.select(TABLE_NAME, order_by="id DESC", limit=50)
    return rows
  except Exception as exc:
    raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc


@app.post("/api/notes", response_model=Note)
def create_note(payload: NoteIn) -> Note:
  try:
    with get_client() as client:
      client.insert(TABLE_NAME, {"title": payload.title, "body": payload.body})
      created = client.select(TABLE_NAME, where={"title": payload.title}, order_by="id DESC", limit=1)
    if not created:
      raise HTTPException(status_code=500, detail="Insert failed")
    return created[0]
  except HTTPException:
    raise
  except Exception as exc:
    raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc


@app.delete("/api/notes/{note_id}")
def delete_note(note_id: int) -> dict:
  try:
    with get_client() as client:
      deleted = client.delete(TABLE_NAME, {"id": note_id})
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
