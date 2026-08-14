import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/indicators/[id]/access - List user access entries
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
    const accessList = await prisma.userIndicatorAccess.findMany({
      where: { indicatorId: id },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            tradingViewId: true,
            planType: true,
            userType: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: accessList });
  } catch (error: any) {
    console.error("GET /api/admin/indicators/[id]/access error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch user access" },
      { status: 500 }
    );
  }
}

// POST /api/admin/indicators/[id]/access - Grant or update user access
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
    const { userId, userEmail, status, expiresAt, reason } = body;

    let targetUserId = userId;

    if (!targetUserId && userEmail) {
      const u = await prisma.user.findUnique({
        where: { email: userEmail.trim().toLowerCase() },
      });
      if (!u) {
        return NextResponse.json(
          { success: false, error: `User with email ${userEmail} not found` },
          { status: 404 }
        );
      }
      targetUserId = u.id;
    }

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: "User ID or User Email is required" },
        { status: 400 }
      );
    }

    const accessStatus = status || "GRANTED";
    const expiryDate = expiresAt ? new Date(expiresAt) : null;

    const accessRecord = await prisma.$transaction(async (tx) => {
      const rec = await tx.userIndicatorAccess.upsert({
        where: {
          userId_indicatorId: {
            userId: targetUserId,
            indicatorId: id,
          },
        },
        create: {
          userId: targetUserId,
          indicatorId: id,
          status: accessStatus,
          expiresAt: expiryDate,
          grantedBy: adminUser,
          reason: reason?.trim() || "Manual Admin Grant",
        },
        update: {
          status: accessStatus,
          expiresAt: expiryDate,
          grantedBy: adminUser,
          reason: reason?.trim() || "Updated by Admin",
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, tradingViewId: true },
          },
        },
      });

      await tx.indicatorActivityLog.create({
        data: {
          indicatorId: id,
          action: accessStatus === "GRANTED" ? "ACCESS_GRANTED" : "ACCESS_REVOKED",
          details: `${accessStatus} access for user ${rec.user.email} (${reason || "Manual update"})`,
          performedBy: adminUser,
        },
      });

      return rec;
    });

    return NextResponse.json({ success: true, data: accessRecord });
  } catch (error: any) {
    console.error("POST /api/admin/indicators/[id]/access error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update user access" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/indicators/[id]/access - Revoke user access
export async function DELETE(
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
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId parameter is required" },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const rec = await tx.userIndicatorAccess.findUnique({
        where: {
          userId_indicatorId: {
            userId,
            indicatorId: id,
          },
        },
        include: { user: { select: { email: true } } },
      });

      if (rec) {
        await tx.userIndicatorAccess.delete({
          where: { id: rec.id },
        });

        await tx.indicatorActivityLog.create({
          data: {
            indicatorId: id,
            action: "ACCESS_REVOKED",
            details: `Revoked access record for user ${rec.user.email}`,
            performedBy: adminUser,
          },
        });
      }
    });

    return NextResponse.json({ success: true, message: "Access revoked successfully" });
  } catch (error: any) {
    console.error("DELETE /api/admin/indicators/[id]/access error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to revoke access" },
      { status: 500 }
    );
  }
}
