import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/admin/users/[id] - Get comprehensive single user details including all payments & referrals
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.userType === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
        },
        referrals: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                mobile: true,
                tradingViewId: true,
              },
            },
          },
        },
        accounts: {
          select: {
            id: true,
            provider: true,
            type: true,
          },
        },
        sessions: {
          select: {
            id: true,
            expires: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const { password, ...userWithoutPassword } = user;
    const totalSpent = user.payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalReferralEarnings = user.referrals
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return NextResponse.json({
      success: true,
      data: {
        ...userWithoutPassword,
        hasPassword: Boolean(password),
        totalSpent,
        totalReferralEarnings,
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch user details" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Update user (Name, Email, Password, UserType, PlanType, etc.)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.userType === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      email,
      password,
      mobile,
      tradingViewId,
      userType,
      planType,
      experience,
      interest,
      version,
      discount,
    } = body;

    const dataToUpdate: any = {};

    if (name !== undefined) dataToUpdate.name = name ? name.trim() : null;
    
    if (email !== undefined && email.trim()) {
      const emailClean = email.trim().toLowerCase();
      if (emailClean !== existing.email) {
        const checkEmail = await prisma.user.findUnique({ where: { email: emailClean } });
        if (checkEmail) {
          return NextResponse.json(
            { success: false, error: "Email is already taken by another user" },
            { status: 400 }
          );
        }
        dataToUpdate.email = emailClean;
      }
    }

    if (mobile !== undefined) {
      const mobClean = mobile ? mobile.trim() : null;
      if (mobClean && mobClean !== existing.mobile) {
        const checkMob = await prisma.user.findUnique({ where: { mobile: mobClean } });
        if (checkMob) {
          return NextResponse.json(
            { success: false, error: "Mobile number is already taken by another user" },
            { status: 400 }
          );
        }
      }
      dataToUpdate.mobile = mobClean;
    }

    if (tradingViewId !== undefined) {
      const tvClean = tradingViewId ? tradingViewId.trim() : null;
      if (tvClean && tvClean !== existing.tradingViewId) {
        const checkTv = await prisma.user.findUnique({ where: { tradingViewId: tvClean } });
        if (checkTv) {
          return NextResponse.json(
            { success: false, error: "TradingView ID is already taken by another user" },
            { status: 400 }
          );
        }
      }
      dataToUpdate.tradingViewId = tvClean;
    }

    if (password && password.trim()) {
      dataToUpdate.password = await bcrypt.hash(password.trim(), 10);
    }

    if (userType !== undefined) dataToUpdate.userType = userType;
    if (planType !== undefined) dataToUpdate.planType = planType;
    if (experience !== undefined) dataToUpdate.experience = experience;
    if (interest !== undefined) dataToUpdate.interest = interest;
    if (version !== undefined) dataToUpdate.version = version;
    if (discount !== undefined) dataToUpdate.discount = discount !== null && discount !== "" ? Number(discount) : 0;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    const { password: _, ...userWithoutPass } = updatedUser;
    return NextResponse.json({ success: true, data: userWithoutPass });
  } catch (error: any) {
    console.error("PUT /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.userType === "ADMIN";
    const currentUserId = (session?.user as any)?.id;

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    if (currentUserId === id) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own admin account while logged in." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/admin/users/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
