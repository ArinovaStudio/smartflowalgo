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

// GET /api/admin/indicators - Paginated list of indicators with search & filters
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
    const categoryId = searchParams.get("categoryId")?.trim();
    const status = searchParams.get("status")?.trim();
    const market = searchParams.get("market")?.trim();
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { symbol: { contains: search, mode: "insensitive" } },
        { tradingViewId: { contains: search, mode: "insensitive" } },
        { publisher: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId && categoryId !== "ALL") {
      where.categoryId = categoryId;
    }

    if (status && status !== "ALL") {
      where.status = status as any;
    }

    if (market && market !== "ALL") {
      where.market = market;
    }

    const [indicators, total, summaryStats] = await Promise.all([
      prisma.indicator.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          planAccess: {
            include: {
              plan: { select: { id: true, name: true, badge: true } },
            },
          },
          _count: {
            select: {
              versions: true,
              userAccess: true,
              planAccess: true,
            },
          },
        },
      }),
      prisma.indicator.count({ where }),
      prisma.indicator.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    const activeCount = await prisma.indicator.count({ where: { status: "ACTIVE" } });
    const inactiveCount = await prisma.indicator.count({ where: { status: "INACTIVE" } });
    const draftCount = await prisma.indicator.count({ where: { status: "DRAFT" } });
    const premiumCount = await prisma.indicator.count({ where: { isPremium: true } });

    return NextResponse.json({
      success: true,
      data: indicators,
      summary: {
        total,
        active: activeCount,
        inactive: inactiveCount,
        draft: draftCount,
        premium: premiumCount,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/indicators error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch indicators" },
      { status: 500 }
    );
  }
}

// POST /api/admin/indicators - Create new indicator
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const {
      name,
      description,
      symbol,
      market,
      timeframe,
      categoryId,
      status,
      currentVersion,
      tradingViewId,
      tradingViewUrl,
      publisher,
      distributionType,
      isPremium,
      isActive,
      planIds, // Array of Plan IDs to assign
      initialReleaseNotes,
      initialScript,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Indicator name is required" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    let slug = slugify(cleanName);

    // Check slug uniqueness
    const existingSlug = await prisma.indicator.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const versionStr = currentVersion && currentVersion.trim() ? currentVersion.trim() : "v1.0.0";

    const indicator = await prisma.$transaction(async (tx) => {
      // 1. Create indicator
      const ind = await tx.indicator.create({
        data: {
          name: cleanName,
          slug,
          description: description?.trim() || null,
          symbol: symbol?.trim() || null,
          market: market?.trim() || "Crypto",
          timeframe: timeframe?.trim() || "1H",
          categoryId: categoryId || null,
          status: status || "DRAFT",
          currentVersion: versionStr,
          tradingViewId: tradingViewId?.trim() || null,
          tradingViewUrl: tradingViewUrl?.trim() || null,
          publisher: publisher?.trim() || null,
          distributionType: distributionType || "INVITE_ONLY",
          isPremium: isPremium !== undefined ? Boolean(isPremium) : true,
          isActive: isActive !== undefined ? Boolean(isActive) : true,
        },
      });

      // 2. Create initial version record
      await tx.indicatorVersion.create({
        data: {
          indicatorId: ind.id,
          version: versionStr,
          releaseNotes: initialReleaseNotes?.trim() || "Initial Release",
          script: initialScript?.trim() || null,
          status: "RELEASED",
          releasedAt: new Date(),
        },
      });

      // 3. Assign plans if planIds provided
      if (Array.isArray(planIds) && planIds.length > 0) {
        await tx.planIndicator.createMany({
          data: planIds.map((planId: string) => ({
            indicatorId: ind.id,
            planId,
          })),
          skipDuplicates: true,
        });
      }

      // 4. Log activity
      await tx.indicatorActivityLog.create({
        data: {
          indicatorId: ind.id,
          action: "CREATED",
          details: `Created indicator "${cleanName}" with version ${versionStr}`,
          performedBy: adminUser,
        },
      });

      return ind;
    });

    return NextResponse.json({ success: true, data: indicator }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/indicators error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create indicator" },
      { status: 500 }
    );
  }
}
