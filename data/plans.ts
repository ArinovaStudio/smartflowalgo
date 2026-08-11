export interface Plan {
  id: string;
  name: string;
  badge?: string;
  pricing: {
    USD: { price: number; period: string };
    GBP: { price: number; period: string };
    INR: { price: number; period: string };
  };
  features: string[];
  popular?: boolean;
}

export const plans: Plan[] = [
  {
    id: "indicator-scanner-vip",
    name: "INDICATOR + SCANNER VIP",
    badge: "Most Popular",
    popular: true,
    pricing: {
      USD: { price: 42, period: "month" },
      GBP: { price: 33, period: "month" },
      INR: { price: 3499, period: "month" }
    },
    features: [
      "4 Private SFA Indicators",
      "SFA Premium Scanner",
      "Indian Market Included",
      "VIP Telegram Channel Access",
      "1-to-1 Member Plan Discussion",
      "Copy Trading Access",
      "24/7 Support"
    ]
  },
  {
    id: "gold-research-vip",
    name: "SFA GOLD RESEARCH",
    badge: "Gold VIP",
    pricing: {
      USD: { price: 72, period: "month" },
      GBP: { price: 58, period: "month" },
      INR: { price: 6000, period: "month" }
    },
    features: [
      "Private Website Access",
      "24/7 Gold Research & Setups",
      "Full Zone Map",
      "Strike Signals",
      "Swing Signals",
      "Multi-Timeframe Signals",
      "Magnet Zones",
      "VIP Telegram Channel Access",
      "1-to-1 Member Plan Discussion",
      "Copy Trading Access",
      "24/7 Support"
    ]
  },
  {
    id: "challenge-launch-free",
    name: "$20 → $10,000 CHALLENGE",
    badge: "Launch Gift",
    pricing: {
      USD: { price: 0, period: "launch" },
      GBP: { price: 0, period: "launch" },
      INR: { price: 0, period: "launch" }
    },
    features: [
      "FREE for active SFA members during launch",
      "Compounding setup roadmap",
      "Risk & position sizing rules",
      "Separate paid plan starting next month"
    ]
  },
  {
    id: "sfa-ea-free",
    name: "SFA EA — FREE",
    badge: "Broker Partner",
    pricing: {
      USD: { price: 0, period: "forever" },
      GBP: { price: 0, period: "forever" },
      INR: { price: 0, period: "forever" }
    },
    features: [
      "100% Free via Partner Broker link",
      "Automated execution algorithms",
      "Approved broker setup support",
      "24/7 Support"
    ]
  }
];

export const comparisonTable = [
  { feature: "Private SFA Indicators (4)", indicatorVip: true, goldResearch: true },
  { feature: "SFA Premium Scanner", indicatorVip: true, goldResearch: true },
  { feature: "Indian Market Included", indicatorVip: true, goldResearch: true },
  { feature: "VIP Telegram Channel Access", indicatorVip: true, goldResearch: true },
  { feature: "1-to-1 Member Plan Discussion", indicatorVip: true, goldResearch: true },
  { feature: "Copy Trading Access", indicatorVip: true, goldResearch: true },
  { feature: "24/7 Support", indicatorVip: true, goldResearch: true },
  { feature: "Private Website Access", indicatorVip: false, goldResearch: true },
  { feature: "24/7 Gold Research & Setups", indicatorVip: false, goldResearch: true },
  { feature: "Full Zone Map & Magnet Zones", indicatorVip: false, goldResearch: true },
  { feature: "Strike & Multi-Timeframe Signals", indicatorVip: false, goldResearch: true },
  { feature: "$20 → $10,000 Challenge Access", indicatorVip: "Launch Free", goldResearch: "Launch Free" },
  { feature: "SFA EA (Bot)", indicatorVip: "Via Partner", goldResearch: "Via Partner" }
];
