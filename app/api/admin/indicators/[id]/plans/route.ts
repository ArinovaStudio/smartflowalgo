import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/indicators/[id]/plans
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
    const planAccess = await prisma.planIndicator.findMany({
      where: { indicatorId: id },
      include: {
        plan: true,
      },
    });

    return NextResponse.json({ success: true, data: planAccess });
  } catch (error: any) {
    console.error("GET /api/admin/indicators/[id]/plans error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch plan access" },
      { status: 500 }
    );
  }
}

// POST /api/admin/indicators/[id]/plans - Bulk update/sync plan access
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
    const { planIds } = body; // Array of selected Plan IDs

    if (!Array.isArray(planIds)) {
      return NextResponse.json(
        { success: false, error: "planIds must be an array of plan IDs" },
        { status: 400 }
      );
    }

    const indicator = await prisma.indicator.findUnique({ where: { id } });
    if (!indicator) {
      return NextResponse.json(
        { success: false, error: "Indicator not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      // Clear existing plan mappings
      await tx.planIndicator.deleteMany({
        where: { indicatorId: id },
      });

      // Insert new plan mappings
      if (planIds.length > 0) {
        await tx.planIndicator.createMany({
          data: planIds.map((planId: string) => ({
            indicatorId: id,
            planId,
          })),
        });
      }

      await tx.indicatorActivityLog.create({
        data: {
          indicatorId: id,
          action: "PLAN_ACCESS_UPDATED",
          details: `Updated plan mappings: ${planIds.length} plan(s) assigned`,
          performedBy: adminUser,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Plan access updated successfully",
    });
  } catch (error: any) {
    console.error("POST /api/admin/indicators/[id]/plans error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update plan access" },
      { status: 500 }
    );
  }
}
