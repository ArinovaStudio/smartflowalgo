import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/indicators/[id]/versions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.userType === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const versions = await prisma.indicatorVersion.findMany({
      where: { indicatorId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: versions });
  } catch (error: any) {
    console.error("GET /api/admin/indicators/[id]/versions error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch versions" },
      { status: 500 }
    );
  }
}

// POST /api/admin/indicators/[id]/versions - Create a new version release
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.userType === "ADMIN";
    const adminUser = session?.user?.email || "Admin";

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { version, releaseNotes, script, fileUrl, status } = body;

    if (!version || !version.trim()) {
      return NextResponse.json(
        { success: false, error: "Version number is required (e.g. v2.4.1)" },
        { status: 400 }
      );
    }

    const cleanVersion = version.trim().startsWith("v") ? version.trim() : `v${version.trim()}`;

    const existingIndicator = await prisma.indicator.findUnique({ where: { id } });
    if (!existingIndicator) {
      return NextResponse.json(
        { success: false, error: "Indicator not found" },
        { status: 404 }
      );
    }

    // Check version uniqueness for this indicator
    const existingVer = await prisma.indicatorVersion.findUnique({
      where: {
        indicatorId_version: {
          indicatorId: id,
          version: cleanVersion,
        },
      },
    });

    if (existingVer) {
      return NextResponse.json(
        { success: false, error: `Version ${cleanVersion} already exists for this indicator` },
        { status: 400 }
      );
    }

    const versionStatus = status || "RELEASED";

    const newVersion = await prisma.$transaction(async (tx) => {
      const ver = await tx.indicatorVersion.create({
        data: {
          indicatorId: id,
          version: cleanVersion,
          releaseNotes: releaseNotes?.trim() || null,
          script: script?.trim() || null,
          fileUrl: fileUrl?.trim() || null,
          status: versionStatus,
          releasedAt: versionStatus === "RELEASED" ? new Date() : null,
        },
      });

      if (versionStatus === "RELEASED") {
        await tx.indicator.update({
          where: { id },
          data: { currentVersion: cleanVersion },
        });
      }

      await tx.indicatorActivityLog.create({
        data: {
          indicatorId: id,
          action: "NEW_VERSION_RELEASED",
          details: `Released new version ${cleanVersion} (${versionStatus})`,
          performedBy: adminUser,
        },
      });

      return ver;
    });

    return NextResponse.json({ success: true, data: newVersion }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/indicators/[id]/versions error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to release version" },
      { status: 500 }
    );
  }
}
