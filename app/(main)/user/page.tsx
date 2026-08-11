import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UserDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Welcome, {session.user?.name || "Trader"}
        </h1>
        <p className="text-slate-500 text-sm">
          Your SmartflowAlgo user dashboard is coming soon.
        </p>
      </div>
    </main>
  );
}
