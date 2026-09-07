"use client";

import React, { useState } from "react";
import LightweightChartWidget, { IndicatorMeta } from "./LightweightChartWidget";

interface TradingViewWidgetProps {
  symbol?: string;
  interval?: string;
  theme?: "dark" | "light";
  activeIndicators?: Array<IndicatorMeta>;
}

export default function TradingViewWidget({
  symbol = "XAUUSD",
  interval = "1m",
  theme = "dark",
  activeIndicators = [],
}: TradingViewWidgetProps) {
  return (
    <div className="relative w-full h-full min-h-0 flex-1 flex flex-col rounded-2xl overflow-hidden shadow-2xl">
      <LightweightChartWidget
        initialSymbol={symbol.replace("FX:", "")}
        initialTimeframe={interval === "1" ? "1m" : interval}
        theme={theme}
        activeIndicators={activeIndicators}
      />
    </div>
  );
}
