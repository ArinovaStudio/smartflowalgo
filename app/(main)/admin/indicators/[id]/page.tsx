import type { Metadata } from "next";
import IndicatorDetailView from "@/sections/other/IndicatorDetailView";

export const metadata: Metadata = {
  title: "Indicator Control Center | Admin",
  description: "Detailed indicator specs, versioning, plan access matrix, and individual user permissions.",
};

export default async function IndicatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IndicatorDetailView indicatorId={id} />;
}
