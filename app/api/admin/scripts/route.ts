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

// GET /api/admin/scripts - Paginated list of Pine Script indicators with search & filters
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
    const status = searchParams.get("status")?.trim();
    const planId = searchParams.get("planId")?.trim();
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    const where: any = {
      distributionType: "DIRECT_SCRIPT",
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        {
          versions: {
            some: {
              script: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    if (status && status !== "ALL") {
      where.status = status as any;
    }

    if (planId && planId !== "ALL") {
      if (planId === "UNASSIGNED") {
        where.planAccess = { none: {} };
      } else {
        where.planAccess = {
          some: {
            planId: planId,
          },
        };
      }
    }

    const [scripts, total, statusGroups, assignedPlansCount] = await Promise.all([
      prisma.indicator.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          status: true,
          currentVersion: true,
          distributionType: true,
          isPremium: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          versions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              version: true,
              script: true,
              releasedAt: true,
              createdAt: true,
            },
          },
          planAccess: {
            select: {
              plan: {
                select: {
                  id: true,
                  name: true,
                  badge: true,
                  price: true,
                  monthlyPrice: true,
                },
              },
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
        where: { distributionType: "DIRECT_SCRIPT" },
        _count: { _all: true },
      }),
      prisma.planIndicator.count({
        where: {
          indicator: {
            distributionType: "DIRECT_SCRIPT",
          },
        },
      }),
    ]);

    let activeCount = 0;
    let inactiveCount = 0;
    let draftCount = 0;
    let testingCount = 0;
    let totalScripts = 0;

    for (const group of statusGroups) {
      const count = group._count._all;
      totalScripts += count;
      if (group.status === "ACTIVE") activeCount = count;
      else if (group.status === "INACTIVE") inactiveCount = count;
      else if (group.status === "DRAFT") draftCount = count;
      else if (group.status === "TESTING") testingCount = count;
    }

    return NextResponse.json({
      success: true,
      data: scripts,
      summary: {
        total: totalScripts,
        active: activeCount,
        inactive: inactiveCount,
        draft: draftCount,
        testing: testingCount,
        assignedPlans: assignedPlansCount,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error: any) {
    console.error("GET /api/admin/scripts error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch scripts" },
      { status: 500 }
    );
  }
}

// POST /api/admin/scripts - Create simple Pine script indicator
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
      scriptCode,
      status = "ACTIVE",
      version = "v1.0.0",
      planIds = [],
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Indicator name is required" },
        { status: 400 }
      );
    }

    if (!scriptCode || !scriptCode.trim()) {
      return NextResponse.json(
        { success: false, error: "Pine script code or uploaded text file content is required" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    let slug = slugify(cleanName);

    // Ensure slug uniqueness
    const existingSlug = await prisma.indicator.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const versionStr = version?.trim()
      ? version.trim().startsWith("v")
        ? version.trim()
        : `v${version.trim()}`
      : "v1.0.0";

    const indicator = await prisma.$transaction(async (tx) => {
      // 1. Create Indicator
      const ind = await tx.indicator.create({
        data: {
          name: cleanName,
          slug,
          description: description?.trim() || null,
          distributionType: "DIRECT_SCRIPT",
          status: status || "ACTIVE",
          isActive: status === "ACTIVE" || status === "TESTING",
          currentVersion: versionStr,
          isPremium: true,
          publisher: "SmartFlowAlgo",
        },
      });

      // 2. Create Initial Version with the Pine Code
      await tx.indicatorVersion.create({
        data: {
          indicatorId: ind.id,
          version: versionStr,
          script: scriptCode.trim(),
          releaseNotes: "Initial version release",
          status: "RELEASED",
          releasedAt: new Date(),
        },
      });

      // 3. Assign to selected Plans
      if (Array.isArray(planIds) && planIds.length > 0) {
        await tx.planIndicator.createMany({
          data: planIds.map((planId: string) => ({
            indicatorId: ind.id,
            planId,
          })),
          skipDuplicates: true,
        });
      }

      // 4. Log Admin Activity
      await tx.indicatorActivityLog.create({
        data: {
          indicatorId: ind.id,
          action: "CREATED_PINE_SCRIPT",
          details: `Created Pine Script indicator "${cleanName}" (${versionStr}) with ${planIds.length} assigned plan(s)`,
          performedBy: adminUser,
        },
      });

      return ind;
    });

    return NextResponse.json({ success: true, data: indicator }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/scripts error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create Pine script indicator" },
      { status: 500 }
    );
  }
}
