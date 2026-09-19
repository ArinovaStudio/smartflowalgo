
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // 1. Authenticate the user
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { success: false, message: "Unauthorized" },
                { status: 401 }
            );
        }

        const userId = (session.user as { id?: string }).id;

        if (!userId) {
            return NextResponse.json(
                { success: false, message: "User ID missing from session" },
                { status: 401 }
            );
        }

        // 2. Fetch user, plan indicators, and direct grants
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
            return NextResponse.json(
                { success: false, message: "User not found" },
                { status: 404 }
            );
        }

        // 3. Merge indicators and deduplicate by ID
        const indicatorMap = new Map<string, any>();

        // Plan indicators: only for PAID users
        if (dbUser.planType === "PAID" && dbUser.plan) {
            for (const pi of dbUser.plan.indicators) {
                const ind = pi.indicator;

                if (!ind || ind.status !== "ACTIVE" || !ind.isActive) {
                    continue;
                }

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
                    accessSource: `Plan: ${dbUser.plan.name}`,
                    expiresAt: dbUser.renualDate?.toISOString() ?? null,
                });
            }
        }

        // Directly granted indicators
        const now = new Date();

        for (const uia of dbUser.indicatorAccess) {
            const ind = uia.indicator;

            if (!ind) continue;

            // Skip expired direct grants
            if (uia.expiresAt && uia.expiresAt < now) {
                continue;
            }

            // Avoid duplicates with plan indicators
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

        // 4. Serialize user data for JSON
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

        // 5. Return dashboard response
        return NextResponse.json({
            success: true,
            user: userData,
            indicators,
        });
    } catch (error) {
        console.error("User dashboard API error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Failed to load dashboard data",
            },
            { status: 500 }
        );
    }
}