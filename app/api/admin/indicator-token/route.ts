import { NextRequest, NextResponse } from "next/server";
import { encryptIndicatorId, decryptIndicatorId } from "@/lib/indicator-url-token";

// POST /api/admin/indicator-token
// Encrypts a plain indicator ID into an opaque URL token (server-side only).
// Body: { indicatorId: string }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const indicatorId: string | undefined = body?.indicatorId;
    if (!indicatorId || typeof indicatorId !== "string") {
      return NextResponse.json({ success: false, error: "indicatorId required" }, { status: 400 });
    }
    const token = encryptIndicatorId(indicatorId);
    return NextResponse.json({ success: true, token });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to encrypt indicator token" }, { status: 500 });
  }
}

// GET /api/admin/indicator-token?token=<encrypted>
// Resolves an encrypted chart URL token back to the internal ID used by the
// existing indicator list. The ID is returned only to the page logic, never
// placed in the browser URL.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ success: false, error: "Token required" }, { status: 400 });
  }

  try {
    const indicatorId = decryptIndicatorId(token);
    return NextResponse.json({ success: true, indicatorId });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid indicator token" }, { status: 400 });
  }
}
