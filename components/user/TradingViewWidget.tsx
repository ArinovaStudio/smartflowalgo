"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";

interface TradingViewWidgetProps {
  symbol?: string;
  interval?: string;
  theme?: "dark" | "light";
  activeIndicators?: Array<{
    id: string;
    name: string;
    tradingViewId?: string | null;
  }>;
}

export default function TradingViewWidget({
  symbol = "FX:USDJPY",
  interval = "1",
  theme = "dark",
  activeIndicators = [],
}: TradingViewWidgetProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Construct official high-performance TradingView embed URL
  const studiesParam = encodeURIComponent(
    JSON.stringify([
      "STD;Supertrend",
      "STD;EMA",
      "STD;RSI",
      "STD;MACD",
      "STD;Volume",
    ])
  );

  const embedUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=${encodeURIComponent(
    symbol || "FX:USDJPY"
  )}&interval=${interval || "1"}&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=131722&studies=${studiesParam}&theme=${
    theme || "dark"
  }&style=1&timezone=Asia%2FKolkata&withdateranges=1&showpopupbutton=1&details=1&hotlist=1&calendar=1&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart`;

  return (
    <div className="relative w-full h-full min-h-[650px] flex-1 flex flex-col rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-2xl">
      {!iframeLoaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <p className="text-xs font-semibold tracking-wide">Loading TradingView Live Platform...</p>
        </div>
      )}

      <iframe
        id="tradingview_widget"
        src={embedUrl}
        className="w-full h-full min-h-[640px] flex-1 border-0"
        allow="clipboard-write"
        allowFullScreen
        onLoad={() => setIframeLoaded(true)}
      />
    </div>
  );
}
