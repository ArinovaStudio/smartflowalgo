import type { Metadata } from "next";
import IndicatorManagement from "@/sections/other/IndicatorManagement";

export const metadata: Metadata = {
  title: "Indicator Management | Admin",
  description: "Manage TradingView indicators, versions, subscription plans, and user access permissions.",
};

export default function AdminIndicatorsPage() {
  return <IndicatorManagement />;
}
