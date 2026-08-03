"use client";


import LeadsTable from "@/sections/other/LeadsTable";


export default function AdminLeadsPage() {

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Checkout Leads</h1>
      <p className="mt-1 text-sm text-slate-400">
        Everyone who has submitted the checkout form — free and paid.
      </p>

      <div className="mt-6">
        <LeadsTable
          initialData={[]}
          initialTotal={10}
          pageSize={1}
        />
      </div>
    </div>
  );
}