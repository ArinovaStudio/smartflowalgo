import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import PromotersTable from "@/sections/other/PromotersTable";

export const metadata: Metadata = {
  title: "Promoters | Admin",
};

const PAGE_SIZE = 10;

export default async function AdminPromotersPage() {
  const [promoters, total] = await Promise.all([
    prisma.user.findMany({
      where: { userType: "INFULENCER" },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: {
        _count: { select: { referrals: true } },
      },
    }),
    prisma.user.count({ where: { userType: "INFULENCER" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
        Promoters
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Influencers and partners promoting SmartFlowAlgo.
      </p>

      <div className="mt-6">
        <PromotersTable
          initialData={promoters.map(({ _count, ...promoter }) => ({
            ...promoter,
            createdAt: promoter.createdAt.toISOString(),
            updatedAt: promoter.updatedAt.toISOString(),
            referralCount: _count.referrals,
          }))}
          initialTotal={total}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}