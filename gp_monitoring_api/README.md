# GP Monitoring API

Backend API service for the GP Monitoring system.

## Overview

This NestJS service exposes authenticated endpoints for branch lookup, daily GP analysis, and session-based authentication. It is designed for use with the `gp_monitoring_front` Next.js frontend and protects backend routes with a shared API key plus JWT session validation.

## Architecture

- `src/app.module.ts` – application bootstrap and module composition.
- `src/auth/` – login, logout, JWT issuance, and `/auth/me` session handling.
- `src/branches/` – branch directory endpoint.
- `src/gp-analysis/` – daily GP analysis endpoint.
- `src/common/guards/` – `ApiKeyGuard` and `JwtAuthGuard` for route protection.
- `src/config/app.config.ts` – environment-driven configuration.
- `src/database/` – database connection modules and query managers.

## Tech stack

- Node.js + TypeScript
- NestJS 11
- `@nestjs/platform-express`
- `@nestjs/jwt`
- `express-session`
- `mysql2` for MySQL connectivity
- `mssql` for SQL Server connectivity
- `dotenv` for environment configuration

## Key features

- API key validation for trusted backend calls
- Session-based authentication with JWT and HTTP-only cookies
- Multi-database support: MySQL for application data and MSSQL for GP analysis data
- Modular controller/service architecture for auth, branches, and analysis
- Configurable CORS origins via `CORS_ORIGINS`

## Environment variables

Create a `.env` file in `gp_monitoring_api/` before running the service.

Required variables:

- `API_KEY`
- `JWT_SECRET`
- `SESSION_SECRET`
- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `MYSQL_PORT` (default: `3306`)
- `MSSQL_HOST`
- `MSSQL_AUTH_TYPE` (`sql` by default; use `ntlm` for a Windows/domain account)
- `MSSQL_USER`
- `MSSQL_PASSWORD`
- `MSSQL_DATABASE`
- `MSSQL_PORT` (default: `1433`)
- `MSSQL_DOMAIN` (required only when `MSSQL_AUTH_TYPE=ntlm`)
- `GP_ANALYSIS_TABLE` (default: `dbo.gp_analysis_header_by_category_daily`)

Optional variables:

- `JWT_EXPIRES_IN` (default: `8h`)
- `CORS_ORIGINS`

The Node `mssql` package is the equivalent of PHP's `sqlsrv`/`pdo_sqlsrv`
connection layer. For a SQL Server login, keep `MSSQL_AUTH_TYPE=sql`. If the
credentials belong to a Windows/domain account, use `MSSQL_AUTH_TYPE=ntlm` and
set `MSSQL_DOMAIN`. An `ELOGIN` response means SQL Server was reached but
rejected the selected account or its access.

## Setup

```bash
cd gp_monitoring_api
npm install
```

## Run

```bash
npm run start:dev
```

By default the service listens on `http://localhost:3000`.

## Tests

```bash
npm run test
npm run test:e2e
npm run test:cov
```

## API endpoints

- `POST /auth/login` – authenticate and establish a session
- `POST /auth/logout` – clear the current auth session
- `GET /auth/me` – return the signed-in user
- `GET /branches` – fetch branch directory data
- `GET /gp-analysis/daily` – fetch GP analysis data by date

## Notes

- The frontend uses `GP_API_BASE_URL` and `GP_API_KEY` to proxy requests through Next.js route handlers.
- Protected backend routes require the shared `API_KEY` provided in `x-api-key` headers.
- `express-session` uses in-memory session storage by default and should be replaced with a persistent store in production.
