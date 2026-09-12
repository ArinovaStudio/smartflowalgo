import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const indicators = await prisma.indicator.findMany({
            include: {
                category: true,
                versions: true,
                planAccess: true,
                userAccess: true,
                activityLogs: true,
            },
        });
        return NextResponse.json({ success: true, data: indicators });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error?.message || "Failed to fetch indicators" },
            { status: 500 }
        );
    }
}