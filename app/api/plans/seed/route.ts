import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const defaultPlans = [
      {
        name: "3-Day VIP Pass",
        subtitle: "Short-term pass to experience full indicator & scanner access.",
        badge: "Trial Pass",
        isHighlight: false,
        hasCycles: false,
        price: 799,
        billingPeriod: "3 days access",
        features: [
          "4 Private SFA Indicators",
          "SFA Premium Scanner",
          "Indian Market Setup",
          "VIP Telegram Channel Access",
          "24/7 Priority Support",
        ],
        buttonText: "Get 3-Day Pass — ₹799",
        order: 1,
        isActive: true,
      },
      {
        name: "Gold Research",
        subtitle: "Full institutional Gold research, zone maps & strike signals.",
        badge: "Gold VIP Research",
        isHighlight: true,
        hasCycles: false,
        price: 6000,
        billingPeriod: "month",
        features: [
          "Private Website Access",
          "24/7 Gold Research & Setups",
          "Full Zone Map & Strike Signals",
          "Swing & Multi-Timeframe Signals",
          "Magnet Zones Analysis",
          "VIP Telegram Channel Access",
          "1-to-1 Member Plan Discussion",
          "Copy Trading Access & Support",
        ],
        buttonText: "Get Gold Research",
        order: 2,
        isActive: true,
      },
      {
        name: "Indicator VIP",
        subtitle: "Full algorithmic indicators & market scanners for daily consistency.",
        badge: "Core VIP",
        isHighlight: false,
        hasCycles: true,
        monthlyPrice: 3499,
        quarterlyPrice: 9000,
        quarterlyDiscount: "Save ₹1,497",
        yearlyPrice: 29499,
        yearlyDiscount: "Save ₹12,489",
        features: [
          "4 Private SFA Indicators",
          "SFA Premium Scanner",
          "Indian Market Setup",
          "VIP Telegram Channel Access",
          "1-to-1 Member Plan Discussion",
          "Copy Trading Access",
          "24/7 Priority Support",
        ],
        buttonText: "Get Indicator VIP",
        order: 3,
        isActive: true,
      },
    ];

    const createdPlans = [];
    for (const plan of defaultPlans) {
      const created = await prisma.plan.create({ data: plan });
      createdPlans.push(created);
    }

    return NextResponse.json({ success: true, data: createdPlans, message: "Default plans seeded successfully" });
  } catch (error: any) {
    console.error("POST /api/plans/seed error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to seed default plans" },
      { status: 500 }
    );
  }
}
