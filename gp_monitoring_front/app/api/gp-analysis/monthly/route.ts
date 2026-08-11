import { NextResponse } from "next/server";
import {
  errorResponse,
  getToken,
  isTokenExpired,
  requestGpApi,
  unauthorizedResponse
} from "@/lib/api";
import { MonthlyGpAnalysis } from "@/lib/types";

export async function GET(request: Request) {
  const token = getToken();

  if (!token || isTokenExpired(token)) {
    return unauthorizedResponse();
  }

  try {
    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    const path = `/gp-analysis/monthly${month ? `?month=${encodeURIComponent(month)}` : ""}`;
    const rows = await requestGpApi<MonthlyGpAnalysis[]>(path, undefined, token);

    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}
