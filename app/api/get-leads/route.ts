import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") || "10")));
    const skip = (page - 1) * pageSize;
    const search = searchParams.get("search")?.trim() || "";
    const planType = searchParams.get("planType");
    const renewalFilter = searchParams.get("renewalFilter");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const where: Prisma.UserWhereInput = {
      userType: "CLIENT",
      ...(planType && planType !== "ALL"
        ? { planType: planType as Prisma.UserWhereInput["planType"] }
        : {}),
      ...(renewalFilter === "EXPIRED"
        ? { renualDate: { lte: oneMonthAgo } }
        : renewalFilter === "EXPIRING_SOON" || renewalFilter === "ACTIVE"
        ? { renualDate: { gte: oneMonthAgo, not: null } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { mobile: { contains: search, mode: "insensitive" } },
              { tradingViewId: { contains: search, mode: "insensitive" } },
              { broker: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    let orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortBy]: order,
    };

    if (renewalFilter === "EXPIRING_SOON" && !searchParams.has("sortBy")) {
      orderBy = { renualDate: "asc" };
    } else if (renewalFilter === "EXPIRED" && !searchParams.has("sortBy")) {
      orderBy = { renualDate: "desc" };
    }

    const [leads, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.user.count({
        where,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: leads,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("Error fetching leads:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch leads",
      },
      { status: 500 }
    );
  }
}