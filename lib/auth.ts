import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function expirePaidUserIfNeeded(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, userType: true, planType: true, renualDate: true },
  });

  if (
    !dbUser ||
    dbUser.userType === "ADMIN" ||
    dbUser.planType !== "PAID" ||
    !dbUser.renualDate ||
    dbUser.renualDate > new Date()
  ) {
    return dbUser?.planType ?? null;
  }

  await prisma.user.update({
    where: { id: dbUser.id },
    data: { planType: "REJECTED" },
  });
  await prisma.userIndicatorAccess.updateMany({
    where: { userId: dbUser.id, status: "GRANTED" },
    data: { status: "REVOKED" },
  });

  return "REJECTED";
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please enter email and password");
        }

        const emailClean = credentials.email.trim().toLowerCase();

        try {
          const user = await prisma.user.findUnique({
            where: { email: emailClean },
          });

          if (!user || !user.password) {
            throw new Error("No account found with this email");
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);

          if (!isValid) {
            throw new Error("Invalid password");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            userType: user.userType,
            planType: user.planType ?? undefined,
          };
        } catch (error: any) {
          console.error("Auth error:", error?.message || error);
          const cleanMessage = (error?.message || "Authentication failed").replace(/[\r\n]+/g, " ");
          throw new Error(cleanMessage);
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;

        try {
          const emailClean = user.email.toLowerCase();

          const existingUser = await prisma.user.findUnique({
            where: { email: emailClean },
          });

          if (!existingUser) {
            await prisma.user.create({
              data: {
                email: emailClean,
                name: user.name || "",
                image: user.image || "",
                userType: "CLIENT",
                planType: "APPLIED",
              },
            });
          }
        } catch (error) {
          console.error("Error saving Google user to DB:", error);
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const loginUser = user.email
          ? await prisma.user.findUnique({
              where: { email: user.email.toLowerCase() },
              select: { id: true },
            })
          : await prisma.user.findUnique({
              where: { id: user.id },
              select: { id: true },
            });
        if (!loginUser) throw new Error("Authenticated user record not found");

        token.id = loginUser.id;
        token.userType = (user as any).userType;
        token.planType = (user as any).planType;
        const activated = await prisma.user.update({
          where: { id: loginUser.id },
          data: { sessionVersion: { increment: 1 } },
          select: { sessionVersion: true },
        });
        token.sessionVersion = activated.sessionVersion;
      }
      if (token.id || token.email) {
        try {
          const dbUser = typeof token.id === "string"
            ? await prisma.user.findUnique({ where: { id: token.id } })
            : token.email
              ? await prisma.user.findUnique({
                  where: { email: token.email.toLowerCase() },
                })
              : null;
          if (dbUser) {
            token.id = dbUser.id;
            token.name = dbUser.name ?? undefined;
            token.image = dbUser.image ?? undefined;
            token.userType = dbUser.userType;
            token.planType = dbUser.planType ?? undefined;
            if (typeof token.sessionVersion !== "number") {
              // Tokens created before single-device login must stay at the
              // initial version so the next login invalidates them.
              token.sessionVersion = 0;
            }
            token.sessionRevoked = token.sessionVersion !== dbUser.sessionVersion;
          }
        } catch (error) {
          console.error("Error loading user in JWT callback:", error);
        }
      }
      const userId = typeof token.id === "string" ? token.id : undefined;
      if (userId && token.userType !== "ADMIN") {
        try {
          const planType = await expirePaidUserIfNeeded(userId);
          if (planType) token.planType = planType;
        } catch (error) {
          console.error("Error checking user subscription expiry:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sessionRevoked) return null as any;
      if (session.user) {
        session.user.id = token.id;
        session.user.userType = token.userType;
        session.user.planType = token.planType;

        const userId = typeof token.id === "string" ? token.id : undefined;
        if (userId && session.user.userType !== "ADMIN") {
          try {
            const planType = await expirePaidUserIfNeeded(userId);
            if (planType) {
              session.user.planType = planType;
              token.planType = planType;
            }
          } catch (error) {
            console.error("Error checking user subscription expiry:", error);
          }
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "smartflowalgo_secret_key_2026",
};
