"""
DBForge MongoDB Catalog Demo (FastAPI)

Small full-stack example:
- FastAPI backend using dbforge-framework to connect to a MongoDB instance.
- Serves a tiny HTML frontend (see ./static/index.html).
- Provides CRUD for a simple product catalog.
"""

import os
from pathlib import Path
from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from dbforge_framework import DbForgeClient
from bson import ObjectId


BASE_DIR = Path(__file__).resolve().parent
COLLECTION = "catalog_items"


def load_env(env_path: Path) -> None:
  if not env_path.exists():
    return
  for line in env_path.read_text().splitlines():
    striped = line.strip()
    if not striped or striped.startswith("#") or "=" not in striped:
      continue
    key, value = striped.split("=", 1)
    os.environ.setdefault(key.strip(), value.strip())


# Load .env and .env.local (prefers existing vars so local wins if exported)
for env_file in (".env", ".env.local"):
  load_env(BASE_DIR / env_file)


DB_CONFIG = {
  "db_type": "mongodb",
  "host": os.getenv("DBFORGE_MONGO_HOST", "localhost"),
  "port": int(os.getenv("DBFORGE_MONGO_PORT", "27017")),
  "username": os.getenv("DBFORGE_MONGO_USERNAME", ""),
  "password": os.getenv("DBFORGE_MONGO_PASSWORD", ""),
  "database": os.getenv("DBFORGE_MONGO_DATABASE", "admin"),
  "authSource": os.getenv("DBFORGE_MONGO_AUTHSOURCE", "admin"),
}


def get_client() -> DbForgeClient:
  return DbForgeClient.from_credentials(**DB_CONFIG)


def normalize(doc: dict) -> dict:
  doc = {**doc}
  if "_id" in doc:
    doc["id"] = str(doc.pop("_id"))
  return doc


class ItemIn(BaseModel):
  name: str
  price: float
  tags: List[str] = []


class Item(ItemIn):
  id: str


app = FastAPI(title="DBForge MongoDB Catalog Demo")


@app.get("/api/health")
def health() -> dict:
  return {"status": "ok"}


@app.get("/api/items", response_model=List[Item])
def list_items() -> List[Item]:
  try:
    with get_client() as client:
      rows = client.select(COLLECTION, where={})
    return [normalize(r) for r in rows]
  except Exception as exc:
    raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc


@app.post("/api/items", response_model=Item)
def create_item(payload: ItemIn) -> Item:
  try:
    with get_client() as client:
      inserted_id = client.insert(COLLECTION, payload.model_dump())
      oid = ObjectId(str(inserted_id))
      created = client.select(COLLECTION, where={"_id": oid}, limit=1)
    if not created:
      raise HTTPException(status_code=500, detail="Insert failed")
    return normalize(created[0])
  except HTTPException:
    raise
  except Exception as exc:
    raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc


@app.delete("/api/items/{item_id}")
def delete_item(item_id: str) -> dict:
  try:
    with get_client() as client:
      try:
        oid = ObjectId(item_id)
      except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")
      deleted = client.delete(COLLECTION, {"_id": oid})
    return {"deleted": deleted}
  except HTTPException:
    raise
  except Exception as exc:
    raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}") from exc


def _read_index_html() -> str:
  html_path = BASE_DIR / "static" / "index.html"
  return html_path.read_text(encoding="utf-8")


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
  return HTMLResponse(content=_read_index_html())


app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
