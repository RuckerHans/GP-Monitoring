# GP Monitoring Frontend

Frontend application for the GP Monitoring system.

## Overview

This Next.js frontend provides the user-facing dashboard for GP analysis and branch lookup. It proxies selected backend API calls through server-side route handlers and uses secure HTTP-only cookies for authentication.

## Architecture

- `app/page.tsx` – main dashboard entry point.
- `app/dashboard/page.tsx` – authenticated GP monitoring dashboard view.
- `app/api/` – Next.js route handlers that proxy backend API requests.
- `components/` – UI components and layout helpers.
- `lib/api.ts` – client helpers for calling internal API routes.
- `lib/store/` – Redux Toolkit store and slices for auth and API state.

## Tech stack

- Next.js 14
- React 18
- TypeScript
- Redux Toolkit
- `lucide-react` for icons
- Built-in Next.js App Router with server and client components

## Environment variables

Create `gp_monitoring_front/.env.local` with:

```bash
GP_API_BASE_URL=http://localhost:3000
GP_API_KEY=your-api-key
GP_COOKIE_SECURE=false
```

- `GP_API_BASE_URL` points to the backend API service.
- `GP_API_KEY` must match the backend `API_KEY`.
- `GP_COOKIE_SECURE=false` is for local development over HTTP.

> `GP_API_KEY` is used only by server-side Next.js route handlers and is not exposed to browser JavaScript because it is not prefixed with `NEXT_PUBLIC_`.

## Setup

```bash
cd gp_monitoring_front
npm install
```

## Run

```bash
npm run dev
```

Open `http://localhost:3010` in your browser.

## Authentication flow

- `POST /api/auth/login` proxies credentials to backend `POST /auth/login`.
- Backend returns a JWT/session cookie.
- `GET /api/auth/me` reads the authenticated user from the session cookie.
- `POST /api/auth/logout` clears the auth cookie.

## Proxy API routes

The frontend implements server-side proxy routes for the backend API:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/branches`
- `GET /api/gp-analysis/daily?date=YYYY-MM-DD`

## Notes

- Keep the frontend running on a different port than the backend to avoid port conflicts.
- The frontend uses `GP_API_BASE_URL` so the backend service can remain independent and deployable separately.
- Use `GP_COOKIE_SECURE=true` only when deploying the frontend over HTTPS.
