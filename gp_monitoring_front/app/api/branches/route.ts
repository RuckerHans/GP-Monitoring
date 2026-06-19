import { NextResponse } from "next/server";
import {
  errorResponse,
  getToken,
  isTokenExpired,
  requestGpApi,
  unauthorizedResponse
} from "@/lib/api";
import { Branch } from "@/lib/types";

export async function GET() {
  const token = getToken();

  if (!token || isTokenExpired(token)) {
    return unauthorizedResponse();
  }

  try {
    const branches = await requestGpApi<Branch[]>("/branches", undefined, token);

    return NextResponse.json(branches);
  } catch (error) {
    return errorResponse(error);
  }
}
