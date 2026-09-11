import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UserPortal from "@/components/user/UserPortal";

export default async function UserDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userId = (session.user as any)?.id;

  // Fetch full user data including plan, plan indicators, and direct indicator grants
  const dbUser = await prisma.user.findUnique({
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

  if (!dbUser) {
    redirect("/login");
  }

  // Merge indicators: plan indicators + direct grants (deduplicated by id)
  const indicatorMap = new Map<string, any>();

  // 1. From assigned plan (only if PAID and plan exists)
  if (dbUser.planType === "PAID" && dbUser.plan) {
    for (const pi of dbUser.plan.indicators) {
      const ind = pi.indicator;
      if (ind && ind.status === "ACTIVE" && ind.isActive) {
        indicatorMap.set(ind.id, {
          id: ind.id,
          name: ind.name,
          slug: ind.slug,
          description: ind.description,
          symbol: ind.symbol,
          market: ind.market,
          timeframe: ind.timeframe,
          currentVersion: ind.currentVersion,
          distributionType: ind.distributionType,
          tradingViewId: ind.tradingViewId,
          tradingViewUrl: ind.tradingViewUrl,
          publisher: ind.publisher,
          latestVersion: ind.versions[0] ?? null,
          accessSource: `Plan: ${dbUser.plan!.name}`,
          expiresAt: dbUser.renualDate?.toISOString() ?? null,
        });
      }
    }
  }

  // 2. Directly granted via UserIndicatorAccess
  for (const uia of dbUser.indicatorAccess) {
    const ind = uia.indicator;
    if (!ind) continue;
    // skip if expired
    if (uia.expiresAt && uia.expiresAt < new Date()) continue;
    if (!indicatorMap.has(ind.id)) {
      indicatorMap.set(ind.id, {
        id: ind.id,
        name: ind.name,
        slug: ind.slug,
        description: ind.description,
        symbol: ind.symbol,
        market: ind.market,
        timeframe: ind.timeframe,
        currentVersion: ind.currentVersion,
        distributionType: ind.distributionType,
        tradingViewId: ind.tradingViewId,
        tradingViewUrl: ind.tradingViewUrl,
        publisher: ind.publisher,
        latestVersion: ind.versions[0] ?? null,
        accessSource: uia.reason || "Direct Grant",
        expiresAt: uia.expiresAt?.toISOString() ?? null,
      });
    }
  }

  const indicators = Array.from(indicatorMap.values());

  const userData = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    tradingViewId: dbUser.tradingViewId,
    broker: dbUser.broker,
    mobile: dbUser.mobile,
    userType: dbUser.userType,
    image: dbUser.image,
    experience: dbUser.experience,
    interest: dbUser.interest,
    createdAt: dbUser.createdAt?.toISOString() ?? null,
    planType: dbUser.planType,
    planDate: dbUser.planDate?.toISOString() ?? null,
    renualDate: dbUser.renualDate?.toISOString() ?? null,
    plan: dbUser.plan
      ? {
          id: dbUser.plan.id,
          name: dbUser.plan.name,
          badge: dbUser.plan.badge,
          price: dbUser.plan.price,
        }
      : null,
  };

  return <UserPortal user={userData} indicators={indicators} />;
}
