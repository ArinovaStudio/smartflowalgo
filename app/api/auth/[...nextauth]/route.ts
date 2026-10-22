import NextAuth from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const handler = NextAuth(authOptions);

async function trackActiveLogin(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || "smartflowalgo_secret_key_2026",
    });
    if (!token?.id || typeof token.sessionVersion !== "number") return;

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    if (!ip) return;

    await prisma.user.updateMany({
      where: { id: String(token.id), sessionVersion: token.sessionVersion },
      data: { lastLoginIp: ip, lastLoginAt: new Date() },
    });
  } catch (error) {
    console.error("Failed to record active login IP:", error);
  }
}

async function handle(req: NextRequest, context: any) {
  const response = await handler(req, context);
  await trackActiveLogin(req);
  return response;
}

export { handle as GET, handle as POST };
