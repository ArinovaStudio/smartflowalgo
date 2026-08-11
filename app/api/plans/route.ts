import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/plans - Fetch all active plans (or all plans if admin requests ?all=true)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fetchAll = searchParams.get("all") === "true";

    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.userType === "ADMIN";

    let whereClause = {};
    if (!fetchAll || !isAdmin) {
      whereClause = { isActive: true };
    }

    let plans = await prisma.plan.findMany({
      where: whereClause,
      orderBy: { order: "asc" },
    });

    // If no plans exist in DB, auto-seed default 3 plans
    if (plans.length === 0 && (!fetchAll || !isAdmin)) {
      plans = await seedDefaultPlans();
    }

    return NextResponse.json({ success: true, data: plans });
  } catch (error: any) {
    console.error("GET /api/plans error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

// POST /api/plans - Create a new plan (Admin only)
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
      subtitle,
      badge,
      isHighlight,
      hasCycles,
      price,
      billingPeriod,
      monthlyPrice,
      quarterlyPrice,
      quarterlyDiscount,
      yearlyPrice,
      yearlyDiscount,
      features,
      buttonText,
      order,
      isActive,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Plan name is required" },
        { status: 400 }
      );
    }

    const newPlan = await prisma.plan.create({
      data: {
        name: name.trim(),
        subtitle: subtitle ? String(subtitle).trim() : null,
        badge: badge ? String(badge).trim() : null,
        isHighlight: Boolean(isHighlight),
        hasCycles: Boolean(hasCycles),
        price: price !== undefined && price !== null && price !== "" ? Number(price) : null,
        billingPeriod: billingPeriod ? String(billingPeriod).trim() : null,
        monthlyPrice: monthlyPrice !== undefined && monthlyPrice !== null && monthlyPrice !== "" ? Number(monthlyPrice) : null,
        quarterlyPrice: quarterlyPrice !== undefined && quarterlyPrice !== null && quarterlyPrice !== "" ? Number(quarterlyPrice) : null,
        quarterlyDiscount: quarterlyDiscount ? String(quarterlyDiscount).trim() : null,
        yearlyPrice: yearlyPrice !== undefined && yearlyPrice !== null && yearlyPrice !== "" ? Number(yearlyPrice) : null,
        yearlyDiscount: yearlyDiscount ? String(yearlyDiscount).trim() : null,
        features: Array.isArray(features) ? features.map((f: any) => String(f).trim()).filter(Boolean) : [],
        buttonText: buttonText ? String(buttonText).trim() : null,
        order: order !== undefined && order !== null ? Number(order) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ success: true, data: newPlan }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/plans error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create plan" },
      { status: 500 }
    );
  }
}

async function seedDefaultPlans() {
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
  return createdPlans;
}
