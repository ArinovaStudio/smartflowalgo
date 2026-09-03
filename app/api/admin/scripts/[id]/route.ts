import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// GET /api/admin/scripts/[id] - Get single Pine script indicator with code and versions
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

    const indicator = await prisma.indicator.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
        },
        planAccess: {
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                badge: true,
                price: true,
                monthlyPrice: true,
                isActive: true,
              },
            },
          },
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 15,
        },
      },
    });

    if (!indicator) {
      return NextResponse.json(
        { success: false, error: "Pine script indicator not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: indicator });
  } catch (error: any) {
    console.error("GET /api/admin/scripts/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch script indicator" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/scripts/[id] - Update indicator, script code, plan mappings, and status
export async function PATCH(
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

    const existing = await prisma.indicator.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Indicator not found" },
        { status: 404 }
      );
    }

    const { name, description, status, version, scriptCode, planIds } = body;
    const updateData: any = {};
    const changes: string[] = [];

    if (name && name.trim() && name.trim() !== existing.name) {
      updateData.name = name.trim();
      updateData.slug = slugify(name.trim());
      changes.push(`Name changed to "${updateData.name}"`);
    }

    if (description !== undefined && description !== existing.description) {
      updateData.description = description ? description.trim() : null;
      changes.push("Description updated");
    }

    if (status && status !== existing.status) {
      updateData.status = status;
      updateData.isActive = status === "ACTIVE" || status === "TESTING";
      changes.push(`Status changed from ${existing.status} to ${status}`);
    }

    const versionStr = version?.trim()
      ? version.trim().startsWith("v")
        ? version.trim()
        : `v${version.trim()}`
      : existing.currentVersion || "v1.0.0";

    if (versionStr !== existing.currentVersion) {
      updateData.currentVersion = versionStr;
      changes.push(`Version updated to ${versionStr}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Indicator
      const ind = await tx.indicator.update({
        where: { id },
        data: updateData,
      });

      // 2. If script code is modified, update or create version
      if (scriptCode && scriptCode.trim()) {
        const latestVersion = existing.versions[0];
        if (latestVersion && latestVersion.script !== scriptCode.trim()) {
          if (latestVersion.version === versionStr) {
            // Update current version record's script
            await tx.indicatorVersion.update({
              where: { id: latestVersion.id },
              data: {
                script: scriptCode.trim(),
                releasedAt: new Date(),
              },
            });
            changes.push("Pine Script code updated for current version");
          } else {
            // Create a new version record
            await tx.indicatorVersion.create({
              data: {
                indicatorId: id,
                version: versionStr,
                script: scriptCode.trim(),
                releaseNotes: "Version update",
                status: "RELEASED",
                releasedAt: new Date(),
              },
            });
            changes.push(`Created version ${versionStr} with updated Pine Script code`);
          }
        }
      }

      // 3. Update Plan mappings if provided
      if (Array.isArray(planIds)) {
        await tx.planIndicator.deleteMany({
          where: { indicatorId: id },
        });

        if (planIds.length > 0) {
          await tx.planIndicator.createMany({
            data: planIds.map((planId: string) => ({
              indicatorId: id,
              planId,
            })),
            skipDuplicates: true,
          });
        }
        changes.push(`Assigned plans updated (${planIds.length} plans)`);
      }

      // 4. Log Activity
      if (changes.length > 0) {
        await tx.indicatorActivityLog.create({
          data: {
            indicatorId: id,
            action: "UPDATED_PINE_SCRIPT",
            details: changes.join("; "),
            performedBy: adminUser,
          },
        });
      }

      return ind;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PATCH /api/admin/scripts/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update Pine script indicator" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/scripts/[id] - Delete indicator
export async function DELETE(
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
    await prisma.indicator.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Pine script indicator deleted successfully",
    });
  } catch (error: any) {
    console.error("DELETE /api/admin/scripts/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete script indicator" },
      { status: 500 }
    );
  }
}
