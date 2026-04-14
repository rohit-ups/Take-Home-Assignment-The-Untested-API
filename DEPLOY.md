# Quick Deploy Guide

## Option A: Render (recommended)

1. Push this repository to your own GitHub fork.
2. In Render, choose **New +** -> **Blueprint**.
3. Select your forked repository.
4. Render will detect `render.yaml` and create the service automatically.
5. Wait for deploy to finish and copy the generated live URL.

Health check endpoint:
- `/tasks`

## Option B: Railway

1. Push this repository to your own GitHub fork.
2. In Railway, click **New Project** -> **Deploy from GitHub Repo**.
3. Select your forked repository.
4. Railway will use `railway.json` for build/start commands.
5. After deploy, open the generated public domain and verify `/tasks`.

## Verify deployment

Run these checks on your live URL:

1. `GET /tasks` returns 200
2. `GET /tasks/stats` returns 200
3. `POST /tasks` creates a task
4. `PATCH /tasks/:id/assign` works for valid payload

## Suggested live-link smoke test commands

Replace `<LIVE_URL>` with your deployed URL.

- `curl <LIVE_URL>/tasks`
- `curl <LIVE_URL>/tasks/stats`
- `curl -X POST <LIVE_URL>/tasks -H "Content-Type: application/json" -d "{\"title\":\"Live test\"}"`
