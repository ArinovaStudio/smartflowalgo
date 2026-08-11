import type { Metadata } from "next";
import PlansManagement from "@/sections/other/PlansManagement";

export const metadata: Metadata = {
  title: "Plan & Subscription Management | Admin",
};

export default function AdminPlansPage() {
  return <PlansManagement />;
}
