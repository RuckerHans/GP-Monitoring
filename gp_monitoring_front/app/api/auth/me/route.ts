import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { TOKEN_COOKIE, USER_COOKIE, clearAuthCookies, isTokenExpired } from "@/lib/api";

export async function GET() {
  const token = cookies().get(TOKEN_COOKIE)?.value;
  const value = cookies().get(USER_COOKIE)?.value;

  if (!token || isTokenExpired(token) || !value) {
    const response = NextResponse.json({ user: null }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  try {
    return NextResponse.json({ user: JSON.parse(value) });
  } catch {
    const response = NextResponse.json({ user: null }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }
}
