import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * GET /api/auth/redirect
 * Used as the callbackUrl for Google OAuth sign-in.
 * Reads the server session's userType and redirects accordingly:
 *   - ADMIN  → /admin
 *   - others → /user
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const userType = (session.user as any)?.userType;
  if (userType === "ADMIN") {
    redirect("/admin");
  } else {
    redirect("/user");
  }
}
