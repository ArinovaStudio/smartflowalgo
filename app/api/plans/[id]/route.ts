import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/plans/[id] - Update an existing plan (Admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : existing.name,
        subtitle: subtitle !== undefined ? (subtitle ? String(subtitle).trim() : null) : existing.subtitle,
        badge: badge !== undefined ? (badge ? String(badge).trim() : null) : existing.badge,
        isHighlight: isHighlight !== undefined ? Boolean(isHighlight) : existing.isHighlight,
        hasCycles: hasCycles !== undefined ? Boolean(hasCycles) : existing.hasCycles,
        price: price !== undefined ? (price !== null && price !== "" ? Number(price) : null) : existing.price,
        billingPeriod: billingPeriod !== undefined ? (billingPeriod ? String(billingPeriod).trim() : null) : existing.billingPeriod,
        monthlyPrice: monthlyPrice !== undefined ? (monthlyPrice !== null && monthlyPrice !== "" ? Number(monthlyPrice) : null) : existing.monthlyPrice,
        quarterlyPrice: quarterlyPrice !== undefined ? (quarterlyPrice !== null && quarterlyPrice !== "" ? Number(quarterlyPrice) : null) : existing.quarterlyPrice,
        quarterlyDiscount: quarterlyDiscount !== undefined ? (quarterlyDiscount ? String(quarterlyDiscount).trim() : null) : existing.quarterlyDiscount,
        yearlyPrice: yearlyPrice !== undefined ? (yearlyPrice !== null && yearlyPrice !== "" ? Number(yearlyPrice) : null) : existing.yearlyPrice,
        yearlyDiscount: yearlyDiscount !== undefined ? (yearlyDiscount ? String(yearlyDiscount).trim() : null) : existing.yearlyDiscount,
        features: Array.isArray(features) ? features.map((f: any) => String(f).trim()).filter(Boolean) : existing.features,
        buttonText: buttonText !== undefined ? (buttonText ? String(buttonText).trim() : null) : existing.buttonText,
        order: order !== undefined ? Number(order) : existing.order,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    return NextResponse.json({ success: true, data: updatedPlan });
  } catch (error: any) {
    console.error("PUT /api/plans/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update plan" },
      { status: 500 }
    );
  }
}

// DELETE /api/plans/[id] - Delete a plan (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.userType === "ADMIN";

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Admin privileges required." },
        { status: 403 }
      );
    }

    const existing = await prisma.plan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    await prisma.plan.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Plan deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/plans/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete plan" },
      { status: 500 }
    );
  }
}
