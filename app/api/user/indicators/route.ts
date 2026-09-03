import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/indicators - Returns the logged-in user's assigned plan and unlocked indicators
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!session || !userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        plan: {
          include: {
            indicators: {
              include: {
                indicator: {
                  include: {
                    versions: {
                      orderBy: { createdAt: "desc" },
                      take: 1,
                      select: {
                        id: true,
                        version: true,
                        script: true,
                        releaseNotes: true,
                        releasedAt: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        indicatorAccess: {
          where: { status: "GRANTED" },
          include: {
            indicator: {
              include: {
                versions: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  select: {
                    id: true,
                    version: true,
                    script: true,
                    releaseNotes: true,
                    releasedAt: true,
                  },
                },
              },
            },
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

    // Aggregate unique indicators
    const indicatorMap = new Map<string, any>();

    // 1. Indicators from User's Plan (if PAID/Active)
    if (user.planType === "PAID" && user.plan) {
      for (const pi of user.plan.indicators) {
        if (pi.indicator && pi.indicator.status === "ACTIVE" && pi.indicator.isActive) {
          indicatorMap.set(pi.indicator.id, {
            id: pi.indicator.id,
            name: pi.indicator.name,
            slug: pi.indicator.slug,
            description: pi.indicator.description,
            symbol: pi.indicator.symbol,
            market: pi.indicator.market,
            timeframe: pi.indicator.timeframe,
            currentVersion: pi.indicator.currentVersion,
            distributionType: pi.indicator.distributionType,
            tradingViewId: pi.indicator.tradingViewId,
            tradingViewUrl: pi.indicator.tradingViewUrl,
            publisher: pi.indicator.publisher,
            latestVersion: pi.indicator.versions[0] || null,
            accessSource: `Plan: ${user.plan.name}`,
            expiresAt: user.renualDate,
          });
        }
      }
    }

    // 2. Indicators directly granted via UserIndicatorAccess
    for (const uia of user.indicatorAccess) {
      if (uia.indicator && (!uia.expiresAt || uia.expiresAt > new Date())) {
        if (!indicatorMap.has(uia.indicator.id)) {
          indicatorMap.set(uia.indicator.id, {
            id: uia.indicator.id,
            name: uia.indicator.name,
            slug: uia.indicator.slug,
            description: uia.indicator.description,
            symbol: uia.indicator.symbol,
            market: uia.indicator.market,
            timeframe: uia.indicator.timeframe,
            currentVersion: uia.indicator.currentVersion,
            distributionType: uia.indicator.distributionType,
            tradingViewId: uia.indicator.tradingViewId,
            tradingViewUrl: uia.indicator.tradingViewUrl,
            publisher: uia.indicator.publisher,
            latestVersion: uia.indicator.versions[0] || null,
            accessSource: uia.reason || "Direct Grant",
            expiresAt: uia.expiresAt,
          });
        }
      }
    }

    const indicatorList = Array.from(indicatorMap.values());

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tradingViewId: user.tradingViewId,
        planType: user.planType,
        plan: user.plan
          ? {
              id: user.plan.id,
              name: user.plan.name,
              badge: user.plan.badge,
            }
          : null,
        planDate: user.planDate,
        renualDate: user.renualDate,
      },
      indicators: indicatorList,
    });
  } catch (error: any) {
    console.error("GET /api/user/indicators error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch user indicators" },
      { status: 500 }
    );
  }
}
