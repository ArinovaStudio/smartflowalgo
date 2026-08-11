import type { Metadata } from "next";
import UserManagement from "@/sections/other/UserManagement";

export const metadata: Metadata = {
  title: "User Management | Admin",
};

export default function AdminUsersPage() {
  return <UserManagement />;
}
