import { NextResponse } from "next/server";
import {
  errorResponse,
  getToken,
  isTokenExpired,
  requestGpApi,
  unauthorizedResponse
} from "@/lib/api";
import { DailyGpAnalysis } from "@/lib/types";

export async function GET(request: Request) {
  const token = getToken();

  if (!token || isTokenExpired(token)) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const path = `/gp-analysis/daily${date ? `?date=${encodeURIComponent(date)}` : ""}`;
    const rows = await requestGpApi<DailyGpAnalysis[]>(path, undefined, token);

    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}
