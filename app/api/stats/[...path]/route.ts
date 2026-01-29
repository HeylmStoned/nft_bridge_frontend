import { NextRequest, NextResponse } from "next/server";

function getBackendBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
  if (!raw || typeof raw !== "string") return null;
  const base = raw.trim().replace(/\/+$/, "");
  return base || null;
}

const API_KEY = process.env.API_KEY;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const base = getBackendBase();
  if (!base) {
    return NextResponse.json(
      { error: "Stats API not configured (set API_BASE_URL or NEXT_PUBLIC_API_BASE_URL)" },
      { status: 503 },
    );
  }

  const { path } = await context.params;
  const pathSegment = path.length ? `/${path.join("/")}` : "";
  const url = new URL(`/api/stats${pathSegment}`, base);
  _request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  const headers: HeadersInit = {};
  if (API_KEY) headers["x-api-key"] = API_KEY;

  console.log("[stats proxy] target:", url.origin + url.pathname);

  try {
    const res = await fetch(url.toString(), {
      headers,
      next: { revalidate: 30 },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(
        `Stats API proxy: ${res.status} ${url.pathname}${url.search}`,
        typeof data?.error === "object" ? data.error?.message : data?.error ?? data
      );
    }
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("Stats proxy error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 502 },
    );
  }
}
