import React, { useState } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { plans, comparisonTable, Plan } from "../data/plans";
import CurrencyToggle from "./CurrencyToggle";

interface PricingCardsProps {
  id?: string;
  selectedCurrency: "USD" | "GBP" | "INR";
  onCurrencyChange: (currency: "USD" | "GBP" | "INR") => void;
  onSelectPlan?: (planId: string) => void;
  onJoinTelegram?: () => void;
}

export default function PricingCards({
  id = "pricing-section",
  selectedCurrency,
  onCurrencyChange,
  onSelectPlan,
  onJoinTelegram
}: PricingCardsProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const formatPrice = (plan: Plan, currency: "USD" | "GBP" | "INR") => {
    const curObj = plan.pricing[currency];
    const symbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "₹";
    
    if (curObj.price === 0) return "Free";

    let price = curObj.price;
    if (billingPeriod === "yearly") {
      price = Math.floor(price * 0.8); // 20% discount
    }

    return `${symbol}${price.toLocaleString()}`;
  };

  return (
    <div id={id} className="space-y-12">
      {/* Pricing Header Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Choose Your Learning Track</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Select a pricing model in your preferred currency — all paid plans include a <span className="text-emerald-500 dark:text-emerald-400 font-bold">7-day free trial</span></p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Billing Period Toggle */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                billingPeriod === "monthly"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                billingPeriod === "yearly"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Yearly
              <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none scale-90">
                -20%
              </span>
            </button>
          </div>

          {/* Currency Toggle */}
          <CurrencyToggle selectedCurrency={selectedCurrency} onCurrencyChange={onCurrencyChange} />
        </div>
      </div>

      {/* Grid of Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isPopular = plan.popular;
          return (
            <div
              key={plan.id}
              id={`pricing-card-${plan.id}`}
              className={`relative flex flex-col rounded-2xl border transition-all hover:translate-y-[-4px] duration-200 ${
                isPopular
                  ? "border-blue-500 dark:border-emerald-500/50 bg-blue-50/30 dark:bg-gradient-to-br dark:from-[#050B1D] dark:to-[#0A1020] shadow-lg dark:shadow-emerald-950/10 scale-100 lg:scale-[1.03] z-10"
                  : "border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#050B1D]/40"
              }`}
            >
              {/* Popular Badge */}
              {isPopular && (
                <div className="absolute top-0 right-1/2 translate-x-1/2 translate-y-[-50%] bg-blue-600 dark:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1 shadow-sm leading-none whitespace-nowrap">
                  <Sparkles className="h-3 w-3" />
                  Most Popular
                </div>
              )}

              {/* Plan Details */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 min-h-10">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{plan.name}</h4>
                    {plan.badge && (
                      <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 leading-none shrink-0 whitespace-nowrap">
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  {/* Pricing Display */}
                  <div className="mt-4 flex flex-col gap-1">
                    <div>
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                        {formatPrice(plan, selectedCurrency)}
                      </span>
                      {plan.pricing[selectedCurrency].price > 0 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-1.5 font-medium">
                          /{billingPeriod === "yearly" ? "mo billed annually" : "month"}
                        </span>
                      )}
                    </div>
                    {plan.pricing[selectedCurrency].price > 0 && (
                      <div className="mt-1 self-start inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <Sparkles className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span>7 Days Free Trial</span>
                      </div>
                    )}
                  </div>

                  {/* Bullet points */}
                  <ul className="mt-6 space-y-3 flex-1">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Call To Action Buttons */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                  {plan.id === "free-telegram" ? (
                    <a
                      href="https://t.me/smartflowalgo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center py-2.5 rounded-lg font-bold bg-blue-600 hover:bg-blue-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white shadow-sm transition-all text-xs cursor-pointer uppercase tracking-wider"
                      id={`btn-cta-${plan.id}`}
                    >
                      Join Free Telegram
                    </a>
                  ) : (
                    <button
                      onClick={() => onSelectPlan && onSelectPlan(plan.id)}
                      type="button"
                      className={`w-full py-2.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        isPopular
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-emerald-600 dark:to-emerald-500 hover:from-blue-700 hover:to-indigo-700 dark:hover:from-emerald-500 dark:hover:to-emerald-400 text-white shadow-md uppercase tracking-wider animate-pulse"
                          : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 uppercase tracking-wider"
                      }`}
                      id={`btn-cta-${plan.id}`}
                    >
                      Start 7-Day Free Trial
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="mt-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h4 className="text-lg font-bold text-slate-900 dark:text-white">Feature Comparison Table</h4>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Review plan levels side-by-side to find your ideal fit.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="p-4 pl-6">Feature Core Capability</th>
                <th className="p-4 text-center">Indicator + Scanner VIP</th>
                <th className="p-4 text-center">SFA Gold Research</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {comparisonTable.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 text-slate-700 dark:text-slate-300">
                  <td className="p-4 pl-6 font-medium text-slate-900 dark:text-white">{row.feature}</td>
                  
                  {/* Indicator VIP */}
                  <td className="p-4 text-center">
                    {typeof row.indicatorVip === "boolean" ? (
                      row.indicatorVip ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-rose-500 mx-auto" />
                    ) : (
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{row.indicatorVip}</span>
                    )}
                  </td>

                  {/* Gold Research */}
                  <td className="p-4 text-center">
                    {typeof row.goldResearch === "boolean" ? (
                      row.goldResearch ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-rose-500 mx-auto" />
                    ) : (
                      <span className="font-bold text-amber-600 dark:text-amber-400">{row.goldResearch}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
