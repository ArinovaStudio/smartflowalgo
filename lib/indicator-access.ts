import { prisma } from "@/lib/prisma";

export type AccessDeniedReason =
  | "USER_NOT_FOUND"
  | "INDICATOR_NOT_FOUND"
  | "INDICATOR_INACTIVE"
  | "ACCESS_REVOKED"
  | "ACCESS_EXPIRED"
  | "PLAN_NOT_ELIGIBLE"
  | "SUBSCRIPTION_REQUIRED";

export interface AccessCheckResult {
  allowed: boolean;
  reason: string;
  indicator?: {
    id: string;
    name: string;
    tradingViewId: string | null;
    tradingViewUrl: string | null;
    currentVersion: string | null;
  };
  expiresAt?: Date | null;
}

/**
 * Centralized authorization engine for checking if a user has access to a specific indicator.
 */
export async function canUserAccessIndicator(
  userId: string,
  indicatorId: string
): Promise<AccessCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      planType: true,
      userType: true,
    },
  });

  if (!user) {
    return { allowed: false, reason: "USER_NOT_FOUND" };
  }

  // Admins always have access
  if (user.userType === "ADMIN") {
    const ind = await prisma.indicator.findUnique({
      where: { id: indicatorId },
      select: {
        id: true,
        name: true,
        tradingViewId: true,
        tradingViewUrl: true,
        currentVersion: true,
      },
    });
    if (!ind) return { allowed: false, reason: "INDICATOR_NOT_FOUND" };
    return {
      allowed: true,
      reason: "ADMIN_OVERRIDE",
      indicator: ind,
    };
  }

  const indicator = await prisma.indicator.findUnique({
    where: { id: indicatorId },
    include: {
      planAccess: true,
    },
  });

  if (!indicator) {
    return { allowed: false, reason: "INDICATOR_NOT_FOUND" };
  }

  if (indicator.status !== "ACTIVE" || !indicator.isActive) {
    return { allowed: false, reason: "INDICATOR_INACTIVE" };
  }

  // Check 1: User-specific direct override in UserIndicatorAccess
  const directAccess = await prisma.userIndicatorAccess.findUnique({
    where: {
      userId_indicatorId: {
        userId,
        indicatorId,
      },
    },
  });

  if (directAccess) {
    if (directAccess.status === "REVOKED") {
      return { allowed: false, reason: "ACCESS_REVOKED" };
    }

    if (directAccess.expiresAt && directAccess.expiresAt < new Date()) {
      return {
        allowed: false,
        reason: "ACCESS_EXPIRED",
        expiresAt: directAccess.expiresAt,
      };
    }

    if (directAccess.status === "GRANTED") {
      return {
        allowed: true,
        reason: "DIRECT_USER_GRANT",
        expiresAt: directAccess.expiresAt,
        indicator: {
          id: indicator.id,
          name: indicator.name,
          tradingViewId: indicator.tradingViewId,
          tradingViewUrl: indicator.tradingViewUrl,
          currentVersion: indicator.currentVersion,
        },
      };
    }
  }

  // Check 2: Plan-based eligibility
  if (!indicator.isPremium) {
    // Free indicator
    return {
      allowed: true,
      reason: "FREE_INDICATOR",
      indicator: {
        id: indicator.id,
        name: indicator.name,
        tradingViewId: indicator.tradingViewId,
        tradingViewUrl: indicator.tradingViewUrl,
        currentVersion: indicator.currentVersion,
      },
    };
  }

  // Premium indicator requires active PAID plan
  if (user.planType === "PAID") {
    // If indicator has no specific plan restriction or user's plan is active
    return {
      allowed: true,
      reason: "PLAN_ACCESS",
      indicator: {
        id: indicator.id,
        name: indicator.name,
        tradingViewId: indicator.tradingViewId,
        tradingViewUrl: indicator.tradingViewUrl,
        currentVersion: indicator.currentVersion,
      },
    };
  }

  return { allowed: false, reason: "SUBSCRIPTION_REQUIRED" };
}
