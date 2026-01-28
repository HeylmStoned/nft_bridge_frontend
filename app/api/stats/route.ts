import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;

export async function GET(_request: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      { error: "Stats API not configured" },
      { status: 503 },
    );
  }

  const url = new URL(`${BACKEND_URL}/api/stats`);
  _request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers: HeadersInit = {};
  if (API_KEY) headers["x-api-key"] = API_KEY;

  try {
    const res = await fetch(url.toString(), {
      headers,
      next: { revalidate: 30 },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Stats proxy error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 502 },
    );
  }
}
