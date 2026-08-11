import { NextResponse } from "next/server";
import {
  errorResponse,
  getToken,
  isTokenExpired,
  requestGpApi,
  unauthorizedResponse
} from "@/lib/api";
import { GpDataRange } from "@/lib/types";

export async function GET() {
  const token = getToken();

  if (!token || isTokenExpired(token)) {
    return unauthorizedResponse();
  }

  try {
    const range = await requestGpApi<GpDataRange>("/gp-analysis/data-range", undefined, token);

    return NextResponse.json(range);
  } catch (error) {
    return errorResponse(error);
  }
}
