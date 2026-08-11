import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import sendEmail from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const emailClean = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: emailClean },
    });

    // Always return success to prevent email enumeration attacks
    if (!user || !user.password) {
      return NextResponse.json({
        message: "If an account with that email exists, a reset link has been sent.",
      });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Upsert verification token
    await prisma.verificationToken.upsert({
      where: { identifier_token: { identifier: emailClean, token: "" } },
      update: { token, expires },
      create: { identifier: emailClean, token, expires },
    }).catch(async () => {
      // In case of conflict or no existing record, just create
      await prisma.verificationToken.deleteMany({
        where: { identifier: emailClean },
      });
      await prisma.verificationToken.create({
        data: { identifier: emailClean, token, expires },
      });
    });

    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(emailClean)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px;">
        <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-bottom: 8px;">Reset Your Password</h2>
        <p style="color: #475569; font-size: 14px; margin-bottom: 24px;">
          You requested a password reset for your <strong>SMARTFLOWALGO</strong> account. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-bottom: 24px;">
          Reset Password
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">
          If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #cbd5e1; font-size: 11px;">SMARTFLOWALGO · Trading Education Platform</p>
      </div>
    `;

    await sendEmail(emailClean, "Reset your SMARTFLOWALGO password", html);

    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
