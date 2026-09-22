// Curated notes for the details panel.
//
// Forex Factory's public JSON feed only has the time, currency, impact,
// forecast and previous values. Everything else in the details panel (what the
// event is, who publishes it, why traders care) comes from this file.
//
// Rules are checked top to bottom and the first match wins, so put specific
// patterns (e.g. ADP) above general ones (e.g. Non-Farm). Add your own entries
// at any time. Titles come straight from the feed.

export type UsualEffect = "higher" | "lower";

export interface EventInfo {
  name: string;
  description: string;
  source?: string;
  measures?: string;
  usualEffect?: UsualEffect;
  frequency?: string;
  alsoCalled?: string;
  whyTradersCare: string;
  notes?: string;
}

interface Rule {
  match: RegExp;
  /** The facts below are specific to US releases, so only show them for USD. */
  usdOnly?: boolean;
  info: EventInfo;
}

const RULES: Rule[] = [
  // ── Labor market ──────────────────────────────────────────────
  {
    match: /adp/i,
    usdOnly: true,
    info: {
      name: "ADP Non-Farm Employment Change",
      description:
        "Private-sector payroll estimate built from ADP's payroll data, published ahead of the official jobs report.",
      source: "ADP Research",
      measures:
        "Change in the number of employed people during the previous month, excluding the farming industry and government.",
      usualEffect: "higher",
      frequency: "Monthly, usually the Wednesday before the official jobs report",
      alsoCalled: "ADP National Employment Report",
      whyTradersCare:
        "It is an early read on the official jobs report, although the two figures often diverge.",
    },
  },
  {
    match: /average hourly earnings/i,
    usdOnly: true,
    info: {
      name: "Average Hourly Earnings m/m",
      description: "Monthly change in the average hourly wage paid to workers, from the jobs report.",
      source: "US Bureau of Labor Statistics",
      measures: "Change in the price businesses pay for labor, excluding the farming industry.",
      usualEffect: "higher",
      frequency: "Monthly, released together with Non-Farm Employment Change",
      whyTradersCare:
        "Wage growth feeds consumer spending and inflation, and inflation is what drives interest-rate decisions.",
    },
  },
  {
    match: /non-?farm/i,
    usdOnly: true,
    info: {
      name: "Non-Farm Employment Change",
      description:
        "Headline payroll figure from the monthly Employment Situation report, based on a survey of businesses and government agencies.",
      source: "US Bureau of Labor Statistics",
      measures:
        "Change in the number of employed people during the previous month, excluding the farming industry.",
      usualEffect: "higher",
      frequency: "Monthly, usually on the first Friday of the month",
      alsoCalled: "NFP, Nonfarm Payrolls",
      whyTradersCare:
        "Job creation is a leading indicator of consumer spending, which drives most economic activity. It is one of the most closely watched releases and often causes sharp, short-lived volatility.",
      notes:
        "Released together with the unemployment rate and average hourly earnings. Revisions to prior months can move markets as much as the headline number.",
    },
  },
  {
    match: /unemployment rate/i,
    usdOnly: true,
    info: {
      name: "Unemployment Rate",
      description: "Share of the labor force that is jobless and actively looking for work.",
      source: "US Bureau of Labor Statistics",
      measures:
        "Percentage of the total workforce that is unemployed and actively seeking employment during the previous month.",
      usualEffect: "lower",
      frequency: "Monthly, released together with Non-Farm Employment Change",
      whyTradersCare:
        "Labor market health is a key input for consumer spending and central bank policy.",
    },
  },
  {
    match: /unemployment claims|jobless claims/i,
    usdOnly: true,
    info: {
      name: "Unemployment Claims",
      description:
        "Weekly count of people filing for unemployment benefits for the first time.",
      source: "US Department of Labor",
      measures:
        "Number of individuals who filed for unemployment insurance for the first time during the past week.",
      usualEffect: "lower",
      frequency: "Weekly, on Thursdays",
      alsoCalled: "Initial Jobless Claims",
      notes:
        "Holidays and seasonal factors can distort single weeks, so the four-week average is often a better guide.",
      whyTradersCare:
        "It is the most timely read on the labor market. Single weeks are noisy, so traders watch the trend.",
    },
  },
  {
    match: /jolts/i,
    usdOnly: true,
    info: {
      name: "JOLTS Job Openings",
      description: "Survey of unfilled job openings across the US economy.",
      source: "US Bureau of Labor Statistics",
      measures: "Total number of job openings on the last business day of the month.",
      usualEffect: "higher",
      frequency: "Monthly",
      alsoCalled: "Job Openings and Labor Turnover Survey",
      whyTradersCare:
        "Openings show how much demand there is for workers, which is a leading signal for hiring and wage pressure.",
    },
  },

  // ── Inflation ─────────────────────────────────────────────────
  {
    match: /\bcpi\b/i,
    usdOnly: true,
    info: {
      name: "Consumer Price Index",
      description:
        "Change in the prices consumers pay for a basket of goods and services. The core version excludes food and energy, whose prices are volatile.",
      source: "US Bureau of Labor Statistics",
      measures: "Change in the price of goods and services purchased by consumers.",
      usualEffect: "higher",
      frequency: "Monthly, about two weeks after the month ends",
      alsoCalled: "Consumer Price Index, Inflation",
      notes:
        "Headline and core figures are published together. Markets usually focus on the core reading and on the monthly change rather than the yearly one.",
      whyTradersCare:
        "Consumer prices make up most of overall inflation, and rising inflation pushes central banks toward higher interest rates, which tends to lift the currency.",
    },
  },
  {
    match: /\bppi\b/i,
    usdOnly: true,
    info: {
      name: "Producer Price Index",
      description:
        "Change in the prices producers receive for finished goods and services at the wholesale level.",
      source: "US Bureau of Labor Statistics",
      measures: "Change in the selling price of goods and services sold by producers.",
      usualEffect: "higher",
      frequency: "Monthly",
      whyTradersCare:
        "Producer costs tend to pass through to consumer prices, so PPI is often read as a lead indicator for CPI.",
    },
  },
  {
    match: /pce/i,
    usdOnly: true,
    info: {
      name: "PCE Price Index",
      description:
        "Change in the prices of goods and services consumers buy, as measured by personal consumption expenditures. The core version excludes food and energy.",
      source: "US Bureau of Economic Analysis",
      measures: "Change in the price of goods and services purchased by consumers.",
      usualEffect: "higher",
      frequency: "Monthly, in the Personal Income and Outlays report",
      alsoCalled: "Personal Consumption Expenditures",
      notes:
        "Published near the end of the month, after CPI and PPI. Much of it can be estimated from those reports, so surprises are usually small.",
      whyTradersCare:
        "The Federal Reserve's 2% inflation target is defined on the PCE index, so it directly shapes rate expectations.",
    },
  },

  // ── Growth and spending ───────────────────────────────────────
  {
    match: /retail sales/i,
    usdOnly: true,
    info: {
      name: "Retail Sales m/m",
      description:
        "Change in the total value of sales at retail stores. The core version excludes autos.",
      source: "US Census Bureau",
      measures: "Change in the total value of sales at the retail level.",
      usualEffect: "higher",
      frequency: "Monthly, about two weeks after the month ends",
      alsoCalled: "Advance Retail Sales",
      whyTradersCare:
        "Consumer spending accounts for the majority of economic activity, so retail sales are the primary gauge of it.",
      notes:
        "It is the first broad look at consumer spending for the month, published well before most other spending data. The headline figure is not adjusted for inflation, so rising prices can flatter it.",
    },
  },
  {
    match: /gdp q\/q/i,
    usdOnly: true,
    info: {
      name: "Gross Domestic Product q/q",
      description:
        "Annualized change in the inflation-adjusted value of all goods and services produced by the economy.",
      source: "US Bureau of Economic Analysis",
      measures:
        "Annualized change in the inflation-adjusted value of all goods and services produced by the economy.",
      usualEffect: "higher",
      frequency: "Quarterly, published as an advance, a second (preliminary) and a third (final) estimate",
      whyTradersCare:
        "It is the broadest measure of economic activity and the primary gauge of the economy's health. The advance estimate usually moves markets the most.",
      notes:
        "The figure is annualized, so a 0.5% quarterly gain is reported as roughly 2%. Later estimates revise the advance number as more data arrives.",
    },
  },
  {
    match: /durable goods/i,
    usdOnly: true,
    info: {
      name: "Durable Goods Orders m/m",
      description:
        "Change in new orders placed with manufacturers for long-lasting goods. The core version excludes transportation.",
      source: "US Census Bureau",
      measures:
        "Change in the total value of new purchase orders placed with manufacturers for durable goods.",
      usualEffect: "higher",
      frequency: "Monthly",
      whyTradersCare:
        "Orders are a leading indicator of manufacturing output and business investment.",
    },
  },
  {
    match: /trade balance/i,
    usdOnly: true,
    info: {
      name: "Trade Balance",
      description: "Difference between the value of goods and services exported and imported.",
      source: "US Census Bureau and US Bureau of Economic Analysis",
      measures:
        "Difference in value between imports and exports of goods and services during the reported month.",
      usualEffect: "higher",
      frequency: "Monthly",
      whyTradersCare:
        "Export demand supports the currency, so a shrinking deficit is generally read as positive.",
    },
  },
  {
    match: /industrial production/i,
    usdOnly: true,
    info: {
      name: "Industrial Production m/m",
      description: "Change in the output of factories, mines and utilities.",
      source: "US Federal Reserve Board",
      measures:
        "Change in the total inflation-adjusted value of output produced by manufacturers, mines and utilities.",
      usualEffect: "higher",
      frequency: "Monthly",
      whyTradersCare: "Industrial output is a key input for the strength of the broader economy.",
    },
  },

  // ── Surveys and sentiment ─────────────────────────────────────
  {
    match: /\bism\b/i,
    usdOnly: true,
    info: {
      name: "ISM PMI",
      description:
        "Survey of purchasing managers on business conditions. A reading above 50 signals expansion and below 50 contraction.",
      source: "Institute for Supply Management",
      measures:
        "Level of a diffusion index based on surveyed purchasing managers in the manufacturing or services sector.",
      usualEffect: "higher",
      frequency: "Monthly",
      alsoCalled: "Purchasing Managers' Index",
      whyTradersCare:
        "Purchasing managers have firsthand knowledge of their company's conditions, which makes the survey a timely read on the economy.",
    },
  },
  {
    match: /flash (manufacturing|services) pmi|s&p global/i,
    usdOnly: true,
    info: {
      name: "S&P Global Flash PMI",
      description:
        "Early estimate of a business survey, published before the final monthly figure. Above 50 signals expansion.",
      source: "S&P Global",
      measures:
        "Level of a diffusion index based on surveyed purchasing managers in the manufacturing or services sector.",
      usualEffect: "higher",
      frequency: "Monthly, released around the 20th",
      whyTradersCare:
        "Flash readings are among the earliest hard numbers on the month's business conditions.",
    },
  },
  {
    match: /empire state/i,
    usdOnly: true,
    info: {
      name: "Empire State Manufacturing Index",
      description: "Survey of manufacturers in New York State about current business conditions.",
      source: "Federal Reserve Bank of New York",
      measures:
        "Level of a diffusion index based on surveyed manufacturers in New York State.",
      usualEffect: "higher",
      frequency: "Monthly",
      whyTradersCare: "It is one of the first regional surveys each month, so it hints at national manufacturing trends.",
    },
  },
  {
    match: /philly fed/i,
    usdOnly: true,
    info: {
      name: "Philly Fed Manufacturing Index",
      description: "Survey of manufacturers in the Philadelphia Fed district about business conditions.",
      source: "Federal Reserve Bank of Philadelphia",
      measures:
        "Level of a diffusion index based on surveyed manufacturers in the Philadelphia region.",
      usualEffect: "higher",
      frequency: "Monthly",
      whyTradersCare: "Regional surveys give an early read on national manufacturing activity.",
    },
  },
  {
    match: /uom inflation expectations/i,
    usdOnly: true,
    info: {
      name: "UoM Inflation Expectations",
      description: "Survey of how much consumers expect prices to rise.",
      source: "University of Michigan, Surveys of Consumers",
      usualEffect: "higher",
      frequency: "Monthly, with a preliminary and a revised reading",
      whyTradersCare:
        "Central banks watch inflation expectations closely because they can become self-fulfilling.",
    },
  },
  {
    match: /uom consumer sentiment/i,
    usdOnly: true,
    info: {
      name: "UoM Consumer Sentiment",
      description: "Survey of how consumers feel about their finances and the economy.",
      source: "University of Michigan, Surveys of Consumers",
      measures: "Level of a composite index based on surveyed consumers.",
      usualEffect: "higher",
      frequency: "Monthly, with a preliminary and a revised reading",
      whyTradersCare:
        "Consumer spending drives most economic activity, and sentiment is a leading indicator of it.",
    },
  },
  {
    match: /cb consumer confidence/i,
    usdOnly: true,
    info: {
      name: "CB Consumer Confidence",
      description: "Survey of consumers' views on business conditions and the labor market.",
      source: "The Conference Board",
      measures: "Level of a composite index based on surveyed consumers.",
      usualEffect: "higher",
      frequency: "Monthly",
      whyTradersCare:
        "Confident consumers spend more, and consumer spending drives most economic activity.",
    },
  },

  // ── Housing ───────────────────────────────────────────────────
  {
    match: /housing starts/i,
    usdOnly: true,
    info: {
      name: "Housing Starts",
      description: "Annualized number of new residential buildings that began construction.",
      source: "US Census Bureau",
      usualEffect: "higher",
      frequency: "Monthly",
      whyTradersCare: "Housing construction is sensitive to interest rates and reflects confidence in the economy.",
    },
  },
  {
    match: /building permits/i,
    usdOnly: true,
    info: {
      name: "Building Permits",
      description: "Annualized number of new building permits issued for residential construction.",
      source: "US Census Bureau",
      usualEffect: "higher",
      frequency: "Monthly",
      whyTradersCare: "Permits precede construction, so they lead housing starts.",
    },
  },
  {
    match: /existing home sales/i,
    usdOnly: true,
    info: {
      name: "Existing Home Sales",
      description: "Annualized number of previously owned homes sold during the month.",
      source: "National Association of Realtors",
      usualEffect: "higher",
      frequency: "Monthly",
      whyTradersCare: "Resales make up most of the housing market and reflect consumer confidence and mortgage costs.",
    },
  },
  {
    match: /new home sales/i,
    usdOnly: true,
    info: {
      name: "New Home Sales",
      description: "Annualized number of newly built single-family homes sold during the month.",
      source: "US Census Bureau",
      usualEffect: "higher",
      frequency: "Monthly",
      whyTradersCare: "New home sales are a leading indicator of the health of the housing sector.",
    },
  },

  // ── Energy and Treasury ───────────────────────────────────────
  {
    match: /crude oil inventories/i,
    usdOnly: true,
    info: {
      name: "Crude Oil Inventories",
      description: "Weekly change in the amount of crude oil held in US commercial storage.",
      source: "US Energy Information Administration",
      measures:
        "Change in the number of barrels of crude oil held in inventory by commercial firms during the past week.",
      usualEffect: "lower",
      frequency: "Weekly, on Wednesdays",
      whyTradersCare:
        "Inventories reflect the balance of supply and demand for oil, which affects energy prices and inflation.",
    },
  },
  {
    match: /bond auction|note auction|bill auction/i,
    usdOnly: true,
    info: {
      name: "Treasury Auction",
      description: "Auction of US government debt to investors.",
      source: "US Department of the Treasury",
      measures:
        "Average yield of the securities sold, alongside the bid-to-cover ratio (demand relative to the amount offered).",
      usualEffect: "higher",
      frequency: "Varies by security",
      whyTradersCare:
        "Demand at auction shows how willing investors are to fund the government, and yields feed through to borrowing costs across the economy.",
    },
  },

  // ── Federal Reserve ───────────────────────────────────────────
  {
    match: /federal funds rate/i,
    usdOnly: true,
    info: {
      name: "Federal Funds Rate",
      description: "The Federal Reserve's main policy rate, set by the FOMC.",
      source: "US Federal Reserve",
      measures:
        "Target interest rate at which banks lend reserve balances to each other overnight.",
      usualEffect: "higher",
      frequency: "8 scheduled meetings per year",
      whyTradersCare:
        "Interest rates are the primary driver of currency valuation: higher rates attract foreign capital seeking better returns.",
      notes:
        "Markets usually price in the decision beforehand, so the reaction depends on how the outcome compares to expectations.",
    },
  },
  {
    match: /fomc statement/i,
    usdOnly: true,
    info: {
      name: "FOMC Statement",
      description:
        "Written statement published after each policy meeting, explaining the rate decision and the committee's outlook.",
      source: "US Federal Reserve",
      frequency: "8 times per year",
      whyTradersCare:
        "Changes in the wording often signal shifts in future policy and can move markets sharply.",
    },
  },
  {
    match: /fomc press conference/i,
    usdOnly: true,
    info: {
      name: "FOMC Press Conference",
      description:
        "The Fed Chair explains the decision and answers journalists' questions after the policy meeting.",
      source: "US Federal Reserve",
      frequency: "8 times per year",
      whyTradersCare:
        "The tone and unscripted answers can change rate expectations, so this often causes larger moves than the statement itself.",
    },
  },
  {
    match: /fomc (meeting )?minutes/i,
    usdOnly: true,
    info: {
      name: "FOMC Meeting Minutes",
      description: "Detailed record of the most recent FOMC policy meeting.",
      source: "US Federal Reserve",
      frequency: "8 times per year, three weeks after each meeting",
      whyTradersCare:
        "The minutes show how divided the committee was and hint at the direction of future rate decisions.",
    },
  },
  {
    match: /fomc economic projections/i,
    usdOnly: true,
    info: {
      name: "FOMC Economic Projections",
      description:
        "Committee members' projections for growth, unemployment, inflation and the policy rate.",
      source: "US Federal Reserve",
      frequency: "Quarterly, at the March, June, September and December meetings",
      alsoCalled: "Dot plot",
      whyTradersCare:
        "The projected path of interest rates guides market expectations for the coming years.",
    },
  },
  {
    match: /beige book/i,
    usdOnly: true,
    info: {
      name: "Fed Beige Book",
      description:
        "Summary of economic conditions in each of the Federal Reserve's twelve districts, based on interviews with businesses.",
      source: "US Federal Reserve",
      frequency: "8 times per year, about two weeks before each FOMC meeting",
      whyTradersCare:
        "It is a qualitative input to the next rate decision and can hint at how policymakers read the economy.",
    },
  },

  // ── Speeches (any currency) ───────────────────────────────────
  {
    match: /speaks|testifies/i,
    info: {
      name: "Public appearance",
      description:
        "A scheduled public appearance or testimony by a central bank or government official.",
      whyTradersCare:
        "Officials use speeches and testimony to signal changes in policy or the economic outlook. Unscripted Q&A often moves markets more than prepared remarks.",
    },
  },
];

export function getEventInfo(title: string, currency: string): EventInfo | null {
  const rule = RULES.find((r) => r.match.test(title));
  if (!rule) return null;
  if (rule.usdOnly && currency.toUpperCase() !== "USD") return null;
  return rule.info;
}

/** "US Treasury Sec Bessent Speaks" -> "US Treasury Sec Bessent" */
export function getSpeaker(title: string): string | null {
  const m = title.match(/^(.+?)\s+(?:speaks|testifies)\b/i);
  return m ? m[1].trim() : null;
}

export function usualEffectText(effect: UsualEffect, currency: string): string {
  return effect === "higher"
    ? `An actual figure above the forecast is usually good for ${currency}.`
    : `An actual figure below the forecast is usually good for ${currency}.`;
}

// Home pages of the agencies named in the entries above, so the details dialog can
// link to the real source. Keys match the `source` text exactly.
const SOURCE_URLS: Record<string, string> = {
  "ADP Research": "https://adpemploymentreport.com",
  "US Bureau of Labor Statistics": "https://www.bls.gov",
  "US Department of Labor": "https://www.dol.gov",
  "US Bureau of Economic Analysis": "https://www.bea.gov",
  "US Census Bureau": "https://www.census.gov",
  "US Census Bureau and US Bureau of Economic Analysis": "https://www.census.gov/foreign-trade/index.html",
  "US Federal Reserve": "https://www.federalreserve.gov",
  "US Federal Reserve Board": "https://www.federalreserve.gov",
  "Institute for Supply Management": "https://www.ismworld.org",
  "S&P Global": "https://www.spglobal.com",
  "Federal Reserve Bank of New York": "https://www.newyorkfed.org",
  "Federal Reserve Bank of Philadelphia": "https://www.philadelphiafed.org",
  "University of Michigan, Surveys of Consumers": "https://www.sca.isr.umich.edu",
  "The Conference Board": "https://www.conference-board.org",
  "National Association of Realtors": "https://www.nar.realtor",
  "US Energy Information Administration": "https://www.eia.gov",
  "US Department of the Treasury": "https://home.treasury.gov",
};

export function getSourceUrl(source: string | undefined): string | null {
  return source ? SOURCE_URLS[source] ?? null : null;
}