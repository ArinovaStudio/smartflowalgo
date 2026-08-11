import React from "react";
import OfficialMembershipPlans from "@/components/OfficialMembershipPlans";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Official Membership Plans | SmartFlowAlgo",
  description: "Explore official SFA membership plans including Indicator + Scanner VIP, Gold Research, $20 to $10k Challenge, and SFA EA.",
};

export default function PlansPage() {
  return (
    <main className="min-h-screen py-6 sm:py-10">
      <OfficialMembershipPlans />
    </main>
  );
}