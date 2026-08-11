import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      userType?: string;
      planType?: string;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    userType?: string;
    planType?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    userType?: string;
    planType?: string;
  }
}
