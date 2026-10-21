"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const SIDEBAR_KEY = "admin-sidebar-collapsed";

export default function AdminContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChartPage = pathname === "/admin/terminal/chart";
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Read initial state
    const read = () => {
      const val = localStorage.getItem(SIDEBAR_KEY);
      setCollapsed(val === "true");
    };
    read();

    // Watch for changes (sidebar writes to localStorage)
    const onStorage = (e: StorageEvent) => {
      if (e.key === SIDEBAR_KEY) setCollapsed(e.newValue === "true");
    };

    // Also poll every 200ms so same-tab changes are reflected
    const interval = setInterval(read, 200);
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const effectiveCollapsed = isChartPage || collapsed;

  if (isChartPage) {
    return (
      <main
        className={`flex h-screen max-h-screen flex-col overflow-hidden bg-slate-100 pt-14 transition-[margin] duration-300 dark:bg-slate-950 ${
          effectiveCollapsed ? "md:ml-16" : "md:ml-64"
        }`}
      >
        <div className="w-full flex-1 min-h-0 p-1.5 sm:p-2 overflow-hidden flex flex-col">
          {children}
        </div>
      </main>
    );
  }

  return (
    <main
      className={`min-h-screen bg-slate-100 pt-16 transition-[margin] duration-300 dark:bg-slate-950 ${
        effectiveCollapsed ? "md:ml-16" : "md:ml-64"
      }`}
    >
      <div className="p-4 sm:p-6 lg:p-8 mx-auto w-full max-w-[1750px]">{children}</div>
    </main>
  );
}
