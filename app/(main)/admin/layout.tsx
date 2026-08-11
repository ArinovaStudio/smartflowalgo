import type { ReactNode } from "react";
import AdminSidebar from "@/sections/other/AdminSidebar";
import AdminContentWrapper from "@/components/admin/AdminContentWrapper";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950">
      <AdminSidebar />
      <AdminContentWrapper>{children}</AdminContentWrapper>
    </div>
  );
}