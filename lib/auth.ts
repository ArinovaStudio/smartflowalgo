import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
                planType: "FREE",
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
        token.id = user.id;
        token.userType = (user as any).userType;
        token.planType = (user as any).planType;
      }
      if (token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email.toLowerCase() },
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.name = dbUser.name ?? undefined;
            token.image = dbUser.image ?? undefined;
            token.userType = dbUser.userType;
            token.planType = dbUser.planType ?? undefined;
          }
        } catch (error) {
          console.error("Error loading user in JWT callback:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.userType = token.userType;
        session.user.planType = token.planType;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "smartflowalgo_secret_key_2026",
};
