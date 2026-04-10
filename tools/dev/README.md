# Live Preview Workflow

This workflow belongs to `G0-01 Harness Execution Foundation`.

It keeps the frontend and backend running in the background on Windows so the browser can stay open while terminal windows can be closed after startup.

## Start

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File tools/dev/start_live_preview.ps1 -OpenBrowser
```

CMD:

```cmd
tools\dev\start_live_preview.cmd -OpenBrowser
```

Use `-Restart` if you want to replace an existing managed session.

## Stop

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File tools/dev/stop_live_preview.ps1
```

CMD:

```cmd
tools\dev\stop_live_preview.cmd
```

## Behavior

- Frontend runs on `http://127.0.0.1:3000` with Vite HMR.
- Backend runs on `http://127.0.0.1:8000`.
- The backend uses a lightweight supervisor that restarts plain `uvicorn` when watched files change, instead of relying on `uvicorn --reload`.
- Managed logs are written to `.runtime/logs`.
- Managed PID files are written to `.runtime/pids`.

## Backend Watch Scope

- `backend/app/**/*.py`
- `.env`
- `backend/.env`

## Runtime Requirement

The backend still depends on the configured PostgreSQL and Redis runtime described by the repo docs. If those services are unavailable, the health check will fail even though the preview scripts are correct.
