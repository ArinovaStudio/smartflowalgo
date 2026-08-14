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

// GET /api/admin/indicators/[id] - Get single indicator details
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
        category: true,
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
        userAccess: {
          orderBy: { grantedAt: "desc" },
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
        },
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 25,
        },
      },
    });

    if (!indicator) {
      return NextResponse.json(
        { success: false, error: "Indicator not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: indicator });
  } catch (error: any) {
    console.error("GET /api/admin/indicators/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch indicator" },
      { status: 500 }
    );
  }
}

// PUT / PATCH /api/admin/indicators/[id] - Update indicator
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

    const existing = await prisma.indicator.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Indicator not found" },
        { status: 404 }
      );
    }

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
    } = body;

    const updateData: any = {};
    const changes: string[] = [];

    if (name && name.trim() && name.trim() !== existing.name) {
      updateData.name = name.trim();
      updateData.slug = slugify(name.trim());
      changes.push(`Name changed from "${existing.name}" to "${updateData.name}"`);
    }

    if (description !== undefined && description !== existing.description) {
      updateData.description = description ? description.trim() : null;
      changes.push("Description updated");
    }

    if (symbol !== undefined && symbol !== existing.symbol) {
      updateData.symbol = symbol ? symbol.trim() : null;
      changes.push(`Symbol changed to "${updateData.symbol}"`);
    }

    if (market !== undefined && market !== existing.market) {
      updateData.market = market ? market.trim() : null;
      changes.push(`Market changed to "${updateData.market}"`);
    }

    if (timeframe !== undefined && timeframe !== existing.timeframe) {
      updateData.timeframe = timeframe ? timeframe.trim() : null;
      changes.push(`Timeframe changed to "${updateData.timeframe}"`);
    }

    if (categoryId !== undefined && categoryId !== existing.categoryId) {
      updateData.categoryId = categoryId || null;
      changes.push("Category updated");
    }

    if (status && status !== existing.status) {
      updateData.status = status;
      changes.push(`Status changed from ${existing.status} to ${status}`);
    }

    if (currentVersion && currentVersion !== existing.currentVersion) {
      updateData.currentVersion = currentVersion.trim();
      changes.push(`Version updated to ${updateData.currentVersion}`);
    }

    if (tradingViewId !== undefined && tradingViewId !== existing.tradingViewId) {
      updateData.tradingViewId = tradingViewId ? tradingViewId.trim() : null;
      changes.push("TradingView ID updated");
    }

    if (tradingViewUrl !== undefined && tradingViewUrl !== existing.tradingViewUrl) {
      updateData.tradingViewUrl = tradingViewUrl ? tradingViewUrl.trim() : null;
      changes.push("TradingView URL updated");
    }

    if (publisher !== undefined && publisher !== existing.publisher) {
      updateData.publisher = publisher ? publisher.trim() : null;
      changes.push("Publisher handle updated");
    }

    if (distributionType !== undefined && distributionType !== existing.distributionType) {
      updateData.distributionType = distributionType;
      changes.push(`Distribution type changed to ${distributionType}`);
    }

    if (isPremium !== undefined && isPremium !== existing.isPremium) {
      updateData.isPremium = Boolean(isPremium);
      changes.push(`Premium setting changed to ${isPremium}`);
    }

    if (isActive !== undefined && isActive !== existing.isActive) {
      updateData.isActive = Boolean(isActive);
      changes.push(`Active setting changed to ${isActive}`);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const ind = await tx.indicator.update({
        where: { id },
        data: updateData,
      });

      if (changes.length > 0) {
        await tx.indicatorActivityLog.create({
          data: {
            indicatorId: id,
            action: "UPDATED",
            details: changes.join("; "),
            performedBy: adminUser,
          },
        });
      }

      return ind;
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("PATCH /api/admin/indicators/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update indicator" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/indicators/[id] - Delete indicator
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

    return NextResponse.json({ success: true, message: "Indicator deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/admin/indicators/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete indicator" },
      { status: 500 }
    );
  }
}
