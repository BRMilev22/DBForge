## DBForge Python Examples (FastAPI)

Four small full-stack demos, one per database type, mirroring the JS/TS examples:

- `mysql-fastapi-notes` – note-taking UI backed by a MySQL table.
- `postgres-fastapi-tasks` – task list with toggle + delete on PostgreSQL.
- `mongo-fastapi-catalog` – product catalog CRUD on MongoDB.
- `redis-fastapi-queue` – enqueue/consume queue using Redis lists.

Each example:
- uses **FastAPI** + **dbforge-framework** for DB access.
- serves a minimal HTML frontend at `/`.
- reads connection settings from `.env` (see each `.env.example`).

### Quick start (any example)

```bash
cd examples-py/<example-folder>
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optional: edit with your DBForge instance values
# or: cp .env.example .env.local (the app loads both .env and .env.local)
uvicorn main:app --reload --port 8800
```

Then open `http://localhost:8800` to use the UI.

### Notes

- The MySQL example ships with the provided DBForge instance credentials prefilled in `.env.example` so it runs immediately against `mysql_test1`.
- The other examples include placeholders—fill in your DBForge host/port/user/pass/db before running.
- Each backend also exposes JSON APIs under `/api/*` if you want to test with `curl` or Postman.
