import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/admin/users - List users with filtering, search, and pagination
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.userType === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10));
    const search = searchParams.get("search")?.trim() || "";
    const userType = searchParams.get("userType")?.trim();
    const planType = searchParams.get("planType")?.trim();
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search, mode: "insensitive" } },
        { tradingViewId: { contains: search, mode: "insensitive" } },
      ];
    }

    if (userType && userType !== "ALL") {
      where.userType = userType;
    }

    if (planType && planType !== "ALL") {
      where.planType = planType;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          payments: {
            select: {
              id: true,
              amount: true,
              status: true,
              currency: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              payments: true,
              referrals: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map((u) => {
      const { password, payments, ...rest } = u;
      const totalSpent = payments
        .filter((p) => p.status === "PAID")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        ...rest,
        hasPassword: Boolean(password),
        paymentCount: u._count.payments,
        referralCount: u._count.referrals,
        totalSpent,
        recentPayments: payments.slice(0, 5),
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedUsers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create a new user (Admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.userType === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
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

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const emailClean = email.trim().toLowerCase();

    // Check unique constraints
    const existingEmail = await prisma.user.findUnique({ where: { email: emailClean } });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    if (mobile && mobile.trim()) {
      const existingMobile = await prisma.user.findUnique({ where: { mobile: mobile.trim() } });
      if (existingMobile) {
        return NextResponse.json(
          { success: false, error: "A user with this mobile number already exists" },
          { status: 400 }
        );
      }
    }

    if (tradingViewId && tradingViewId.trim()) {
      const existingTv = await prisma.user.findUnique({ where: { tradingViewId: tradingViewId.trim() } });
      if (existingTv) {
        return NextResponse.json(
          { success: false, error: "A user with this TradingView ID already exists" },
          { status: 400 }
        );
      }
    }

    let hashedPassword: string | null = null;
    if (password && password.trim()) {
      hashedPassword = await bcrypt.hash(password.trim(), 10);
    }

    const newUser = await prisma.user.create({
      data: {
        name: name ? name.trim() : null,
        email: emailClean,
        password: hashedPassword,
        mobile: mobile && mobile.trim() ? mobile.trim() : null,
        tradingViewId: tradingViewId && tradingViewId.trim() ? tradingViewId.trim() : null,
        userType: userType || "CLIENT",
        planType: planType || "FREE",
        experience: experience || "Beginner",
        interest: interest || "Gold",
        version: version || "Latest",
        discount: discount !== undefined && discount !== null && discount !== "" ? Number(discount) : 0,
      },
    });

    const { password: _, ...userWithoutPass } = newUser;
    return NextResponse.json({ success: true, data: userWithoutPass }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/users error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
