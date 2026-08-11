"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, Menu, Megaphone, Users, X, LogOut, Loader2 } from "lucide-react";

const NAV_ITEMS = [
  { label: "Checkout Leads", href: "/admin", icon: Users },
  { label: "Promoters", href: "/admin/promoters", icon: Megaphone },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // Overwrite cached Basic Auth credentials with bad ones.
      // Works in some browsers, not guaranteed in all.
      await fetch("/admin", {
        headers: { Authorization: "Basic " + btoa("logout:logout") },
      });
    } catch (err) {
      console.error("Sign out failed:", err);
    } finally {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 md:hidden">
        <span className="text-sm font-semibold text-white">SmartFlowAlgo Admin</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md p-2 text-slate-400 hover:bg-slate-900 hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur transition-transform duration-300 ease-in-out md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-white">SmartFlowAlgo</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive
                  ? "bg-sky-500/10 text-sky-400"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                  }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 px-3 py-4">
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            {signingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
          <div className="mt-3 px-3 text-xs text-slate-500">Admin Panel</div>
        </div>
      </aside>
    </>
  );
}