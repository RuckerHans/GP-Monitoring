import { NextResponse } from "next/server";
import { LoginResponse } from "@/lib/types";
import { errorResponse, getTokenMaxAge, requestGpApi, TOKEN_COOKIE, USER_COOKIE } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await requestGpApi<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    });

    const response = NextResponse.json({
      message: result.message,
      user: result.user
    });
    const maxAge = getTokenMaxAge(result.accessToken);

    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.GP_COOKIE_SECURE === "true",
      path: "/",
      ...(typeof maxAge === "number" ? { maxAge } : {})
    };

    response.cookies.set(TOKEN_COOKIE, result.accessToken, cookieOptions);
    response.cookies.set(USER_COOKIE, JSON.stringify(result.user), cookieOptions);

    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
