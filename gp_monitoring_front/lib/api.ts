import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const TOKEN_COOKIE = "gp_monitoring_token";
export const USER_COOKIE = "gp_monitoring_user";

const API_BASE_URL = process.env.GP_API_BASE_URL ?? "http://localhost:3000";
const API_KEY = process.env.GP_API_KEY;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export async function requestGpApi<T>(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<T> {
  if (!API_KEY) {
    throw new ApiError("GP_API_KEY is not configured for the frontend.", 500);
  }

  const headers = new Headers(init.headers);
  headers.set("x-api-key", API_KEY);

  if (!headers.has("content-type") && init.body) {
    headers.set("content-type", "application/json");
  }

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  const data = await readJson(response);

  if (!response.ok) {
    throw new ApiError(resolveMessage(data, response.statusText), response.status);
  }

  return data as T;
}

export function getToken(): string | undefined {
  return cookies().get(TOKEN_COOKIE)?.value;
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }

  return atob(padded);
}

export function parseJwtPayload(token: string): { exp?: number } | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = decodeBase64Url(parts[1]);
    return JSON.parse(payload) as { exp?: number };
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token);

  if (!payload || typeof payload.exp !== "number") {
    return true;
  }

  return payload.exp * 1000 <= Date.now();
}

export function getTokenMaxAge(token: string): number | undefined {
  const payload = parseJwtPayload(token);

  if (!payload || typeof payload.exp !== "number") {
    return undefined;
  }

  const secondsUntilExpiry = Math.floor((payload.exp * 1000 - Date.now()) / 1000);

  return secondsUntilExpiry > 0 ? secondsUntilExpiry : 0;
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(TOKEN_COOKIE);
  response.cookies.delete(USER_COOKIE);
}

export function unauthorizedResponse() {
  const response = NextResponse.json({ message: "Authentication required." }, { status: 401 });
  clearAuthCookies(response);
  return response;
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) {
    const response = NextResponse.json({ message: error.message }, { status: error.status });

    if (error.status === 401) {
      clearAuthCookies(response);
    }

    return response;
  }

  return NextResponse.json(
    { message: "Something went wrong while contacting GP Monitoring API." },
    { status: 500 }
  );
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function resolveMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data && "message" in data) {
    const message = (data as { message: unknown }).message;
    return Array.isArray(message) ? message.join(", ") : String(message);
  }

  return fallback || "Request failed.";
}
