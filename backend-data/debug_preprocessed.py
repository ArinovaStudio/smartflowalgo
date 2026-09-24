# //@version=6
# indicator("SFA 🐋 WHALE ZONES STIKE • PREMIUM DIGITAL V2.7", shorttitle="SFA 🐋 WHALE STIKE V2.7", overlay=true,
     max_boxes_count=220, max_lines_count=500, max_labels_count=300)

//=============================================================================
// PRIVATE PAID MEMBER BUILD
// Core Zone / Flight / A-B-C / ADX / rejection / conflict / sideways /
// confirmation parameters are FIXED internally and do not appear in Settings.
// Genuine chart/display options remain available to members, including EMA50/EMA200,
// PDH/PDL, Session High-Low, Tokyo POC, S&R and Supply/Demand zones.
// To hide SOURCE CODE from members, publish this as TradingView Invite-Only.
//=============================================================================

// SFA 🐋 WHALE ZONES STIKE — ELITE PRO V20.1 GLOW + FIXED TARGET
// TRUE MOBILE CARD FIX:
// - Mobile uses ONE auto-sized column (no percentage width/height)
// - only 7 short rows
// - selected mobile position is forced with table.set_position()
// - Full dashboard / trading logic unchanged
// Mobile dashboard fix only:
// - wider phone-safe value column
// - fewer rows
// - shorter text
// - no spacer rows
// - short mobile header
// Full dashboard and trading logic unchanged.
// UI polish only:
// - shorter header so no clipping
// - cleaner bottom MTF row
// Trading / zone / REJECT / BREAK logic unchanged.
// Trading / zone / REJECT / BREAK logic is unchanged.
// V19 rebuilds only the dashboard presentation:
// - balanced spacing: not cramped, not oversized
// - centered text with breathing room
// - clean section separation
// - no dense internal grid lines
// - Full + Mobile
// - Tiny / Small / Normal / Large
// - all 9 positions
// V18 trading logic and dashboard content are unchanged.
// V18.1 ONLY tightens dashboard width/height to remove excess empty space.
// Trading / zone / REJECT / BREAK logic remains unchanged from V16.9.
// V18 is a presentation-only refinement:
// - clean premium paid-look dashboard
// - short text that fits every cell
// - Full + Mobile dashboards
// - Tiny / Small / Normal / Large
// - all 9 positions
// - cleaner chart decision labels
// Trading / zone / REJECT / BREAK logic is preserved from V16.9.
// V17 changes the MEMBER UI only:
// - professional Full dashboard
// - separate Mobile dashboard
// - Tiny / Small / Normal / Large
// - all 9 dashboard positions
// - fixed balanced geometry / no oversized empty columns
// Fixes stale/late opposite-zone decisions.
// Once the current opposite box is reached, REJECT/BREAK must confirm
// inside a short fresh-decision window. Otherwise that snapshot expires
// and the engine waits for the CURRENT opposite box again.
// Opposite BUY/SELL boxes that overlap or sit extremely runtime.close are treated
// as ONE conflict cluster. No reverse/continue decision is allowed inside
// the cluster. Price must fully exit the complete cluster first.
// Exact method:
// IDLE: touch zone -> first candle 100% outside = entry.
// ACTIVE SELL: ignore all SELL zones -> wait until CURRENT BUY box is reached.
//               BUY box REJECTS upward = EXIT SELL / BUY REVERSE.
//               BUY box BREAKS downward = SELL CONTINUE; wait next BUY box.
// ACTIVE BUY: exact opposite.
// Opposite zone is locked ONLY WHEN PRICE REACHES IT, never at entry.
// Decision logic now uses the SAME visible BUY/SELL band coordinates
// that members see on the chart, including visual thickness/confluence.
// EXACT MEMBER METHOD:
// 1) Price reaches BUY/SELL zone.
// 2) FIRST candle BODY 100% outside the zone starts the trade.
// 3) Lock the OPPOSITE zone as the target. Do not move it while price travels.
// 4) At the locked opposite zone ONLY:
//    - rejection back outside = EXIT / REVERSE
//    - break through the zone = CONTINUE same trade to the next zone.
// No repeated same-direction entries. No BE/SL decision exits.
// MEMBER RULE:
// SELL ZONE TOUCH -> CLOSED BELOW SELL BOX = SELL ENTRY -> HOLD
// -> BUY ZONE TOUCH -> CLOSED ABOVE BUY BOX = EXIT SELL + BUY ENTRY.
// BUY side is exact opposite.
// No repeated same-direction entries. No BE/SL/zone-invalid decision exits.
// Existing zone calculations remain unchanged.
// Adds an exact member-facing trade lifecycle around the EXISTING zone logic:
// ZONE TOUCH -> L1 REJECTION -> L2 CLOSED ENTRY -> ACTIVE/HOLD ->
// OPPOSITE ZONE EXIT WATCH -> OPPOSITE L2 REVERSAL/EXIT.
// Existing zone calculations are intentionally preserved.
//
// SFA 🐋 WHALE ZONES STIKE — V15 ESSENTIAL TINY MOBILE
// Borderless premium zone bands + readable TF / strength / stars.
// Visual zone thickness is display-only; trading calculations use exact zones.

//=============================================================================
// V1.3 CONTINUOUS ZONE REFRESH UPDATE
// - Automatically moves to the next valid BUY/SELL zone after a break
// - AK, BOS/CHoCH, sessions, POC, order flow, dashboard, EMA/VWAP unchanged
//
// V1.2 VISUAL/OPTIONAL UPDATE
// - BUY/SELL zone text only (zone TF hidden on chart/dashboard)
// - AK reversal logic preserved
// - Clean BOS/CHoCH structure lines (no hanging structure labels)
// - Optional HH/HL/LH/LL, BSL, SSL, BOS, CHoCH, FVG
// - Optional PDH, PDL, EMA200, VWAP, Premium/Discount
// - Optional frozen Tokyo Session POC (zoom-independent)
//=============================================================================

// SFA MAGIC ZONE — SMARTFLOWALGO PREMIUM
// OPTIONAL ORDER FLOW DASHBOARD PATCH: no chart/profile overlays added.
// Main chart: 5M
// MTF Zones: 5M / 15M / 1H / 4H
// Includes original GOLD ZONES logic + original REVERSAL ENTRY ZONES engine.
// AK labels replace Bullish/Bearish Reversal text.
// Reversal dashboard removed; Zone dashboard retained.
//=============================================================================

//-----------------------------------------------------------------------------
// INPUTS
//-----------------------------------------------------------------------------
groupZones = "BUY / SELL ZONES"
show1mZones = true  // PRIVATE LOCKED
show5mZones = true  // PRIVATE LOCKED
show15mZones = true  // PRIVATE LOCKED
show30mZones = true  // PRIVATE LOCKED
show1hZones = true  // PRIVATE LOCKED
show4hZones = true  // PRIVATE LOCKED
showD1Zones = true  // PRIVATE LOCKED
pivotLeft = 3  // PRIVATE LOCKED
pivotRight = 3  // PRIVATE LOCKED
zoneAtrMult = 0.35  // PRIVATE LOCKED
zoneExtend = 250  // PRIVATE LOCKED
deleteBroken = true  // PRIVATE LOCKED
drawOriginalMtfBoxes = false

groupChart = "OPTIONAL CHART DISPLAY"
showEMA50 = false, "Show EMA 50", group=groupChart)
ema50Color = input.color(runtime.color_rgb(245, 158, 11), "EMA 50 Colour", group=groupChart)

showEMA200 = false, "Show EMA 200", group=groupChart)
ema200Color = input.color(runtime.color_rgb(59, 130, 246), "EMA 200 Colour", group=groupChart)
showVWAP = false
vwapColor = "#00ffff"
showPDH = false, "Show Previous Day High (PDH)", group=groupChart)
showPDL = false, "Show Previous Day Low (PDL)", group=groupChart)
showSR = false, "Show Support / Resistance (S&R)", group=groupChart)

groupStructure = "MARKET STRUCTURE"
showSwingLabels = false
showBOS = false
showCHOCH = false
showBSL = false
showSSL = false
showFVG = false
showPremiumDiscount = false
structureLeft = 3  // PRIVATE LOCKED
structureRight = 3  // PRIVATE LOCKED

groupSession = "LATEST SESSION HIGH / LOW"
showSessionHL = false, "Show Session High / Low (Tokyo → London → NY)", group=groupChart,
     tooltip="Display only. Tokyo establishes the range; London/New York replace a side only when that side is broken.")
sessionTz = "Europe/London"  // PRIVATE LOCKED
tokyoSession = "0000-0700"  // PRIVATE LOCKED
londonSession = "0700-1200"  // PRIVATE LOCKED
nySession = "1300-1700"  // PRIVATE LOCKED

groupPOC = "TOKYO POC"
showTokyoPOC = false, "Show Tokyo POC", group=groupChart)
pocBins = 60  // PRIVATE LOCKED

groupDash = "DASHBOARD"
showDashboard = false

showOrderFlow = false
orderFlowLookback = 60
orderFlowBins = 24

groupBackground = "BACKGROUND INFO"
showBackgroundInfo = false
dashSizeOpt = "Small"
dashPosOpt = "Top Right"
adxLen = 14  // PRIVATE LOCKED

// Original Reversal Entry Zones settings — kept hidden so original logic stays unchanged.
revConfirmBars = 0
revPreset = "Low"
revCalcMode = "Average"
revAvgLen = 5
revAtrLen = 5
revCustomAbs = 0.05
revShowZones = false
revMaxZones = 8
revZoneExtend = 10
revZoneThicknessPct = 0.03
revLevelExtend = 10
revMaxLevels = 12
revLineWidth = 3
showPrivateConfirmedSignal = false
showAKGraphics = false
confirmedSignalSize = "Tiny"

//=============================================================================
// V21.2 SFA FIXED-LOT MONEY MODEL — GOLD 0.10 BASELINE
//=============================================================================
// GOLD reference: XAUUSD 0.10 lot, a $1.00 price move ≈ $10 P/L.
// BTC: 5.00 lots gives about $5 P/L for a $1 price move. ETH remains 10.00 lots.
// FOREX: auto-normalise to a REAL 0.01-step lot so one pip is approximately
// $10 P/L in USD.
// SILVER: fixed member lot is 0.10, matching the broker examples supplied.
// Its real broker contract is used, so the displayed P/L is not artificially normalised.
//
// Broker contracts confirmed from the user's screenshots:
// XAUUSD 1 lot = 100 oz
// XAGUSD 1 lot = 5,000 oz
// BTCUSD 1 lot = 1 BTC
// ETHUSD 1 lot = 1 ETH
// Forex 1 lot = 100,000 base-currency units.

dashboardTickerUpper = str.upper(runtime.syminfo.ticker)

dashboardIsGold =
     str.contains(dashboardTickerUpper, "XAU") or
     str.contains(dashboardTickerUpper, "GOLD")

dashboardIsSilver =
     str.contains(dashboardTickerUpper, "XAG") or
     str.contains(dashboardTickerUpper, "SILVER")

dashboardIsBtc =
     str.contains(dashboardTickerUpper, "BTC")

dashboardIsEth =
     str.contains(dashboardTickerUpper, "ETH")

dashboardIsForex =
     runtime.syminfo.type == "forex" and
     not dashboardIsGold and not dashboardIsSilver and
     not dashboardIsBtc and not dashboardIsEth

dashboardGoldContractSize = 100.0
dashboardSilverContractSize = 5000.0
dashboardCryptoContractSize = 1.0
dashboardForexContractSize = 100000.0

// Forex P/L is produced in the quote currency, then converted to USD.
dashboardFxQuoteToUsd =
     dashboardIsForex ?
          request.currency_rate(runtime.syminfo.currency, currency.USD, true) :
          1.0

dashboardForexQuoteIsJpy =
     dashboardIsForex and str.upper(runtime.syminfo.currency) == "JPY"

dashboardForexPipSize =
     dashboardForexQuoteIsJpy ? 0.01 : 0.0001

// Pip value in USD for 1.00 lot.
dashboardForexOneLotPipUsd =
     dashboardIsForex and not runtime.na(dashboardFxQuoteToUsd) ?
          dashboardForexContractSize * dashboardForexPipSize * dashboardFxQuoteToUsd :
          runtime.na

// Lot needed for approximately $10 per pip, rounded to a real 0.01 lot step.
dashboardForexRawLot =
     dashboardIsForex and not runtime.na(dashboardForexOneLotPipUsd) and dashboardForexOneLotPipUsd > 0 ?
          10.0 / dashboardForexOneLotPipUsd :
          runtime.na

dashboardForexNormalizedLot =
     runtime.na(dashboardForexRawLot) ?
          1.00 :
          runtime.math_max(0.01, runtime.math_round(dashboardForexRawLot * 100.0) / 100.0)

// Final SFA member lot displayed on the chart.
dashboardLotSize =
     dashboardIsGold ? 0.10 :
     dashboardIsSilver ? 0.10 :
     dashboardIsBtc ? 5.00 :
     dashboardIsEth ? 10.00 :
     dashboardIsForex ? dashboardForexNormalizedLot :
     0.10

f_dashboardMoneyFactorForLot(float lotSize) =>
result = runtime.na
    if dashboardIsGold:
        result = dashboardGoldContractSize * lotSize
    elif dashboardIsSilver:
        result = dashboardSilverContractSize * lotSize
    elif dashboardIsBtc or dashboardIsEth:
        result = dashboardCryptoContractSize * lotSize
    elif dashboardIsForex:
        result = runtime.na(dashboardFxQuoteToUsd) ? runtime.na : dashboardForexContractSize * lotSize * dashboardFxQuoteToUsd
    else:
        result = dashboardGoldContractSize * lotSize
    result

dashboardMoneyFactor = f_dashboardMoneyFactorForLot(dashboardLotSize)

f_dashboardPl(float entryPrice, int dir) =>
result = runtime.na
    if not runtime.na(entryPrice) and dir != 0 and not runtime.na(dashboardMoneyFactor):
        result = (runtime.close - entryPrice) * dir * dashboardMoneyFactor
    result

f_dashboardPlLot(float entryPrice, float exitPrice, int dir, float lotSize) =>
moneyFactor = f_dashboardMoneyFactorForLot(lotSize)
result = runtime.na
    if not runtime.na(entryPrice) and not runtime.na(exitPrice) and dir != 0 and not runtime.na(lotSize) and not runtime.na(moneyFactor):
        result = (exitPrice - entryPrice) * dir * moneyFactor
    result

f_moneyText(float value) =>
result = "$0.00"
    if runtime.na(value):
        result = "--"
    elif value > 0:
        result = "+$" + runtime.str_tostring(value, "#.00")
    elif value < 0:
        result = "-$" + runtime.str_tostring(runtime.math_abs(value), "#.00")
    result

dashboardLotText =
     runtime.str_tostring(dashboardLotSize, "0.00")

//-----------------------------------------------------------------------------
// COLORS
//-----------------------------------------------------------------------------
// SFA V7.1 PREMIUM COLOUR SYSTEM
// Deep navy background, premium gold, emerald BUY, crimson SELL,
// amber WAIT/WATCH, and royal blue information accents.
gold        = runtime.color_rgb(212, 175, 55)       // #D4AF37 Premium Gold
buyBorder   = runtime.color_rgb(18, 155, 77)        // #22C55E Emerald
sellBorder  = runtime.color_rgb(205, 48, 58)        // #EF4444 Crimson
buyFill     = runtime.color_new(runtime.color_rgb(16, 120, 62), 72)
sellFill    = runtime.color_new(runtime.color_rgb(170, 36, 48), 72)
bullColor   = runtime.color_rgb(34, 197, 94)        // BUY / Bullish
bearColor   = runtime.color_rgb(239, 68, 68)        // SELL / Bearish
neutralColor= runtime.color_rgb(251, 191, 36)       // #FBBF24 Amber
darkBg      = runtime.color_rgb(11, 18, 32)         // #0B1220 Deep Navy
akBuyColor  = runtime.color_rgb(59, 130, 246)       // #3B82F6 Royal Blue
akSellColor = runtime.color_rgb(239, 68, 68)
infoBlue    = runtime.color_rgb(59, 130, 246)       // Website / Telegram / TF
softWhite   = runtime.color_rgb(229, 231, 235)      // #E5E7EB
panelHeader = runtime.color_rgb(17, 28, 48)         // Premium header surface
panelCell   = runtime.color_rgb(15, 23, 42)         // Premium body surface
panelBorder = runtime.color_rgb(35, 53, 84)         // #233554

//-----------------------------------------------------------------------------
// HELPERS
//-----------------------------------------------------------------------------
f_zoneData() =>
atrv = runtime.ta_atr(14)
ph = runtime.ta_pivothigh(runtime.high, pivotLeft, pivotRight)
pl = runtime.ta_pivotlow(runtime.low, pivotLeft, pivotRight)
pht = not runtime.na(ph) ? runtime.time[pivotRight] : runtime.na
plt = not runtime.na(pl) ? runtime.time[pivotRight] : runtime.na
    [ph, pl, atrv, pht, plt]

f_continuousZones() =>
atrv = runtime.ta_atr(14)
ph = runtime.ta_pivothigh(runtime.high, pivotLeft, pivotRight)
pl = runtime.ta_pivotlow(runtime.low, pivotLeft, pivotRight)

    var array<float> sellTops = []
    var array<float> sellBots = []
    var array<int> sellTimes = []
    var array<float> buyTops = []
    var array<float> buyBots = []
    var array<int> buyTimes = []

    if not runtime.na(ph):
        sellTops.append(ph)
        sellBots.append(ph - atrv * zoneAtrMult)
        sellTimes.append(runtime.time[pivotRight])

    if not runtime.na(pl):
        buyTops.append(pl + atrv * zoneAtrMult)
        buyBots.append(pl)
        buyTimes.append(runtime.time[pivotRight])

    while len(sellTops) > 60
        sellTops.pop(0)
        sellBots.pop(0)
        sellTimes.pop(0)

    while len(buyTops) > 60
        buyTops.pop(0)
        buyBots.pop(0)
        buyTimes.pop(0)

    if deleteBroken and len(sellTops) > 0:
i = len(sellTops) - 1
        while i >= 0
            if runtime.close > sellTops[int(i)]:
                array.remove(sellTops, i)
                array.remove(sellBots, i)
                array.remove(sellTimes, i)
            i -= 1

    if deleteBroken and len(buyBots) > 0:
i = len(buyBots) - 1
        while i >= 0
            if runtime.close < buyBots[int(i)]:
                array.remove(buyTops, i)
                array.remove(buyBots, i)
                array.remove(buyTimes, i)
            i -= 1

activeSellTop = runtime.na
activeSellBot = runtime.na
activeSellTime = runtime.na
bestSellDist = 1e20

    if len(sellTops) > 0:
        for i = 0 to len(sellTops) - 1
sTop = sellTops[int(i)]
sBot = sellBots[int(i)]
            if runtime.close <= sTop:
d = runtime.close >= sBot ? 0.0 : sBot - runtime.close
                if d < bestSellDist:
                    bestSellDist = d
                    activeSellTop = sTop
                    activeSellBot = sBot
                    activeSellTime = sellTimes[int(i)]

activeBuyTop = runtime.na
activeBuyBot = runtime.na
activeBuyTime = runtime.na
bestBuyDist = 1e20

    if len(buyTops) > 0:
        for i = 0 to len(buyTops) - 1
bTop = buyTops[int(i)]
bBot = buyBots[int(i)]
            if runtime.close >= bBot:
d = runtime.close <= bTop ? 0.0 : runtime.close - bTop
                if d < bestBuyDist:
                    bestBuyDist = d
                    activeBuyTop = bTop
                    activeBuyBot = bBot
                    activeBuyTime = buyTimes[int(i)]

    [activeSellTop, activeSellBot, activeSellTime, activeBuyTop, activeBuyBot, activeBuyTime]

f_trend(tf) =>
c = runtime.request_security(runtime.syminfo.tickerid, tf, runtime.close, "gaps_off", "lookahead_off")
e = runtime.request_security(runtime.syminfo.tickerid, tf, runtime.ta_ema(runtime.close, 200), "gaps_off", "lookahead_off")
    c >= e ? 1 : -1

f_adx5m() =>
    [plusDI, minusDI, adxVal] = ta.dmi(adxLen, adxLen)
    adxVal

f_dashSize() =>
    dashSizeOpt == "Tiny" ? "tiny" :
     dashSizeOpt == "Small" ? "small" :
     dashSizeOpt == "Large" ? "large" : "normal"

f_dashPos() =>
    dashPosOpt == "Top Left" ? position.top_left :
     dashPosOpt == "Bottom Right" ? position.bottom_right :
     dashPosOpt == "Bottom Left" ? position.bottom_left : position.top_right

f_confirmSize() =>
    confirmedSignalSize == "Tiny" ? "tiny" :
     confirmedSignalSize == "Small" ? "small" :
     confirmedSignalSize == "Large" ? "large" : "normal"


f_makeZone(box oldBox, int leftTime, float top, float bottom, bool isSell, string tfName) =>
    if not runtime.na(oldBox):
        runtime.box_delete(oldBox)
    runtime.box_new(left=leftTime, top=top, right=runtime.time, bottom=bottom,
      xloc="bar_time", extend="right",
      bgcolor=isSell ? sellFill : buyFill,
      border_color=isSell ? sellBorder : buyBorder,
      border_width=2,
      text=isSell ? "↓ DOWN" : "↑ UP CONTINUE",
      text_color="#000000",
      text_size="normal",
      text_halign=text.align_left,
      text_valign=text.align_center)

//-----------------------------------------------------------------------------
// OPTIONAL EMA 50 / EMA 200
//-----------------------------------------------------------------------------
// Display only. These EMAs do not affect any private signal/trade logic.
ema50 = runtime.ta_ema(runtime.close, 50)
runtime.plot_emit(showEMA50 ? ema50 : runtime.na, "EMA 50", color=ema50Color, linewidth=2)

ema200 = runtime.ta_ema(runtime.close, 200)
runtime.plot_emit(showEMA200 ? ema200 : runtime.na, "EMA 200", color=ema200Color, linewidth=3)


//-----------------------------------------------------------------------------
// PREVIOUS DAY HIGH / LOW
//-----------------------------------------------------------------------------
pdh = runtime.request_security(runtime.syminfo.tickerid, "D", runtime.high[1], "gaps_off", "lookahead_on")
pdl = runtime.request_security(runtime.syminfo.tickerid, "D", runtime.low[1],  "gaps_off", "lookahead_on")

// Clean PDH/PDL: horizontal only. No purple vertical connector at day change.
newDay = runtime.ta_change(runtime.time("D")) != 0

if 'pdhLine' not in locals(): pdhLine = runtime.na
if 'pdlLine' not in locals(): pdlLine = runtime.na
if 'pdhLabel' not in locals(): pdhLabel = runtime.na
if 'pdlLabel' not in locals(): pdlLabel = runtime.na

if newDay or barstate.isfirst:
    if not runtime.na(pdhLine):
        runtime.line_delete(pdhLine)
    if not runtime.na(pdlLine):
        runtime.line_delete(pdlLine)
    if not runtime.na(pdhLabel):
        runtime.label_delete(pdhLabel)
    if not runtime.na(pdlLabel):
        runtime.label_delete(pdlLabel)

    pdhLine = runtime.na
    pdlLine = runtime.na
    pdhLabel = runtime.na
    pdlLabel = runtime.na

if showPDH and not runtime.na(pdh):
    if runtime.na(pdhLine):
        pdhLine = runtime.line_new(runtime.bar_index, pdh, runtime.bar_index + 1, pdh,
          xloc=xloc.runtime.bar_index, extend="right",
          color="#2962FF", width=1, style=line.style_dashed)
    else:
        runtime.line_set_xy1(pdhLine, pdh)
        runtime.line_set_xy2(pdhLine, pdh)

    if runtime.na(pdhLabel):
        pdhLabel = runtime.label_new(runtime.bar_index, pdh, "PREVIOUS DAY HIGH (PDH)",
          style="label_left",
          color=runtime.color_rgb(25, 80, 190),
          textcolor="#ffffff",
          size="tiny")
    else:
        runtime.label_set_xy(pdhLabel, runtime.bar_index, pdh)
        runtime.label_set_text(pdhLabel, "PREVIOUS DAY HIGH (PDH)")

if showPDL and not runtime.na(pdl):
    if runtime.na(pdlLine):
        pdlLine = runtime.line_new(runtime.bar_index, pdl, runtime.bar_index + 1, pdl,
          xloc=xloc.runtime.bar_index, extend="right",
          color="#ff9800", width=1, style=line.style_dashed)
    else:
        runtime.line_set_xy1(pdlLine, pdl)
        runtime.line_set_xy2(pdlLine, pdl)

    if runtime.na(pdlLabel):
        pdlLabel = runtime.label_new(runtime.bar_index, pdl, "PREVIOUS DAY LOW (PDL)",
          style="label_left",
          color=runtime.color_rgb(190, 95, 0),
          textcolor="#ffffff",
          size="tiny")
    else:
        runtime.label_set_xy(pdlLabel, runtime.bar_index, pdl)
        runtime.label_set_text(pdlLabel, "PREVIOUS DAY LOW (PDL)")

//-----------------------------------------------------------------------------
// MTF ZONE DATA — CONTINUOUS ACTIVE BUY / SELL SUPPORT & RESISTANCE
// ALWAYS-ON MARKET ZONE MAP:
// 1M / 5M / 15M / 30M / 1H / 4H / D1
//
// IMPORTANT:
// These continuous zones are the ALWAYS-VISIBLE market map.
// The A-B-C Model 1 engine below is a SEPARATE confirmation layer.
//-----------------------------------------------------------------------------
[m1SellTopRaw, m1SellBotRaw, m1SellTimeRaw, m1BuyTopRaw, m1BuyBotRaw, m1BuyTimeRaw] = runtime.request_security(runtime.syminfo.tickerid, "1", f_continuousZones(), "gaps_off", "lookahead_off")
[m5SellTopRaw, m5SellBotRaw, m5SellTimeRaw, m5BuyTopRaw, m5BuyBotRaw, m5BuyTimeRaw] = runtime.request_security(runtime.syminfo.tickerid, "5", f_continuousZones(), "gaps_off", "lookahead_off")
[m15SellTopRaw, m15SellBotRaw, m15SellTimeRaw, m15BuyTopRaw, m15BuyBotRaw, m15BuyTimeRaw] = runtime.request_security(runtime.syminfo.tickerid, "15", f_continuousZones(), "gaps_off", "lookahead_off")
[m30SellTopRaw, m30SellBotRaw, m30SellTimeRaw, m30BuyTopRaw, m30BuyBotRaw, m30BuyTimeRaw] = runtime.request_security(runtime.syminfo.tickerid, "30", f_continuousZones(), "gaps_off", "lookahead_off")
[h1SellTopRaw, h1SellBotRaw, h1SellTimeRaw, h1BuyTopRaw, h1BuyBotRaw, h1BuyTimeRaw] = runtime.request_security(runtime.syminfo.tickerid, "60", f_continuousZones(), "gaps_off", "lookahead_off")
[h4SellTopRaw, h4SellBotRaw, h4SellTimeRaw, h4BuyTopRaw, h4BuyBotRaw, h4BuyTimeRaw] = runtime.request_security(runtime.syminfo.tickerid, "240", f_continuousZones(), "gaps_off", "lookahead_off")
[d1SellTopRaw, d1SellBotRaw, d1SellTimeRaw, d1BuyTopRaw, d1BuyBotRaw, d1BuyTimeRaw] = runtime.request_security(runtime.syminfo.tickerid, "D", f_continuousZones(), "gaps_off", "lookahead_off")

m1SellTop = show1mZones ? m1SellTopRaw : runtime.na
m1SellBot = show1mZones ? m1SellBotRaw : runtime.na
m1BuyTop = show1mZones ? m1BuyTopRaw : runtime.na
m1BuyBot = show1mZones ? m1BuyBotRaw : runtime.na

m5SellTop = show5mZones ? m5SellTopRaw : runtime.na
m5SellBot = show5mZones ? m5SellBotRaw : runtime.na
m5BuyTop = show5mZones ? m5BuyTopRaw : runtime.na
m5BuyBot = show5mZones ? m5BuyBotRaw : runtime.na

m15SellTop = show15mZones ? m15SellTopRaw : runtime.na
m15SellBot = show15mZones ? m15SellBotRaw : runtime.na
m15BuyTop = show15mZones ? m15BuyTopRaw : runtime.na
m15BuyBot = show15mZones ? m15BuyBotRaw : runtime.na

m30SellTop = show30mZones ? m30SellTopRaw : runtime.na
m30SellBot = show30mZones ? m30SellBotRaw : runtime.na
m30BuyTop = show30mZones ? m30BuyTopRaw : runtime.na
m30BuyBot = show30mZones ? m30BuyBotRaw : runtime.na

h1SellTop = show1hZones ? h1SellTopRaw : runtime.na
h1SellBot = show1hZones ? h1SellBotRaw : runtime.na
h1BuyTop = show1hZones ? h1BuyTopRaw : runtime.na
h1BuyBot = show1hZones ? h1BuyBotRaw : runtime.na

h4SellTop = show4hZones ? h4SellTopRaw : runtime.na
h4SellBot = show4hZones ? h4SellBotRaw : runtime.na
h4BuyTop = show4hZones ? h4BuyTopRaw : runtime.na
h4BuyBot = show4hZones ? h4BuyBotRaw : runtime.na

d1SellTop = showD1Zones ? d1SellTopRaw : runtime.na
d1SellBot = showD1Zones ? d1SellBotRaw : runtime.na
d1BuyTop = showD1Zones ? d1BuyTopRaw : runtime.na
d1BuyBot = showD1Zones ? d1BuyBotRaw : runtime.na

// Original hidden MTF boxes remain disabled. Flight still uses its preserved
// internal zone/control logic. The new visible map is drawn later.
if 'b5S' not in locals(): b5S = runtime.na
if 'b5D' not in locals(): b5D = runtime.na
if 'b15S' not in locals(): b15S = runtime.na
if 'b15D' not in locals(): b15D = runtime.na
if 'b1hS' not in locals(): b1hS = runtime.na
if 'b1hD' not in locals(): b1hD = runtime.na
if 'b4hS' not in locals(): b4hS = runtime.na
if 'b4hD' not in locals(): b4hD = runtime.na

f_syncZoneBox(box bx, bool enabled, int leftTime, float top, float bottom, bool isSell, string tfName) =>
result = bx
valid = enabled and not runtime.na(leftTime) and not runtime.na(top) and not runtime.na(bottom)
    if valid:
recreate = runtime.na(result)
        if not recreate:
            recreate = box.get_left(result) != leftTime or runtime.math_abs(box.get_top(result) - top) > runtime.syminfo.mintick or runtime.math_abs(box.get_bottom(result) - bottom) > runtime.syminfo.mintick
        if recreate:
            if not runtime.na(result):
                runtime.box_delete(result)
            result = f_makeZone(runtime.na, leftTime, top, bottom, isSell, tfName)
    else:
        if not runtime.na(result):
            runtime.box_delete(result)
            result = runtime.na
    result

b5S = f_syncZoneBox(b5S, drawOriginalMtfBoxes and show5mZones, m5SellTimeRaw, m5SellTop, m5SellBot, true, "5M")
b5D = f_syncZoneBox(b5D, drawOriginalMtfBoxes and show5mZones, m5BuyTimeRaw, m5BuyTop, m5BuyBot, false, "5M")
b15S = f_syncZoneBox(b15S, drawOriginalMtfBoxes and show15mZones, m15SellTimeRaw, m15SellTop, m15SellBot, true, "15M")
b15D = f_syncZoneBox(b15D, drawOriginalMtfBoxes and show15mZones, m15BuyTimeRaw, m15BuyTop, m15BuyBot, false, "15M")
b1hS = f_syncZoneBox(b1hS, drawOriginalMtfBoxes and show1hZones, h1SellTimeRaw, h1SellTop, h1SellBot, true, "1H")
b1hD = f_syncZoneBox(b1hD, drawOriginalMtfBoxes and show1hZones, h1BuyTimeRaw, h1BuyTop, h1BuyBot, false, "1H")
b4hS = f_syncZoneBox(b4hS, drawOriginalMtfBoxes and show4hZones, h4SellTimeRaw, h4SellTop, h4SellBot, true, "4H")
b4hD = f_syncZoneBox(b4hD, drawOriginalMtfBoxes and show4hZones, h4BuyTimeRaw, h4BuyTop, h4BuyBot, false, "4H")

//-----------------------------------------------------------------------------
// ORIGINAL REVERSAL ENTRY ZONES ENGINE — LOGIC PRESERVED
// Only label text/color is changed to AK branding. Reversal dashboard is omitted.
//-----------------------------------------------------------------------------
revPresetATR = revPreset == "Very Low" ? 3.5 : 2.8
revPresetPct = revPreset == "Very Low" ? 0.02 : 0.015
revAtrNow = runtime.ta_atr(revAtrLen)
revThreshold = runtime.math_max(runtime.close * revPresetPct / 100.0, runtime.math_max(revCustomAbs, revPresetATR * revAtrNow))

revHiBase = revCalcMode == "High/Low" ? runtime.high : runtime.ta_ema(runtime.high, revAvgLen)
revLoBase = revCalcMode == "High/Low" ? runtime.low  : runtime.ta_ema(runtime.low, revAvgLen)
revHiRef = revHiBase[revConfirmBars]
revLoRef = revLoBase[revConfirmBars]
revHiRawRef = runtime.high[revConfirmBars]
revLoRawRef = runtime.low[revConfirmBars]

if 'revRunHigh' not in locals(): revRunHigh = runtime.na
if 'revRunLow' not in locals(): revRunLow = runtime.na
if 'revRunHighRaw' not in locals(): revRunHighRaw = runtime.na
if 'revRunLowRaw' not in locals(): revRunLowRaw = runtime.na
if 'revRunHighBar' not in locals(): revRunHighBar = runtime.na
if 'revRunLowBar' not in locals(): revRunLowBar = runtime.na
if 'revSwingDir' not in locals(): revSwingDir = 1

if 'revConfirmedPivot' not in locals(): revConfirmedPivot = runtime.na
if 'revConfirmedPivotRaw' not in locals(): revConfirmedPivotRaw = runtime.na
if 'revConfirmedPivotBar' not in locals(): revConfirmedPivotBar = runtime.na
if 'revConfirmedPivotIsHigh' not in locals(): revConfirmedPivotIsHigh = false
revPivotReady = false

if not runtime.na(revHiRef) and not runtime.na(revLoRef):
    if runtime.na(revRunHigh) or runtime.na(revRunLow):
        revRunHigh = revHiRef
        revRunLow = revLoRef
        revRunHighRaw = revHiRawRef
        revRunLowRaw = revLoRawRef
        revRunHighBar = runtime.bar_index - revConfirmBars
        revRunLowBar = runtime.bar_index - revConfirmBars
        revSwingDir = 1

    if revSwingDir == 1:
        if revHiRef > revRunHigh:
            revRunHigh = revHiRef
            revRunHighRaw = revHiRawRef
            revRunHighBar = runtime.bar_index - revConfirmBars

        if revRunHigh - revLoRef >= revThreshold:
            revConfirmedPivot = revRunHigh
            revConfirmedPivotRaw = revRunHighRaw
            revConfirmedPivotBar = revRunHighBar
            revConfirmedPivotIsHigh = true
            revPivotReady = true
            revSwingDir = -1
            revRunLow = revLoRef
            revRunLowRaw = revLoRawRef
            revRunLowBar = runtime.bar_index - revConfirmBars
    else:
        if revLoRef < revRunLow:
            revRunLow = revLoRef
            revRunLowRaw = revLoRawRef
            revRunLowBar = runtime.bar_index - revConfirmBars

        if revHiRef - revRunLow >= revThreshold:
            revConfirmedPivot = revRunLow
            revConfirmedPivotRaw = revRunLowRaw
            revConfirmedPivotBar = revRunLowBar
            revConfirmedPivotIsHigh = false
            revPivotReady = true
            revSwingDir = 1
            revRunHigh = revHiRef
            revRunHighRaw = revHiRawRef
            revRunHighBar = runtime.bar_index - revConfirmBars

akBuySignal = revPivotReady and not revConfirmedPivotIsHigh
akSellSignal = revPivotReady and revConfirmedPivotIsHigh

var array<line> revLines = array.new<line>()
var array<line> revGlowLines = array.new<line>()
var array<box> revCoreBoxes = array.new<box>()
var array<box> revOuterBoxes = array.new<box>()
var array<box> revZoneBoxes = array.new<box>()
var array<label> revLabels = array.new<label>()

if 'akLastDir' not in locals(): akLastDir = 0
if 'akLastEntryPrice' not in locals(): akLastEntryPrice = runtime.na
if 'akLastSignalBar' not in locals(): akLastSignalBar = runtime.na

if revPivotReady:
revIsBull = not revConfirmedPivotIsHigh
revCenter = revConfirmedPivotRaw
    akLastDir = revIsBull ? 1 : -1
    akLastEntryPrice = runtime.close
    akLastSignalBar = runtime.bar_index

revCoreHalf = runtime.math_max(revAtrNow * 0.12, runtime.math_abs(revCenter) * 0.00015)
revOuterHalf = revCoreHalf * 2.15
revCol = revIsBull ? akBuyColor : akSellColor

revOuter = showAKGraphics ? runtime.box_new(revConfirmedPivotBar, revCenter + revOuterHalf,
         revConfirmedPivotBar + revLevelExtend, revCenter - revOuterHalf,
         xloc=xloc.runtime.bar_index, bgcolor=runtime.color_new(revCol, 94),
         border_color=runtime.color_new(revCol, 72), border_width=1) : runtime.na
    if not runtime.na(revOuter):
        revOuterBoxes.append(revOuter)

revCore = showAKGraphics ? runtime.box_new(revConfirmedPivotBar, revCenter + revCoreHalf,
         revConfirmedPivotBar + revLevelExtend, revCenter - revCoreHalf,
         xloc=xloc.runtime.bar_index, bgcolor=runtime.color_new(revCol, 84),
         border_color=runtime.color_new(revCol, 24), border_width=2) : runtime.na
    if not runtime.na(revCore):
        revCoreBoxes.append(revCore)

    // Requested replacement: bullish/bearish reversal wording -> AK only.
revLbl = showAKGraphics ? runtime.label_new(revConfirmedPivotBar,
         revIsBull ? revCenter - revOuterHalf : revCenter + revOuterHalf,
         "AK",
         style=revIsBull ? "label_up" : "label_down",
         color=runtime.color_new(revCol, 4), textcolor="#ffffff", size="normal",
         xloc=xloc.runtime.bar_index,
         tooltip=revIsBull ? "AK bullish reversal origin / watch area" : "AK bearish reversal origin / watch area") : runtime.na
    if not runtime.na(revLbl):
        revLabels.append(revLbl)

revGlow = showAKGraphics ? runtime.line_new(revConfirmedPivotBar, revCenter,
         revConfirmedPivotBar + revLevelExtend, revCenter,
         xloc=xloc.runtime.bar_index, extend="none",
         color=runtime.color_new(revCol, 84), width=8, style=line.style_solid) : runtime.na
    if not runtime.na(revGlow):
        revGlowLines.append(revGlow)

revMain = showAKGraphics ? runtime.line_new(revConfirmedPivotBar, revCenter,
         revConfirmedPivotBar + revLevelExtend, revCenter,
         xloc=xloc.runtime.bar_index, extend="none",
         color=revCol, width=revLineWidth, style=line.style_solid) : runtime.na
    if not runtime.na(revMain):
        revLines.append(revMain)

    if revShowZones and showAKGraphics:
revZoneHalf = (revCenter * revZoneThicknessPct / 100.0) / 2.0
revZone = runtime.box_new(revConfirmedPivotBar, revCenter + revZoneHalf,
             revConfirmedPivotBar + revZoneExtend, revCenter - revZoneHalf,
             xloc=xloc.runtime.bar_index, bgcolor=runtime.color_new(revCol, 89),
             border_color=runtime.color_new(revCol, 34), border_width=1)
        revZoneBoxes.append(revZone)

    // PRIVATE FIX: AK remains on reversal origin; BUY/SELL prints NOW on confirmation candle.
    if showPrivateConfirmedSignal:
confirmPad = runtime.math_max(runtime.ta_atr(14) * 0.18, runtime.syminfo.mintick * 10)
        runtime.label_new(runtime.bar_index,
             revIsBull ? runtime.low - confirmPad : runtime.high + confirmPad,
             revIsBull ? "BUY" : "SELL",
             xloc=xloc.runtime.bar_index,
             style=revIsBull ? "label_up" : "label_down",
             color=revIsBull ? "#00ff00" : "#f23645",
             textcolor="#ffffff",
             size=f_confirmSize(),
             tooltip=revIsBull ? "Confirmed BUY - available on this candle" : "Confirmed SELL - available on this candle")

while len(revLines) > revMaxLevels
    runtime.line_delete(revLines.pop(0))
while len(revGlowLines) > revMaxLevels
    runtime.line_delete(revGlowLines.pop(0))
while len(revCoreBoxes) > revMaxLevels
    runtime.box_delete(revCoreBoxes.pop(0))
while len(revOuterBoxes) > revMaxLevels
    runtime.box_delete(revOuterBoxes.pop(0))
while len(revZoneBoxes) > revMaxZones
    runtime.box_delete(revZoneBoxes.pop(0))
while len(revLabels) > revMaxLevels
    runtime.label_delete(revLabels.pop(0))

// Simulated running profit from the latest AK reversal price at fixed 0.10 lot.
// V20.9 uses the shared instrument-aware money model.
akRunningProfit = f_dashboardPl(akLastEntryPrice, akLastDir)
akSignalText = akLastDir == 1 ? "BUY CONFIRMED" : akLastDir == -1 ? "SELL CONFIRMED" : "WAITING"
akSignalColor = akLastDir == 1 ? akBuyColor : akLastDir == -1 ? akSellColor : neutralColor
akProfitText = runtime.na(akRunningProfit) ? "--" : "$" + runtime.str_tostring(akRunningProfit, "#.00")
akProfitColor = runtime.na(akRunningProfit) ? neutralColor : akRunningProfit >= 0 ? bullColor : bearColor

//-----------------------------------------------------------------------------
// MARKET STRUCTURE + SUPPORT / RESISTANCE
//-----------------------------------------------------------------------------
phStruct = runtime.ta_pivothigh(runtime.high, structureLeft, structureRight)
plStruct = runtime.ta_pivotlow(runtime.low, structureLeft, structureRight)

if 'lastSwingHigh' not in locals(): lastSwingHigh = runtime.na
if 'prevSwingHigh' not in locals(): prevSwingHigh = runtime.na
if 'lastSwingHighBar' not in locals(): lastSwingHighBar = runtime.na
if 'lastSwingLow' not in locals(): lastSwingLow = runtime.na
if 'prevSwingLow' not in locals(): prevSwingLow = runtime.na
if 'lastSwingLowBar' not in locals(): lastSwingLowBar = runtime.na

if 'highBroken' not in locals(): highBroken = false
if 'lowBroken' not in locals(): lowBroken = false
if 'structureDir' not in locals(): structureDir = 0  // 1 bullish, -1 bearish, 0 unknown
if 'lastBreakText' not in locals(): lastBreakText = "NONE"

// Premium internal confirmation state.
//  1 = latest confirmed CHoCH bullish
// -1 = latest confirmed CHoCH bearish
//  0 = no confirmed CHoCH yet
if 'lastChochDir' not in locals(): lastChochDir = 0
if 'lastChochBar' not in locals(): lastChochBar = runtime.na

if not runtime.na(phStruct):
    prevSwingHigh = lastSwingHigh
    lastSwingHigh = phStruct
    lastSwingHighBar = runtime.bar_index - structureRight
    highBroken = false
    if showSwingLabels:
htxt = runtime.na(prevSwingHigh) ? "H" : phStruct > prevSwingHigh ? "HH" : "LH"
        runtime.label_new(lastSwingHighBar, phStruct, htxt,
          style="none",
          textcolor=htxt == "HH" ? "#00ff00" : "#f23645",
          size="tiny")

if not runtime.na(plStruct):
    prevSwingLow = lastSwingLow
    lastSwingLow = plStruct
    lastSwingLowBar = runtime.bar_index - structureRight
    lowBroken = false
    if showSwingLabels:
ltxt = runtime.na(prevSwingLow) ? "L" : plStruct > prevSwingLow ? "HL" : "LL"
        runtime.label_new(lastSwingLowBar, plStruct, ltxt,
          style="none",
          textcolor=ltxt == "HL" ? "#00ff00" : "#f23645",
          size="tiny")

// Support / Resistance from latest confirmed swings
if 'resistanceLine' not in locals(): resistanceLine = runtime.na
if 'supportLine' not in locals(): supportLine = runtime.na
if 'resistancePriceLabel' not in locals(): resistancePriceLabel = runtime.na
if 'supportPriceLabel' not in locals(): supportPriceLabel = runtime.na

if showSR and not runtime.na(phStruct):
    if not runtime.na(resistanceLine):
        runtime.line_delete(resistanceLine)
    resistanceLine = runtime.line_new(lastSwingHighBar, lastSwingHigh, runtime.bar_index, lastSwingHigh,
      xloc=xloc.runtime.bar_index, extend="right", color="#f23645", width=1)

    if not runtime.na(resistancePriceLabel):
        runtime.label_delete(resistancePriceLabel)
    resistancePriceLabel = runtime.label_new(runtime.bar_index, lastSwingHigh,
      "RESISTANCE  " + runtime.str_tostring(lastSwingHigh, format.mintick),
      style="label_left", color="#f23645", textcolor="#ffffff", size="small")

if showSR and not runtime.na(plStruct):
    if not runtime.na(supportLine):
        runtime.line_delete(supportLine)
    supportLine = runtime.line_new(lastSwingLowBar, lastSwingLow, runtime.bar_index, lastSwingLow,
      xloc=xloc.runtime.bar_index, extend="right", color="#00ff00", width=1)

    if not runtime.na(supportPriceLabel):
        runtime.label_delete(supportPriceLabel)
    supportPriceLabel = runtime.label_new(runtime.bar_index, lastSwingLow,
      "SUPPORT  " + runtime.str_tostring(lastSwingLow, format.mintick),
      style="label_left", color=runtime.color_rgb(0, 170, 70), textcolor="#ffffff", size="small")

// Optional BSL / SSL liquidity reference lines from latest confirmed swings.
if 'bslLine' not in locals(): bslLine = runtime.na
if 'sslLine' not in locals(): sslLine = runtime.na
if 'bslLabel' not in locals(): bslLabel = runtime.na
if 'sslLabel' not in locals(): sslLabel = runtime.na

if showBSL and not runtime.na(phStruct):
    if not runtime.na(bslLine):
        runtime.line_delete(bslLine)
    if not runtime.na(bslLabel):
        runtime.label_delete(bslLabel)
    bslLine = runtime.line_new(lastSwingHighBar, lastSwingHigh, runtime.bar_index, lastSwingHigh,
      xloc=xloc.runtime.bar_index, extend="right", color=runtime.color_new("#2962FF", 20), width=1, style=line.style_dashed)
    bslLabel = runtime.label_new(runtime.bar_index, lastSwingHigh, "BSL", style="none",
      textcolor="#2962FF", size="tiny")

if showSSL and not runtime.na(plStruct):
    if not runtime.na(sslLine):
        runtime.line_delete(sslLine)
    if not runtime.na(sslLabel):
        runtime.label_delete(sslLabel)
    sslLine = runtime.line_new(lastSwingLowBar, lastSwingLow, runtime.bar_index, lastSwingLow,
      xloc=xloc.runtime.bar_index, extend="right", color=runtime.color_new("#f23645", 20), width=1, style=line.style_dashed)
    sslLabel = runtime.label_new(runtime.bar_index, lastSwingLow, "SSL", style="none",
      textcolor="#f23645", size="tiny")

// Optional 3-candle Fair Value Gaps.
var array<box> fvgBoxes = array.new<box>()
bullFVG = showFVG and runtime.low > runtime.high[2]
bearFVG = showFVG and runtime.high < runtime.low[2]

if bullFVG:
f = runtime.box_new(runtime.bar_index - 2, runtime.low, runtime.bar_index, runtime.high[2], xloc=xloc.runtime.bar_index,
      extend="right", bgcolor=runtime.color_new("#00ff00", 90), border_color=runtime.color_new("#00ff00", 45),
      text="FVG", text_color=runtime.color_new("#089981", 10), text_size="tiny")
    fvgBoxes.append(f)

if bearFVG:
f = runtime.box_new(runtime.bar_index - 2, runtime.low[2], runtime.bar_index, runtime.high, xloc=xloc.runtime.bar_index,
      extend="right", bgcolor=runtime.color_new("#f23645", 90), border_color=runtime.color_new("#f23645", 45),
      text="FVG", text_color=runtime.color_new("#f23645", 10), text_size="tiny")
    fvgBoxes.append(f)

while len(fvgBoxes) > 20
    runtime.box_delete(fvgBoxes.pop(0))

// BOS / CHOCH
bullBreak = not runtime.na(lastSwingHigh) and runtime.close > lastSwingHigh and not highBroken
bearBreak = not runtime.na(lastSwingLow) and runtime.close < lastSwingLow and not lowBroken

if bullBreak:
isChoch = structureDir == -1
    if isChoch:
        lastChochDir = 1
        lastChochBar = runtime.bar_index
    if (isChoch and showCHOCH) or (not isChoch and showBOS):
        runtime.line_new(lastSwingHighBar, lastSwingHigh, runtime.bar_index, lastSwingHigh,
          xloc=xloc.runtime.bar_index, extend="none", color=runtime.color_rgb(34, 197, 94), width=2)
midBar = int(runtime.math_floor((lastSwingHighBar + runtime.bar_index) / 2))
        runtime.label_new(midBar, lastSwingHigh, isChoch ? "CHoCH" : "BOS",
          style="none", textcolor=runtime.color_rgb(34, 197, 94), size="small")
    structureDir = 1
    lastBreakText = isChoch ? "BULL CHOCH" : "BULL BOS"
    highBroken = true

if bearBreak:
isChoch = structureDir == 1
    if isChoch:
        lastChochDir = -1
        lastChochBar = runtime.bar_index
    if (isChoch and showCHOCH) or (not isChoch and showBOS):
        runtime.line_new(lastSwingLowBar, lastSwingLow, runtime.bar_index, lastSwingLow,
          xloc=xloc.runtime.bar_index, extend="none", color=runtime.color_rgb(239, 68, 68), width=2)
midBar = int(runtime.math_floor((lastSwingLowBar + runtime.bar_index) / 2))
        runtime.label_new(midBar, lastSwingLow, isChoch ? "CHoCH" : "BOS",
          style="none", textcolor=runtime.color_rgb(239, 68, 68), size="small")
    structureDir = -1
    lastBreakText = isChoch ? "BEAR CHOCH" : "BEAR BOS"
    lowBroken = true

//-----------------------------------------------------------------------------
// ONLY LATEST ACTIVE SESSION HIGH / LOW
// Tokyo establishes initial High/Low.
// London replaces ONLY the side it breaks.
// New York replaces ONLY the side it breaks.
//-----------------------------------------------------------------------------
inTokyo  = not runtime.na(runtime.time(runtime.syminfo.period, tokyoSession, sessionTz))
inLondon = not runtime.na(runtime.time(runtime.syminfo.period, londonSession, sessionTz))
inNY     = not runtime.na(runtime.time(runtime.syminfo.period, nySession, sessionTz))

dayStamp = runtime.time("D", "0000-2359", sessionTz)
newSessionDay = runtime.ta_change(dayStamp) != 0

if 'activeSessionHigh' not in locals(): activeSessionHigh = runtime.na
if 'activeSessionLow' not in locals(): activeSessionLow = runtime.na
if 'activeHighName' not in locals(): activeHighName = "TOKYO HIGH"
if 'activeLowName' not in locals(): activeLowName = "TOKYO LOW"
if 'sessionDayStart' not in locals(): sessionDayStart = runtime.na

if 'activeHighLine' not in locals(): activeHighLine = runtime.na
if 'activeLowLine' not in locals(): activeLowLine = runtime.na
if 'activeHighLabel' not in locals(): activeHighLabel = runtime.na
if 'activeLowLabel' not in locals(): activeLowLabel = runtime.na

if newSessionDay or runtime.na(sessionDayStart):
    activeSessionHigh = runtime.na
    activeSessionLow = runtime.na
    activeHighName = "TOKYO HIGH"
    activeLowName = "TOKYO LOW"
    sessionDayStart = runtime.time

    if not runtime.na(activeHighLine):
        runtime.line_delete(activeHighLine)
    if not runtime.na(activeLowLine):
        runtime.line_delete(activeLowLine)
    if not runtime.na(activeHighLabel):
        runtime.label_delete(activeHighLabel)
    if not runtime.na(activeLowLabel):
        runtime.label_delete(activeLowLabel)

    activeHighLine = runtime.na
    activeLowLine = runtime.na
    activeHighLabel = runtime.na
    activeLowLabel = runtime.na

// Tokyo initializes/runs the active range
if inTokyo:
    if runtime.na(activeSessionHigh) or runtime.high > activeSessionHigh:
        activeSessionHigh = runtime.high
        activeHighName = "TOKYO HIGH"
    if runtime.na(activeSessionLow) or runtime.low < activeSessionLow:
        activeSessionLow = runtime.low
        activeLowName = "TOKYO LOW"

// London only replaces a side if that side is broken
if inLondon:
    if runtime.na(activeSessionHigh):
        activeSessionHigh = runtime.high
        activeHighName = "LONDON HIGH"
    elif runtime.high > activeSessionHigh:
        activeSessionHigh = runtime.high
        activeHighName = "LONDON HIGH"

    if runtime.na(activeSessionLow):
        activeSessionLow = runtime.low
        activeLowName = "LONDON LOW"
    elif runtime.low < activeSessionLow:
        activeSessionLow = runtime.low
        activeLowName = "LONDON LOW"

// New York only replaces a side if that side is broken
if inNY:
    if runtime.na(activeSessionHigh):
        activeSessionHigh = runtime.high
        activeHighName = "NY HIGH"
    elif runtime.high > activeSessionHigh:
        activeSessionHigh = runtime.high
        activeHighName = "NY HIGH"

    if runtime.na(activeSessionLow):
        activeSessionLow = runtime.low
        activeLowName = "NY LOW"
    elif runtime.low < activeSessionLow:
        activeSessionLow = runtime.low
        activeLowName = "NY LOW"

// Draw ONLY the current active runtime.high + runtime.low
if showSessionHL and not runtime.na(activeSessionHigh):
    if runtime.na(activeHighLine):
        activeHighLine = runtime.line_new(sessionDayStart, activeSessionHigh, runtime.time, activeSessionHigh,
          xloc="bar_time", extend="right", color="#00ffff", width=1, style=line.style_dashed)
    else:
        runtime.line_set_xy1(activeHighLine, sessionDayStart, activeSessionHigh)
        runtime.line_set_xy2(activeHighLine, runtime.time, activeSessionHigh)

    if runtime.na(activeHighLabel):
        activeHighLabel = runtime.label_new(runtime.time, activeSessionHigh, activeHighName,
          xloc="bar_time", style="label_left",
          color=runtime.color_rgb(0, 110, 125), textcolor="#ffffff", size="small")
    else:
        runtime.label_set_xy(activeHighLabel, runtime.time, activeSessionHigh)
        runtime.label_set_text(activeHighLabel, activeHighName)

if showSessionHL and not runtime.na(activeSessionLow):
    if runtime.na(activeLowLine):
        activeLowLine = runtime.line_new(sessionDayStart, activeSessionLow, runtime.time, activeSessionLow,
          xloc="bar_time", extend="right", color="#ff9800", width=1, style=line.style_dashed)
    else:
        runtime.line_set_xy1(activeLowLine, sessionDayStart, activeSessionLow)
        runtime.line_set_xy2(activeLowLine, runtime.time, activeSessionLow)

    if runtime.na(activeLowLabel):
        activeLowLabel = runtime.label_new(runtime.time, activeSessionLow, activeLowName,
          xloc="bar_time", style="label_left",
          color=runtime.color_rgb(175, 90, 0), textcolor="#ffffff", size="small")
    else:
        runtime.label_set_xy(activeLowLabel, runtime.time, activeSessionLow)
        runtime.label_set_text(activeLowLabel, activeLowName)

//-----------------------------------------------------------------------------
// OPTIONAL TOKYO SESSION POC + PREMIUM / DISCOUNT
//-----------------------------------------------------------------------------
// Tokyo POC is session-fixed: it accumulates each Tokyo bar's runtime.volume into price
// bins across the developing Tokyo range, then freezes when Tokyo ends.
// It is independent of chart zoom. This is a bar-runtime.volume approximation of
// session POC and does not require TradingView footprint-plan access.
var array<float> tokPrices = []
var array<float> tokVolumes = []
if 'tokLow' not in locals(): tokLow = runtime.na
if 'tokHigh' not in locals(): tokHigh = runtime.na
if 'frozenTokyoPOC' not in locals(): frozenTokyoPOC = runtime.na
if 'tokPOCLine' not in locals(): tokPOCLine = runtime.na
if 'tokPOCLabel' not in locals(): tokPOCLabel = runtime.na

tokyoStart = inTokyo and not inTokyo[1]
tokyoEnd = not inTokyo and inTokyo[1]

if tokyoStart:
    tokPrices.clear()
    tokVolumes.clear()
    tokLow = runtime.low
    tokHigh = runtime.high
    frozenTokyoPOC = runtime.na
    if not runtime.na(tokPOCLine):
        runtime.line_delete(tokPOCLine)
        tokPOCLine = runtime.na
    if not runtime.na(tokPOCLabel):
        runtime.label_delete(tokPOCLabel)
        tokPOCLabel = runtime.na

if inTokyo:
    tokLow = runtime.na(tokLow) ? runtime.low : runtime.math_min(tokLow, runtime.low)
    tokHigh = runtime.na(tokHigh) ? runtime.high : runtime.math_max(tokHigh, runtime.high)
rangeNow = runtime.math_max(tokHigh - tokLow, runtime.syminfo.mintick * pocBins)
stepNow = rangeNow / pocBins
bucket = tokLow + (runtime.math_floor((hlc3 - tokLow) / stepNow) + 0.5) * stepNow
found = -1
    if len(tokPrices) > 0:
        for i = 0 to len(tokPrices) - 1
            if runtime.math_abs(tokPrices[int(i)] - bucket) <= stepNow * 0.5:
                found = i
                break
    if found >= 0:
        tokVolumes.__setitem__(int(found), tokVolumes[int(found)] + runtime.volume)
    else:
        tokPrices.append(bucket)
        tokVolumes.append(runtime.volume)

if tokyoEnd and len(tokVolumes) > 0:
maxVol = -1.0
bestPrice = runtime.na
    for i = 0 to len(tokVolumes) - 1
v = tokVolumes[int(i)]
        if v > maxVol:
            maxVol = v
            bestPrice = tokPrices[int(i)]
    frozenTokyoPOC = bestPrice

if showTokyoPOC and not runtime.na(frozenTokyoPOC):
    if runtime.na(tokPOCLine):
        tokPOCLine = runtime.line_new(runtime.bar_index, frozenTokyoPOC, runtime.bar_index + 1, frozenTokyoPOC,
          xloc=xloc.runtime.bar_index, extend="right", color="#ff00ff", width=2, style=line.style_dashed)
    else:
        runtime.line_set_xy1(tokPOCLine, frozenTokyoPOC)
        runtime.line_set_xy2(tokPOCLine, frozenTokyoPOC)
    if runtime.na(tokPOCLabel):
        tokPOCLabel = runtime.label_new(runtime.bar_index, frozenTokyoPOC, "TOKYO POC",
          style="none", textcolor="#ff00ff", size="small")
    else:
        runtime.label_set_xy(tokPOCLabel, runtime.bar_index, frozenTokyoPOC)
else:
    if not runtime.na(tokPOCLine):
        runtime.line_delete(tokPOCLine)
        tokPOCLine = runtime.na
    if not runtime.na(tokPOCLabel):
        runtime.label_delete(tokPOCLabel)
        tokPOCLabel = runtime.na

// Premium / Discount based on the current active session range.
if 'premiumBox' not in locals(): premiumBox = runtime.na
if 'discountBox' not in locals(): discountBox = runtime.na
if showPremiumDiscount and not runtime.na(activeSessionHigh) and not runtime.na(activeSessionLow) and activeSessionHigh > activeSessionLow:
eq = (activeSessionHigh + activeSessionLow) / 2.0
    if not runtime.na(premiumBox):
        runtime.box_delete(premiumBox)
    if not runtime.na(discountBox):
        runtime.box_delete(discountBox)
    premiumBox = runtime.box_new(runtime.bar_index, activeSessionHigh, runtime.bar_index + 1, eq,
      xloc=xloc.runtime.bar_index, extend="right", bgcolor=runtime.color_new("#f23645", 93),
      border_color=runtime.color_new("#f23645", 70), text="PREMIUM", text_color="#f23645", text_size="tiny")
    discountBox = runtime.box_new(runtime.bar_index, eq, runtime.bar_index + 1, activeSessionLow,
      xloc=xloc.runtime.bar_index, extend="right", bgcolor=runtime.color_new("#00ff00", 93),
      border_color=runtime.color_new("#00ff00", 70), text="DISCOUNT", text_color="#089981", text_size="tiny")
else:
    if not runtime.na(premiumBox):
        runtime.box_delete(premiumBox)
        premiumBox = runtime.na
    if not runtime.na(discountBox):
        runtime.box_delete(discountBox)
        discountBox = runtime.na

//-----------------------------------------------------------------------------
// NEAREST ACTIVE BUY / SELL ZONES
//-----------------------------------------------------------------------------
nearestBuy = runtime.na
nearestBuyTF = "--"
nearestBuyDist = 1e10

nearestSell = runtime.na
nearestSellTF = "--"
nearestSellDist = 1e10

// Buy candidates: nearest top boundary at/below price, or containing price
if not runtime.na(m5BuyTop):
d = runtime.close >= m5BuyBot ? runtime.math_abs(runtime.close - runtime.math_min(runtime.close, m5BuyTop)) : runtime.math_abs(runtime.close - m5BuyTop)
    if d < nearestBuyDist:
        nearestBuyDist = d
        nearestBuy = m5BuyTop
        nearestBuyTF = "5M"

if not runtime.na(m15BuyTop):
d = runtime.close >= m15BuyBot ? runtime.math_abs(runtime.close - runtime.math_min(runtime.close, m15BuyTop)) : runtime.math_abs(runtime.close - m15BuyTop)
    if d < nearestBuyDist:
        nearestBuyDist = d
        nearestBuy = m15BuyTop
        nearestBuyTF = "15M"

if not runtime.na(h1BuyTop):
d = runtime.close >= h1BuyBot ? runtime.math_abs(runtime.close - runtime.math_min(runtime.close, h1BuyTop)) : runtime.math_abs(runtime.close - h1BuyTop)
    if d < nearestBuyDist:
        nearestBuyDist = d
        nearestBuy = h1BuyTop
        nearestBuyTF = "1H"

if not runtime.na(h4BuyTop):
d = runtime.close >= h4BuyBot ? runtime.math_abs(runtime.close - runtime.math_min(runtime.close, h4BuyTop)) : runtime.math_abs(runtime.close - h4BuyTop)
    if d < nearestBuyDist:
        nearestBuyDist = d
        nearestBuy = h4BuyTop
        nearestBuyTF = "4H"

// Sell candidates: nearest bottom boundary at/above price, or containing price
if not runtime.na(m5SellBot):
d = runtime.close <= m5SellTop ? runtime.math_abs(runtime.close - runtime.math_max(runtime.close, m5SellBot)) : runtime.math_abs(runtime.close - m5SellBot)
    if d < nearestSellDist:
        nearestSellDist = d
        nearestSell = m5SellBot
        nearestSellTF = "5M"

if not runtime.na(m15SellBot):
d = runtime.close <= m15SellTop ? runtime.math_abs(runtime.close - runtime.math_max(runtime.close, m15SellBot)) : runtime.math_abs(runtime.close - m15SellBot)
    if d < nearestSellDist:
        nearestSellDist = d
        nearestSell = m15SellBot
        nearestSellTF = "15M"

if not runtime.na(h1SellBot):
d = runtime.close <= h1SellTop ? runtime.math_abs(runtime.close - runtime.math_max(runtime.close, h1SellBot)) : runtime.math_abs(runtime.close - h1SellBot)
    if d < nearestSellDist:
        nearestSellDist = d
        nearestSell = h1SellBot
        nearestSellTF = "1H"

if not runtime.na(h4SellBot):
d = runtime.close <= h4SellTop ? runtime.math_abs(runtime.close - runtime.math_max(runtime.close, h4SellBot)) : runtime.math_abs(runtime.close - h4SellBot)
    if d < nearestSellDist:
        nearestSellDist = d
        nearestSell = h4SellBot
        nearestSellTF = "4H"

//-----------------------------------------------------------------------------
// LIVE SUPPORT / RESISTANCE BOXES
// Uses the already-calculated nearest active BUY / SELL zone levels.
// Separate from the normal Support / Resistance price labels above.
//-----------------------------------------------------------------------------
if 'liveSupportBox' not in locals(): liveSupportBox = runtime.na
if 'liveResistanceBox' not in locals(): liveResistanceBox = runtime.na

liveBoxHalf = runtime.ta_atr(14) * 0.08

if showSR and not runtime.na(nearestBuy):
liveSupportTop = nearestBuy + liveBoxHalf
liveSupportBottom = nearestBuy - liveBoxHalf
    if runtime.na(liveSupportBox):
        liveSupportBox = runtime.box_new(runtime.bar_index, liveSupportTop, runtime.bar_index + 1, liveSupportBottom,
          xloc=xloc.runtime.bar_index, extend="right",
          bgcolor=runtime.color_new("#00ff00", 88), border_color="#00ff00", border_width=1,
          text="SUPPORT", text_color=runtime.color_rgb(0, 85, 0),
          text_size="small", text_halign=text.align_left, text_valign=text.align_center)
    else:
        runtime.box_set_lefttop(liveSupportBox, runtime.bar_index, liveSupportTop)
        runtime.box_set_rightbottom(liveSupportBox, runtime.bar_index + 1, liveSupportBottom)
else:
    if not runtime.na(liveSupportBox):
        runtime.box_delete(liveSupportBox)
        liveSupportBox = runtime.na

if showSR and not runtime.na(nearestSell):
liveResistanceTop = nearestSell + liveBoxHalf
liveResistanceBottom = nearestSell - liveBoxHalf
    if runtime.na(liveResistanceBox):
        liveResistanceBox = runtime.box_new(runtime.bar_index, liveResistanceTop, runtime.bar_index + 1, liveResistanceBottom,
          xloc=xloc.runtime.bar_index, extend="right",
          bgcolor=runtime.color_new("#f23645", 88), border_color="#f23645", border_width=1,
          text="RESISTANCE", text_color=runtime.color_rgb(125, 0, 0),
          text_size="small", text_halign=text.align_left, text_valign=text.align_center)
    else:
        runtime.box_set_lefttop(liveResistanceBox, runtime.bar_index, liveResistanceTop)
        runtime.box_set_rightbottom(liveResistanceBox, runtime.bar_index + 1, liveResistanceBottom)
else:
    if not runtime.na(liveResistanceBox):
        runtime.box_delete(liveResistanceBox)
        liveResistanceBox = runtime.na

//-----------------------------------------------------------------------------
// TREND LIGHTS + ADX
//-----------------------------------------------------------------------------
trend1  = f_trend("1")
trend5  = f_trend("5")
trend15 = f_trend("15")
trend1h = f_trend("60")
trend4h = f_trend("240")

adx5 = runtime.request_security(runtime.syminfo.tickerid, "5", f_adx5m(), "gaps_off", "lookahead_off")
adxStatus = adx5 < 20 ? "WEAK / SIDEWAYS" : adx5 < 25 ? "DEVELOPING" : "STRONG"

// Mobile dashboard display only.
mobileAdxText = "ADX 5M • " + runtime.str_tostring(adx5, "#.0") + " • " + adxStatus
mobileAdxColor = adx5 >= 25 ? runtime.color_rgb(0, 214, 160) :
     adx5 >= 20 ? runtime.color_rgb(245, 190, 65) : runtime.color_rgb(255, 82, 96)

//-----------------------------------------------------------------------------
// OPTIONAL VOLUMETRIC / ORDER FLOW METRICS
// Dashboard-only: does NOT draw on candles, zones, BOS/CHoCH or labels.
// Buy/Sell runtime.volume is an intrabar-location estimate from TradingView bar runtime.volume.
// POC/Value Area are calculated from a price-bin runtime.volume approximation.
//-----------------------------------------------------------------------------
f_orderFlowMetrics(int len, int bins) =>
buyVol = 0.0
sellVol = 0.0
totalVol = 0.0

rangeHi = runtime.ta_highest(runtime.high, len)
rangeLo = runtime.ta_lowest(runtime.low, len)
priceRange = runtime.math_max(rangeHi - rangeLo, runtime.syminfo.mintick * bins)
step = priceRange / bins

    array<float> vp = []

    for i = 0 to len - 1
barRange = runtime.math_max(runtime.high[i] - runtime.low[i], runtime.syminfo.mintick)
buyShare = runtime.math_max(0.0, runtime.math_min(1.0, (runtime.close[i] - runtime.low[i]) / barRange))
v = runtime.nz(runtime.volume[i], 0.0)
        buyVol += v * buyShare
        sellVol += v * (1.0 - buyShare)
        totalVol += v

idx = int(runtime.math_floor((hlc3[i] - rangeLo) / step))
        idx = runtime.math_max(0, runtime.math_min(bins - 1, idx))
        vp.__setitem__(int(idx), vp[int(idx)] + v)

pocIdx = 0
maxBinVol = vp[int(0)]
    for i = 1 to bins - 1
bv = vp[int(i)]
        if bv > maxBinVol:
            maxBinVol = bv
            pocIdx = i

    // Approximate 70% value area expanded outward from POC.
targetVA = totalVol * 0.70
cumVA = vp[int(pocIdx)]
vaLoIdx = pocIdx
vaHiIdx = pocIdx

    for k = 0 to bins - 2
        if cumVA >= targetVA:
            break
leftVol = vaLoIdx > 0 ? vp[int(vaLoIdx - 1)] : -1.0
rightVol = vaHiIdx < bins - 1 ? vp[int(vaHiIdx + 1)] : -1.0

        if rightVol > leftVol and vaHiIdx < bins - 1:
            vaHiIdx += 1
            cumVA += runtime.math_max(0.0, rightVol)
        elif vaLoIdx > 0:
            vaLoIdx -= 1
            cumVA += runtime.math_max(0.0, leftVol)
        elif vaHiIdx < bins - 1:
            vaHiIdx += 1
            cumVA += runtime.math_max(0.0, rightVol)

buyPct = totalVol > 0 ? buyVol / totalVol * 100.0 : 50.0
sellPct = totalVol > 0 ? sellVol / totalVol * 100.0 : 50.0
deltaPct = totalVol > 0 ? (buyVol - sellVol) / totalVol * 100.0 : 0.0
poc = rangeLo + (pocIdx + 0.5) * step
vaLow = rangeLo + vaLoIdx * step
vaHigh = rangeLo + (vaHiIdx + 1.0) * step

    [buyPct, sellPct, deltaPct, poc, vaLow, vaHigh]

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
// CHART TF TEXT HELPER
//-----------------------------------------------------------------------------
f_chartTfText() =>
    timeframe.isseconds ? runtime.str_tostring(1) + "S" :
     timeframe.isminutes ? runtime.str_tostring(1) + "M" :
     timeframe.isdaily ? "1D" :
     timeframe.isweekly ? "1W" :
     timeframe.ismonthly ? "1M" : runtime.syminfo.period


//=============================================================================
// PREMIUM ZONE RADAR V2.0
// Clean chart + one active trade + live management + persistent alerts.
// Existing zone/reversal calculations above remain available and unchanged.
//=============================================================================
groupPremium = "🐋 WHALE PREMIUM DIGITAL DASHBOARD"
groupOptionalAlerts = "🐋 WHALE SIGNAL ALERT"

showDesktopDashboard = true, "Show WHALE Dashboard", group=groupPremium)
dashboardLayoutOpt = "Card"  // UI compatibility only; old Zone Master dashboards are not rendered.
desktopPosOpt = "Top Right", "WHALE Dashboard Position",
     options=["Top Left","Top Center","Top Right",
              "Middle Left","Middle Center","Middle Right",
              "Bottom Left","Bottom Center","Bottom Right"], group=groupPremium)
desktopSizeOpt = "Tiny", "WHALE Dashboard Size",
     options=["Tiny","Small","Normal","Large"], group=groupPremium,
     tooltip="Tiny is the premium compact layout and is recommended for desktop/mobile.")

// V2.7 — DIGITAL dashboard text polish only. Main remains last 5 trades.
// Pine v6 supports true table text formatting, so every DIGITAL strip cell uses
// text.format_bold for stronger readability. Signal/trade logic is unchanged.
showDigitalSignalStrip = true, "Show DIGITAL Signal Strip", group=groupPremium)
digitalStripPosOpt = "Top Center", "DIGITAL Strip Position",
     options=["Top Left","Top Center","Top Right",
              "Middle Left","Middle Center","Middle Right",
              "Bottom Left","Bottom Center","Bottom Right"], group=groupPremium)
digitalStripSizeOpt = "Small", "DIGITAL Strip Size",
     options=["Tiny","Small","Normal","Large"], group=groupPremium)

// Premium digital visual constants only. No signal logic is changed here.
cardGlowOpt = true
cardFlashSeconds = 1
showZoneReadyCard = false
showDistanceAtr = true

// Old separate FLIGHT panel is intentionally removed from the visible UI.
// The exact same underlying FLIGHT engine is presented as WHALE BUY / WHALE SELL.
groupFlightPanel = "🐋 WHALE TRADE HISTORY"
showFlightPanel = false
flightPanelPosOpt = "Bottom Right"
flightPanelSizeOpt = "Small"

showFlightMonthPanel = false, "Show Full WHALE Trade History", group=groupFlightPanel,
     tooltip="Optional rolling history. The main WHALE dashboard always shows the latest 5 completed WHALE trades.")
flightMonthPanelPosOpt = "Bottom Left", "Full History Position",
     options=["Top Left","Top Center","Top Right",
              "Middle Left","Middle Center","Middle Right",
              "Bottom Left","Bottom Center","Bottom Right"], group=groupFlightPanel)
flightMonthPanelSizeOpt = "Tiny", "Full History Size",
     options=["Tiny","Small","Normal"], group=groupFlightPanel)
whaleHistoryRowsOpt = "100", "History Records Stored/Viewable",
     options=["25","50","100"], group=groupFlightPanel,
     tooltip="Up to 100 completed WHALE trades are stored. History is displayed 25 trades per page so it stays compact.")
whaleHistoryPageOpt = "1", "History Page",
     options=["1","2","3","4"], group=groupFlightPanel,
     tooltip="Page 1 = newest 25 trades. Pages 2-4 show older trades when 50/100 records are selected.")

// Keep compatibility variables private; the old Mobile/Zone Master dashboard is not rendered.
groupMobileDash = "INTERNAL UI COMPATIBILITY"
showMobileDashboard = false
mobilePosOpt = "Top Right"
mobileSizeOpt = "Tiny"

showPremiumRadar = showDesktopDashboard

// Flight stays independent.
// Market zones are ALWAYS visible; A-B-C Model 1 sits on top as confirmation.
showCleanZones = true
showAdvancedZones = true
showMarketZoneMap = true, "Show Supply / Demand (BUY + SELL Zones)", group=groupChart)
edgeConfirmEnabled = false
edgeOneSignalPerZone = true  // PRIVATE LOCKED
lockMarketZonesUntilBreak = true

groupModel1 = "MODEL 1 • A-B-C / ZONE B"
modelPivotLeft = 2  // PRIVATE LOCKED
modelPivotRight = 2  // PRIVATE LOCKED
modelConfirmWindowBars = 8  // PRIVATE LOCKED
modelPointBToleranceTicks = 2  // PRIVATE LOCKED
showModelStructure = false
modelAlertsPersistent = false
requireAdx = true  // PRIVATE LOCKED
adxReadyLevel = 25.0  // PRIVATE LOCKED
adxCautionLevel = 20.0  // PRIVATE LOCKED

// Dashboard guidance only — does not create or cancel trades.
adxTradeIdea = adx5 >= adxReadyLevel ? "TRADE OK" :
     adx5 >= adxCautionLevel ? "WAIT / CONFIRM" : "LEAVE / NO TRADE"
adxTradeIdeaColor = adx5 >= adxReadyLevel ? runtime.color_rgb(0, 214, 160) :
     adx5 >= adxCautionLevel ? runtime.color_rgb(245, 190, 65) : runtime.color_rgb(255, 82, 96)
fullAdxTradeText = "ADX 5M • " + runtime.str_tostring(adx5, "#.0") + " • " +
     adxStatus + " • " + adxTradeIdea
zoneBufferAtr = 0.12  // PRIVATE LOCKED
tpRiskStep = 1.0  // PRIVATE LOCKED
persistentAlerts = true, "Enable WHALE BUY / SELL Alerts", group=groupOptionalAlerts,
     tooltip="Create ONE TradingView alert using Any alert() function call. Each NEW WHALE BUY or WHALE SELL sends ONE notification only. The TradingView alert stays active until you stop/delete it.")
memberClosedMute = false  // legacy compatibility only; no repeated WHALE reminders
rejectStructureLookback = 10  // PRIVATE LOCKED
rejectOneTradePerConfirm = true  // PRIVATE LOCKED
signalMarkerGapAtr = 1.15  // PRIVATE LOCKED
signalMarkerCandleGap = 1.00  // PRIVATE LOCKED
zoneVisualPrimaryMinAtr = 0.18  // PRIVATE LOCKED
zoneVisualSecondaryMinAtr = 0.15  // PRIVATE LOCKED
zoneConfluenceGapAtr = 0.22  // PRIVATE LOCKED
zoneCrossTextGapAtr = 0.10  // PRIVATE LOCKED
rejectEntryOnLevel2 = true
alertEveryBars = 1  // legacy compatibility only; repeated alerts are disabled

groupTradeDisplay = "OPTIONAL TRADE INFORMATION"
slDisplayMode = "Off", "SL Display",
     options=["Off","Zone","ATR","Custom Points"], group=groupTradeDisplay,
     tooltip="Dashboard display only. Members can choose an SL style suitable for their account.")
slAtrMultDisplay = 1.50, "ATR SL Multiplier", minval=0.25, maxval=10.0, step=0.25, group=groupTradeDisplay)
slCustomPointsDisplay = 250.0, "Custom SL Points", minval=1.0, maxval=100000.0, step=1.0, group=groupTradeDisplay)
slZoneBufferDisplay = 0.15, "Zone SL Buffer ATR", minval=0.0, maxval=3.0, step=0.05, group=groupTradeDisplay)
showTpDashboard = true, "Show TP1 - TP5 in Dashboard", group=groupTradeDisplay)
tpStepDisplayR = 1.0, "TP Risk Step", minval=0.25, maxval=5.0, step=0.25, group=groupTradeDisplay)
showBeDashboard = true, "Show Break-Even Status", group=groupTradeDisplay)
beTriggerProfitUsd = 5.0, "BE After Profit ($)", minval=0.5, maxval=1000.0, step=0.5, group=groupTradeDisplay)

groupZoneTargets = "OPTIONAL ZONE TARGETS"
zoneSignalLabelSize = "Small", "Zone Signal Label Size",
     options=["Tiny","Small","Normal","Large"], group=groupZoneTargets,
     tooltip="Size of the confirmed UP/DOWN arrow printed on the confirmation candle.")

f_zoneSignalSize() =>
    zoneSignalLabelSize == "Tiny" ? "tiny" :
     zoneSignalLabelSize == "Small" ? "small" :
     zoneSignalLabelSize == "Large" ? "large" : "normal"
showZoneTargets = false, "Show Zone TP", group=groupZoneTargets,
     tooltip="Visual target guidance for UP/DOWN zone signals only. Flight BUY/SELL signal logic is untouched.")
zoneTpAtrLen = 14, "Zone TP ATR Length", minval=5, maxval=100, group=groupZoneTargets)
zoneTp1Atr = 0.80, "TP1 ATR", minval=0.10, maxval=10.0, step=0.10, group=groupZoneTargets)
zoneTp2Atr = 1.60, "TP2 ATR", minval=0.20, maxval=20.0, step=0.10, group=groupZoneTargets)
zoneTargetBars = 80, "Target Line Bars", minval=10, maxval=500, group=groupZoneTargets)

groupUiPolish = "OPTIONAL UI"
flashStatusOpt = true, "Flash New BUY / SELL Status", group=groupUiPolish)
flashBarsOpt = 10, "Flash For Bars", minval=1, maxval=50, group=groupUiPolish)
showFreshBadge = true, "Show NEW Signal Badge", group=groupUiPolish)
freshBarsOpt = 5, "NEW Badge Bars", minval=1, maxval=25, group=groupUiPolish)
showConfidenceBar = true, "Show Confidence Bar", group=groupUiPolish)
showMarketStateRow = true, "Show Market State", group=groupUiPolish)
showZoneCounters = false, "Show Zone Counters Today", group=groupUiPolish,
     tooltip="Display only. Counts confirmed UP/DOWN zone setups today.")

groupDecision = "OPTIONAL ENTRY / EXIT DISPLAY"
showDecisionLabels = true, "Show Exact ENTRY / EXIT Labels", group=groupDecision,
     tooltip="Highlights the exact closed L2 entry candle and the exact confirmed exit/reversal candle.")
showExitWatchLabel = true, "Show REJECT / BREAK Watch At Opposite Zone", group=groupDecision,
     tooltip="While a trade is active, show EXIT WATCH when price reaches the opposite zone. The trade does not reverse until the opposite L2 confirms.")
showOriginWatchLabel = true, "Show Locked Zone WATCH Label", group=groupDecision,
     tooltip="Shows one small WATCH label when the exact origin zone is locked. It disappears when entry confirms.")
highlightDecisionCandles = true, "Highlight Confirmed Entry / Exit Candles", group=groupDecision)
decisionLabelSizeOpt = "Small", "Entry / Exit Label Size",
     options=["Tiny","Small","Normal","Large"], group=groupDecision)
decisionHistoryOpt = "Latest Only", "Decision Label History",
     options=["Latest Only","All"], group=groupDecision,
     tooltip="Latest Only keeps the live chart clean. All keeps every historical zone-to-zone entry/reversal label.")
outsideConfirmMode = "Full Candle"  // PRIVATE LOCKED
conflictFilterEnabled = true  // PRIVATE LOCKED
conflictGapAtr = 0.12  // PRIVATE LOCKED
showConflictHighlight = true, "Highlight Conflict Cluster", group=groupDecision)
targetDecisionBars = 3  // PRIVATE LOCKED
decisionTouchWindowBars = 999999

f_decisionLabelSize() =>
    decisionLabelSizeOpt == "Tiny" ? "tiny" :
     decisionLabelSizeOpt == "Small" ? "small" :
     decisionLabelSizeOpt == "Large" ? "large" : "normal"

showFlightOnChart = true, "Show WHALE BUY / SELL On Chart 🐋", group=groupChart,
     tooltip="Same locked main signal engine. Only the visible name changes: FLIGHT BUY/SELL is now WHALE BUY/SELL.")
flightChartSizeOpt = "Small", "WHALE Chart Signal Size",
     options=["Small","Normal","Large"], group=groupChart)

f_flightChartSize() =>
    flightChartSizeOpt == "Small" ? "small" :
     flightChartSizeOpt == "Large" ? "large" : "normal"

mobileCompact = dashboardLayoutOpt == "Mobile" and showMobileDashboard

groupInternalControl = "INTERNAL CONTROL ENGINE"
controlPivotLen = 3  // PRIVATE LOCKED
controlConfirmBars = 2  // PRIVATE LOCKED
controlSwitchMargin = 12.0  // PRIVATE LOCKED
controlMinScore = 58.0  // PRIVATE LOCKED
trendArrowGapAtr = 1.60  // PRIVATE LOCKED
takeoverWindowBars = 80  // PRIVATE LOCKED
takeoverConfirmBars = 2  // PRIVATE LOCKED
takeoverBodyAtr = 0.55  // PRIVATE LOCKED
takeoverMoveAtr = 1.20  // PRIVATE LOCKED

groupSideways = "SIDEWAYS / TRADE QUALITY FILTER"
useSidewaysFilter = true  // PRIVATE LOCKED
minZoneGapAtr = 0.80  // PRIVATE LOCKED
minRoomRR = 1.50  // PRIVATE LOCKED
emaSlopeLookback = 10  // PRIVATE LOCKED
minEmaSlopeAtr = 0.08  // PRIVATE LOCKED
requireMtfAgreement = true  // PRIVATE LOCKED


//=============================================================================
// SFA MODEL 1 — EXACT A-B-C / BOS / ZONE B / NEXT-CANDLE LOGIC
// Independent from Flight ✈ BUY/SELL.
//
// BULLISH MODEL
//  1) A = confirmed structure runtime.high.
//  2) B = subsequent confirmed swing runtime.low.
//     The last bearish candle around B defines ZONE B (Demand).
//  3) A clean CLOSED candle breaks above A = BOS.
//  4) C = first confirmed swing runtime.high after BOS.
//  5) Price returns to Point B / Zone B.
//  6) Retest candle may wick into B, but must CLOSE back above the invalid side.
//  7) ⚡ confirms on the NEXT source-timeframe candle.
//     Point B remains the official entry/reference; Point C is Target 1.
//
// BEARISH = exact opposite.
//
// CLOSED-CANDLE SAFETY
// A/B/C/BOS/retest are accepted only after their source candle has closed.
// The ⚡ event is then armed for the next source-timeframe candle, so it does
// not flash/repaint intrabar from an unfinished retest candle.
//=============================================================================
f_model1ABC() =>
    // Processes PREVIOUS source candle only -> closed-candle logic.
    if 'lastSwingHighM' not in locals(): lastSwingHighM = runtime.na
    if 'lastSwingHighTimeM' not in locals(): lastSwingHighTimeM = runtime.na
    if 'lastSwingLowM' not in locals(): lastSwingLowM = runtime.na
    if 'lastSwingLowTimeM' not in locals(): lastSwingLowTimeM = runtime.na

    if 'bullA' not in locals(): bullA = runtime.na
    if 'bullB' not in locals(): bullB = runtime.na
    if 'bullC' not in locals(): bullC = runtime.na
    if 'bullZoneTop' not in locals(): bullZoneTop = runtime.na
    if 'bullZoneBot' not in locals(): bullZoneBot = runtime.na
    if 'bullBTime' not in locals(): bullBTime = runtime.na
    if 'bullBosTime' not in locals(): bullBosTime = runtime.na
    if 'bullCTime' not in locals(): bullCTime = runtime.na
    if 'bullRetestTime' not in locals(): bullRetestTime = runtime.na
    if 'bullRetestClose' not in locals(): bullRetestClose = runtime.na
    if 'bullStage' not in locals(): bullStage = 0

    if 'bearA' not in locals(): bearA = runtime.na
    if 'bearB' not in locals(): bearB = runtime.na
    if 'bearC' not in locals(): bearC = runtime.na
    if 'bearZoneTop' not in locals(): bearZoneTop = runtime.na
    if 'bearZoneBot' not in locals(): bearZoneBot = runtime.na
    if 'bearBTime' not in locals(): bearBTime = runtime.na
    if 'bearBosTime' not in locals(): bearBosTime = runtime.na
    if 'bearCTime' not in locals(): bearCTime = runtime.na
    if 'bearRetestTime' not in locals(): bearRetestTime = runtime.na
    if 'bearRetestClose' not in locals(): bearRetestClose = runtime.na
    if 'bearStage' not in locals(): bearStage = 0

canProcess = not runtime.na(runtime.time[1])

    if canProcess:
cClose = runtime.close[1]
cOpen = runtime.open[1]
cHigh = runtime.high[1]
cLow = runtime.low[1]
cTime = runtime.time[1]

phM = runtime.ta_pivothigh(runtime.high, modelPivotLeft, modelPivotRight)[1]
plM = runtime.ta_pivotlow(runtime.low, modelPivotLeft, modelPivotRight)[1]
pivotOffset = modelPivotRight + 1
pTime = runtime.time[pivotOffset]

        // ------------------------------------------------------------
        // STAGE 4 -> IMMEDIATE NEXT CLOSED CANDLE CONFIRMATION
        // BUY  : red test candle -> immediate next GREEN candle.
        // SELL : green test candle -> immediate next RED candle.
        // If the immediate next candle does not confirm, go back to Stage 3
        // and wait for a NEW test at Zone B. No late/middle confirmation.
        // ------------------------------------------------------------
        if bullStage == 4 and not runtime.na(bullRetestTime) and cTime > bullRetestTime:
bullNextGreen = cClose > cOpen and cClose > bullRetestClose
            if bullNextGreen:
                bullStage = 5
            else:
                bullStage = 3
                bullRetestTime = runtime.na
                bullRetestClose = runtime.na

        if bearStage == 4 and not runtime.na(bearRetestTime) and cTime > bearRetestTime:
bearNextRed = cClose < cOpen and cClose < bearRetestClose
            if bearNextRed:
                bearStage = 5
            else:
                bearStage = 3
                bearRetestTime = runtime.na
                bearRetestClose = runtime.na

        // ------------------------------------------------------------
        // INVALIDATION — closed candle only
        // ------------------------------------------------------------
        if bullStage > 0 and not runtime.na(bullZoneBot) and cClose < bullZoneBot:
            bullA = runtime.na
            bullB = runtime.na
            bullC = runtime.na
            bullZoneTop = runtime.na
            bullZoneBot = runtime.na
            bullBTime = runtime.na
            bullBosTime = runtime.na
            bullCTime = runtime.na
            bullRetestTime = runtime.na
            bullRetestClose = runtime.na
            bullStage = 0

        if bearStage > 0 and not runtime.na(bearZoneTop) and cClose > bearZoneTop:
            bearA = runtime.na
            bearB = runtime.na
            bearC = runtime.na
            bearZoneTop = runtime.na
            bearZoneBot = runtime.na
            bearBTime = runtime.na
            bearBosTime = runtime.na
            bearCTime = runtime.na
            bearRetestTime = runtime.na
            bearRetestClose = runtime.na
            bearStage = 0

        // ------------------------------------------------------------
        // A-B STRUCTURE
        // ------------------------------------------------------------
        if not runtime.na(phM):
            // Bearish Model:
            // A = previous swing runtime.low, B = later swing runtime.high / SELL Zone B.
            if (bearStage == 0 or bearStage == 1) and:
                 not runtime.na(lastSwingLowM) and not runtime.na(lastSwingLowTimeM) and
                 lastSwingLowTimeM < pTime
ob = runtime.close[pivotOffset] > runtime.open[pivotOffset] ? pivotOffset :
                     runtime.close[pivotOffset + 1] > runtime.open[pivotOffset + 1] ? pivotOffset + 1 :
                     pivotOffset
                bearA = lastSwingLowM
                bearB = phM
                bearZoneTop = phM
                bearZoneBot = runtime.math_min(runtime.open[ob], runtime.close[ob])
                bearBTime = pTime
                bearBosTime = runtime.na
                bearC = runtime.na
                bearCTime = runtime.na
                bearRetestTime = runtime.na
                bearRetestClose = runtime.na
                bearStage = 1

            lastSwingHighM = phM
            lastSwingHighTimeM = pTime

        if not runtime.na(plM):
            // Bullish Model:
            // A = previous swing runtime.high, B = later swing runtime.low / BUY Zone B.
            if (bullStage == 0 or bullStage == 1) and:
                 not runtime.na(lastSwingHighM) and not runtime.na(lastSwingHighTimeM) and
                 lastSwingHighTimeM < pTime
ob = runtime.close[pivotOffset] < runtime.open[pivotOffset] ? pivotOffset :
                     runtime.close[pivotOffset + 1] < runtime.open[pivotOffset + 1] ? pivotOffset + 1 :
                     pivotOffset
                bullA = lastSwingHighM
                bullB = plM
                bullZoneTop = runtime.math_max(runtime.open[ob], runtime.close[ob])
                bullZoneBot = plM
                bullBTime = pTime
                bullBosTime = runtime.na
                bullC = runtime.na
                bullCTime = runtime.na
                bullRetestTime = runtime.na
                bullRetestClose = runtime.na
                bullStage = 1

            lastSwingLowM = plM
            lastSwingLowTimeM = pTime

        // ------------------------------------------------------------
        // CLOSED BOS
        // ------------------------------------------------------------
        if bullStage == 1 and not runtime.na(bullA) and not runtime.na(bullBTime) and:
             cTime > bullBTime and cClose > bullA
            bullBosTime = cTime
            bullStage = 2

        if bearStage == 1 and not runtime.na(bearA) and not runtime.na(bearBTime) and:
             cTime > bearBTime and cClose < bearA
            bearBosTime = cTime
            bearStage = 2

        // ------------------------------------------------------------
        // POINT C = first confirmed post-BOS expansion extreme.
        // It may extend while waiting for retest.
        // ------------------------------------------------------------
        if bullStage == 2 and not runtime.na(bullBosTime) and cTime > bullBosTime:
            bullC = cHigh
            bullCTime = cTime
            bullStage = 3
        elif bullStage == 3 and not runtime.na(bullC) and cTime > bullBosTime and cHigh > bullC:
            bullC = cHigh
            bullCTime = cTime

        if bearStage == 2 and not runtime.na(bearBosTime) and cTime > bearBosTime:
            bearC = cLow
            bearCTime = cTime
            bearStage = 3
        elif bearStage == 3 and not runtime.na(bearC) and cTime > bearBosTime and cLow < bearC:
            bearC = cLow
            bearCTime = cTime

        // ------------------------------------------------------------
        // EXACT ZONE-B TEST CANDLE
        //
        // BUY  Zone B: RED test candle, valid runtime.close above invalid side.
        // SELL Zone B: GREEN test candle, valid runtime.close below invalid side.
        //
        // This is the ONLY candle that can arm Stage 4.
        // ------------------------------------------------------------
bullTouchesZoneB =
             bullStage == 3 and not runtime.na(bullCTime) and cTime > bullCTime and
             cLow <= bullZoneTop and cHigh >= bullZoneBot

bearTouchesZoneB =
             bearStage == 3 and not runtime.na(bearCTime) and cTime > bearCTime and
             cHigh >= bearZoneBot and cLow <= bearZoneTop

bullRedTest =
             bullTouchesZoneB and cClose < cOpen and cClose >= bullZoneBot

bearGreenTest =
             bearTouchesZoneB and cClose > cOpen and cClose <= bearZoneTop

        if bullRedTest:
            bullRetestTime = cTime
            bullRetestClose = cClose
            bullStage = 4

        if bearGreenTest:
            bearRetestTime = cTime
            bearRetestClose = cClose
            bearStage = 4

    [bullZoneTop, bullZoneBot, bullA, bullC, bullStage, bullBTime,
     bearZoneTop, bearZoneBot, bearA, bearC, bearStage, bearBTime]

// Seven independent Model 1 engines.
[m1BullTop, m1BullBot, m1BullA, m1BullC, m1BullStage, m1BullBTime, m1BearTop, m1BearBot, m1BearA, m1BearC, m1BearStage, m1BearBTime] = runtime.request_security(runtime.syminfo.tickerid, "1", f_model1ABC(), "gaps_off", "lookahead_off")
[m5BullTopM, m5BullBotM, m5BullA, m5BullC, m5BullStage, m5BullBTime, m5BearTopM, m5BearBotM, m5BearA, m5BearC, m5BearStage, m5BearBTime] = runtime.request_security(runtime.syminfo.tickerid, "5", f_model1ABC(), "gaps_off", "lookahead_off")
[m15BullTopM, m15BullBotM, m15BullA, m15BullC, m15BullStage, m15BullBTime, m15BearTopM, m15BearBotM, m15BearA, m15BearC, m15BearStage, m15BearBTime] = runtime.request_security(runtime.syminfo.tickerid, "15", f_model1ABC(), "gaps_off", "lookahead_off")
[m30BullTop, m30BullBot, m30BullA, m30BullC, m30BullStage, m30BullBTime, m30BearTop, m30BearBot, m30BearA, m30BearC, m30BearStage, m30BearBTime] = runtime.request_security(runtime.syminfo.tickerid, "30", f_model1ABC(), "gaps_off", "lookahead_off")
[h1BullTopM, h1BullBotM, h1BullA, h1BullC, h1BullStage, h1BullBTime, h1BearTopM, h1BearBotM, h1BearA, h1BearC, h1BearStage, h1BearBTime] = runtime.request_security(runtime.syminfo.tickerid, "60", f_model1ABC(), "gaps_off", "lookahead_off")
[h4BullTopM, h4BullBotM, h4BullA, h4BullC, h4BullStage, h4BullBTime, h4BearTopM, h4BearBotM, h4BearA, h4BearC, h4BearStage, h4BearBTime] = runtime.request_security(runtime.syminfo.tickerid, "240", f_model1ABC(), "gaps_off", "lookahead_off")
[d1BullTop, d1BullBot, d1BullA, d1BullC, d1BullStage, d1BullBTime, d1BearTop, d1BearBot, d1BearA, d1BearC, d1BearStage, d1BearBTime] = runtime.request_security(runtime.syminfo.tickerid, "D", f_model1ABC(), "gaps_off", "lookahead_off")

//=============================================================================
// MAIN MODEL = CURRENT CHART TIMEFRAME ONLY
//
// IMPORTANT:
// • The 7 Model engines above continue to run for status/scanner context.
// • The large Model-1 dashboard, visible Model Zone B, ⚡ signal, Model P/L,
//   BE and Model alerts use ONLY the chart timeframe.
// • Therefore a 1M signal can NEVER appear as the main signal on a 15M chart.
//=============================================================================
chartModelIs1M = runtime.syminfo.period == "1"
chartModelIs5M = runtime.syminfo.period == "5"
chartModelIs15M = runtime.syminfo.period == "15"
chartModelIs30M = runtime.syminfo.period == "30"
chartModelIs1H = runtime.syminfo.period == "60"
chartModelIs4H = runtime.syminfo.period == "240"
chartModelIsD1 = runtime.syminfo.period == "D"
chartModelSupported = chartModelIs1M or chartModelIs5M or chartModelIs15M or
     chartModelIs30M or chartModelIs1H or chartModelIs4H or chartModelIsD1

chartModelTF =
     chartModelIs1M ? "1M" :
     chartModelIs5M ? "5M" :
     chartModelIs15M ? "15M" :
     chartModelIs30M ? "30M" :
     chartModelIs1H ? "1H" :
     chartModelIs4H ? "4H" :
     chartModelIsD1 ? "D1" : "UNSUPPORTED"

chartBullTop =
     chartModelIs1M ? m1BullTop :
     chartModelIs5M ? m5BullTopM :
     chartModelIs15M ? m15BullTopM :
     chartModelIs30M ? m30BullTop :
     chartModelIs1H ? h1BullTopM :
     chartModelIs4H ? h4BullTopM :
     chartModelIsD1 ? d1BullTop : runtime.na

chartBullBot =
     chartModelIs1M ? m1BullBot :
     chartModelIs5M ? m5BullBotM :
     chartModelIs15M ? m15BullBotM :
     chartModelIs30M ? m30BullBot :
     chartModelIs1H ? h1BullBotM :
     chartModelIs4H ? h4BullBotM :
     chartModelIsD1 ? d1BullBot : runtime.na

chartBullA =
     chartModelIs1M ? m1BullA :
     chartModelIs5M ? m5BullA :
     chartModelIs15M ? m15BullA :
     chartModelIs30M ? m30BullA :
     chartModelIs1H ? h1BullA :
     chartModelIs4H ? h4BullA :
     chartModelIsD1 ? d1BullA : runtime.na

chartBullC =
     chartModelIs1M ? m1BullC :
     chartModelIs5M ? m5BullC :
     chartModelIs15M ? m15BullC :
     chartModelIs30M ? m30BullC :
     chartModelIs1H ? h1BullC :
     chartModelIs4H ? h4BullC :
     chartModelIsD1 ? d1BullC : runtime.na

chartBullStage =
     chartModelIs1M ? m1BullStage :
     chartModelIs5M ? m5BullStage :
     chartModelIs15M ? m15BullStage :
     chartModelIs30M ? m30BullStage :
     chartModelIs1H ? h1BullStage :
     chartModelIs4H ? h4BullStage :
     chartModelIsD1 ? d1BullStage : 0

chartBullBTime =
     chartModelIs1M ? m1BullBTime :
     chartModelIs5M ? m5BullBTime :
     chartModelIs15M ? m15BullBTime :
     chartModelIs30M ? m30BullBTime :
     chartModelIs1H ? h1BullBTime :
     chartModelIs4H ? h4BullBTime :
     chartModelIsD1 ? d1BullBTime : runtime.na

chartBearTop =
     chartModelIs1M ? m1BearTop :
     chartModelIs5M ? m5BearTopM :
     chartModelIs15M ? m15BearTopM :
     chartModelIs30M ? m30BearTop :
     chartModelIs1H ? h1BearTopM :
     chartModelIs4H ? h4BearTopM :
     chartModelIsD1 ? d1BearTop : runtime.na

chartBearBot =
     chartModelIs1M ? m1BearBot :
     chartModelIs5M ? m5BearBotM :
     chartModelIs15M ? m15BearBotM :
     chartModelIs30M ? m30BearBot :
     chartModelIs1H ? h1BearBotM :
     chartModelIs4H ? h4BearBotM :
     chartModelIsD1 ? d1BearBot : runtime.na

chartBearA =
     chartModelIs1M ? m1BearA :
     chartModelIs5M ? m5BearA :
     chartModelIs15M ? m15BearA :
     chartModelIs30M ? m30BearA :
     chartModelIs1H ? h1BearA :
     chartModelIs4H ? h4BearA :
     chartModelIsD1 ? d1BearA : runtime.na

chartBearC =
     chartModelIs1M ? m1BearC :
     chartModelIs5M ? m5BearC :
     chartModelIs15M ? m15BearC :
     chartModelIs30M ? m30BearC :
     chartModelIs1H ? h1BearC :
     chartModelIs4H ? h4BearC :
     chartModelIsD1 ? d1BearC : runtime.na

chartBearStage =
     chartModelIs1M ? m1BearStage :
     chartModelIs5M ? m5BearStage :
     chartModelIs15M ? m15BearStage :
     chartModelIs30M ? m30BearStage :
     chartModelIs1H ? h1BearStage :
     chartModelIs4H ? h4BearStage :
     chartModelIsD1 ? d1BearStage : 0

chartBearBTime =
     chartModelIs1M ? m1BearBTime :
     chartModelIs5M ? m5BearBTime :
     chartModelIs15M ? m15BearBTime :
     chartModelIs30M ? m30BearBTime :
     chartModelIs1H ? h1BearBTime :
     chartModelIs4H ? h4BearBTime :
     chartModelIsD1 ? d1BearBTime : runtime.na

// Model stage meaning:
// 1 = A + B identified / WAIT BOS
// 2 = BOS confirmed / WAIT C
// 3 = A-B-C complete / WAIT RETEST
// 4 = valid retest / NEXT CANDLE armed
// 5 = ⚡ confirmed
//
// We keep a stage-1/2 model visible so the user can SEE A/B/BOS building,
// exactly like the Model-1 reference image.
f_modelDistance(float top, float bot) =>
    not runtime.na(top) and not runtime.na(bot) ? (runtime.close >= bot and runtime.close <= top ? 0.0 : runtime.close > top ? runtime.close - top : bot - runtime.close) : 1e20

modelRankAtr = runtime.math_max(runtime.ta_atr(14), runtime.syminfo.mintick * 20)

f_modelRankScore(float top, float bot, int stage) =>
    // More mature structure strongly wins over an early A-B candidate.
maturityPenalty = stage >= 5 ? 0.0 :
         stage == 4 ? modelRankAtr * 2.0 :
         stage == 3 ? modelRankAtr * 5.0 :
         stage == 2 ? modelRankAtr * 12.0 :
         stage == 1 ? modelRankAtr * 20.0 : 1e20
    f_modelDistance(top, bot) + maturityPenalty

rawModelBuyTop = runtime.na
rawModelBuyBot = runtime.na
rawModelBuyA = runtime.na
rawModelBuyC = runtime.na
rawModelBuyStage = 0
rawModelBuyBTime = runtime.na
rawModelBuyTF = "--"
rawModelBuyDist = 1e20

rawModelSellTop = runtime.na
rawModelSellBot = runtime.na
rawModelSellA = runtime.na
rawModelSellC = runtime.na
rawModelSellStage = 0
rawModelSellBTime = runtime.na
rawModelSellTF = "--"
rawModelSellDist = 1e20

// Pick the nearest fully formed bullish Model 1 setup.
if m1BullStage > 0:
d = f_modelRankScore(m1BullTop, m1BullBot, m1BullStage)
    if d < rawModelBuyDist:
        rawModelBuyDist = d
        rawModelBuyTop = m1BullTop
        rawModelBuyBot = m1BullBot
        rawModelBuyA = m1BullA
        rawModelBuyC = m1BullC
        rawModelBuyStage = m1BullStage
        rawModelBuyBTime = m1BullBTime
        rawModelBuyTF = "1M"
if m5BullStage > 0:
d = f_modelRankScore(m5BullTopM, m5BullBotM, m5BullStage)
    if d < rawModelBuyDist:
        rawModelBuyDist = d
        rawModelBuyTop = m5BullTopM
        rawModelBuyBot = m5BullBotM
        rawModelBuyA = m5BullA
        rawModelBuyC = m5BullC
        rawModelBuyStage = m5BullStage
        rawModelBuyBTime = m5BullBTime
        rawModelBuyTF = "5M"
if m15BullStage > 0:
d = f_modelRankScore(m15BullTopM, m15BullBotM, m15BullStage)
    if d < rawModelBuyDist:
        rawModelBuyDist = d
        rawModelBuyTop = m15BullTopM
        rawModelBuyBot = m15BullBotM
        rawModelBuyA = m15BullA
        rawModelBuyC = m15BullC
        rawModelBuyStage = m15BullStage
        rawModelBuyBTime = m15BullBTime
        rawModelBuyTF = "15M"
if m30BullStage > 0:
d = f_modelRankScore(m30BullTop, m30BullBot, m30BullStage)
    if d < rawModelBuyDist:
        rawModelBuyDist = d
        rawModelBuyTop = m30BullTop
        rawModelBuyBot = m30BullBot
        rawModelBuyA = m30BullA
        rawModelBuyC = m30BullC
        rawModelBuyStage = m30BullStage
        rawModelBuyBTime = m30BullBTime
        rawModelBuyTF = "30M"
if h1BullStage > 0:
d = f_modelRankScore(h1BullTopM, h1BullBotM, h1BullStage)
    if d < rawModelBuyDist:
        rawModelBuyDist = d
        rawModelBuyTop = h1BullTopM
        rawModelBuyBot = h1BullBotM
        rawModelBuyA = h1BullA
        rawModelBuyC = h1BullC
        rawModelBuyStage = h1BullStage
        rawModelBuyBTime = h1BullBTime
        rawModelBuyTF = "1H"
if h4BullStage > 0:
d = f_modelRankScore(h4BullTopM, h4BullBotM, h4BullStage)
    if d < rawModelBuyDist:
        rawModelBuyDist = d
        rawModelBuyTop = h4BullTopM
        rawModelBuyBot = h4BullBotM
        rawModelBuyA = h4BullA
        rawModelBuyC = h4BullC
        rawModelBuyStage = h4BullStage
        rawModelBuyBTime = h4BullBTime
        rawModelBuyTF = "4H"
if d1BullStage > 0:
d = f_modelRankScore(d1BullTop, d1BullBot, d1BullStage)
    if d < rawModelBuyDist:
        rawModelBuyDist = d
        rawModelBuyTop = d1BullTop
        rawModelBuyBot = d1BullBot
        rawModelBuyA = d1BullA
        rawModelBuyC = d1BullC
        rawModelBuyStage = d1BullStage
        rawModelBuyBTime = d1BullBTime
        rawModelBuyTF = "D1"

// Pick the nearest fully formed bearish Model 1 setup.
if m1BearStage > 0:
d = f_modelRankScore(m1BearTop, m1BearBot, m1BearStage)
    if d < rawModelSellDist:
        rawModelSellDist = d
        rawModelSellTop = m1BearTop
        rawModelSellBot = m1BearBot
        rawModelSellA = m1BearA
        rawModelSellC = m1BearC
        rawModelSellStage = m1BearStage
        rawModelSellBTime = m1BearBTime
        rawModelSellTF = "1M"
if m5BearStage > 0:
d = f_modelRankScore(m5BearTopM, m5BearBotM, m5BearStage)
    if d < rawModelSellDist:
        rawModelSellDist = d
        rawModelSellTop = m5BearTopM
        rawModelSellBot = m5BearBotM
        rawModelSellA = m5BearA
        rawModelSellC = m5BearC
        rawModelSellStage = m5BearStage
        rawModelSellBTime = m5BearBTime
        rawModelSellTF = "5M"
if m15BearStage > 0:
d = f_modelRankScore(m15BearTopM, m15BearBotM, m15BearStage)
    if d < rawModelSellDist:
        rawModelSellDist = d
        rawModelSellTop = m15BearTopM
        rawModelSellBot = m15BearBotM
        rawModelSellA = m15BearA
        rawModelSellC = m15BearC
        rawModelSellStage = m15BearStage
        rawModelSellBTime = m15BearBTime
        rawModelSellTF = "15M"
if m30BearStage > 0:
d = f_modelRankScore(m30BearTop, m30BearBot, m30BearStage)
    if d < rawModelSellDist:
        rawModelSellDist = d
        rawModelSellTop = m30BearTop
        rawModelSellBot = m30BearBot
        rawModelSellA = m30BearA
        rawModelSellC = m30BearC
        rawModelSellStage = m30BearStage
        rawModelSellBTime = m30BearBTime
        rawModelSellTF = "30M"
if h1BearStage > 0:
d = f_modelRankScore(h1BearTopM, h1BearBotM, h1BearStage)
    if d < rawModelSellDist:
        rawModelSellDist = d
        rawModelSellTop = h1BearTopM
        rawModelSellBot = h1BearBotM
        rawModelSellA = h1BearA
        rawModelSellC = h1BearC
        rawModelSellStage = h1BearStage
        rawModelSellBTime = h1BearBTime
        rawModelSellTF = "1H"
if h4BearStage > 0:
d = f_modelRankScore(h4BearTopM, h4BearBotM, h4BearStage)
    if d < rawModelSellDist:
        rawModelSellDist = d
        rawModelSellTop = h4BearTopM
        rawModelSellBot = h4BearBotM
        rawModelSellA = h4BearA
        rawModelSellC = h4BearC
        rawModelSellStage = h4BearStage
        rawModelSellBTime = h4BearBTime
        rawModelSellTF = "4H"
if d1BearStage > 0:
d = f_modelRankScore(d1BearTop, d1BearBot, d1BearStage)
    if d < rawModelSellDist:
        rawModelSellDist = d
        rawModelSellTop = d1BearTop
        rawModelSellBot = d1BearBot
        rawModelSellA = d1BearA
        rawModelSellC = d1BearC
        rawModelSellStage = d1BearStage
        rawModelSellBTime = d1BearBTime
        rawModelSellTF = "D1"
// CLOSED-CANDLE MAIN MODEL SELECTION — CURRENT CHART TF ONLY.
// All 7 TF statuses remain available separately below.
if 'modelBuyTop' not in locals(): modelBuyTop = runtime.na
if 'modelBuyBot' not in locals(): modelBuyBot = runtime.na
if 'modelBuyA' not in locals(): modelBuyA = runtime.na
if 'modelBuyC' not in locals(): modelBuyC = runtime.na
if 'modelBuyStage' not in locals(): modelBuyStage = 0
if 'modelBuyBTime' not in locals(): modelBuyBTime = runtime.na
if 'modelBuyTF' not in locals(): modelBuyTF = "--"

if 'modelSellTop' not in locals(): modelSellTop = runtime.na
if 'modelSellBot' not in locals(): modelSellBot = runtime.na
if 'modelSellA' not in locals(): modelSellA = runtime.na
if 'modelSellC' not in locals(): modelSellC = runtime.na
if 'modelSellStage' not in locals(): modelSellStage = 0
if 'modelSellBTime' not in locals(): modelSellBTime = runtime.na
if 'modelSellTF' not in locals(): modelSellTF = "--"

if barstate.isconfirmed:
    if chartModelSupported and chartBullStage > 0 and not runtime.na(chartBullTop) and not runtime.na(chartBullBot):
        modelBuyTop = chartBullTop
        modelBuyBot = chartBullBot
        modelBuyA = chartBullA
        modelBuyC = chartBullC
        modelBuyStage = chartBullStage
        modelBuyBTime = chartBullBTime
        modelBuyTF = chartModelTF
    else:
        modelBuyTop = runtime.na
        modelBuyBot = runtime.na
        modelBuyA = runtime.na
        modelBuyC = runtime.na
        modelBuyStage = 0
        modelBuyBTime = runtime.na
        modelBuyTF = chartModelSupported ? chartModelTF : "--"

    if chartModelSupported and chartBearStage > 0 and not runtime.na(chartBearTop) and not runtime.na(chartBearBot):
        modelSellTop = chartBearTop
        modelSellBot = chartBearBot
        modelSellA = chartBearA
        modelSellC = chartBearC
        modelSellStage = chartBearStage
        modelSellBTime = chartBearBTime
        modelSellTF = chartModelTF
    else:
        modelSellTop = runtime.na
        modelSellBot = runtime.na
        modelSellA = runtime.na
        modelSellC = runtime.na
        modelSellStage = 0
        modelSellBTime = runtime.na
        modelSellTF = chartModelSupported ? chartModelTF : "--"

modelBuyB = modelBuyBot
modelSellB = modelSellTop

f_modelStageText(int stage, bool bullish) =>
    stage == 5 ? (bullish ? "⚡ BUY CONFIRMED" : "⚡ SELL CONFIRMED") :
     stage == 4 ? (bullish ? "RED TEST ✓ • WAIT NEXT GREEN" : "GREEN TEST ✓ • WAIT NEXT RED") :
     stage == 3 ? "A-B-C ✓ • WAIT ZONE B TEST" :
     stage == 2 ? "BOS ✓ • WAIT C" :
     stage == 1 ? "A-B ✓ • WAIT BOS" : "WAIT"

f_modelStageShort(int stage) =>
    stage == 5 ? "⚡" :
     stage == 4 ? "RETEST" :
     stage == 3 ? "ABC" :
     stage == 2 ? "BOS" :
     stage == 1 ? "A-B" : "WAIT"

// Resolve the complete nearest-zone ranges from the selected timeframe.
nearestBuyTopFull = nearestBuyTF == "5M" ? m5BuyTop :
     nearestBuyTF == "15M" ? m15BuyTop :
     nearestBuyTF == "1H" ? h1BuyTop :
     nearestBuyTF == "4H" ? h4BuyTop : runtime.na
nearestBuyBotFull = nearestBuyTF == "5M" ? m5BuyBot :
     nearestBuyTF == "15M" ? m15BuyBot :
     nearestBuyTF == "1H" ? h1BuyBot :
     nearestBuyTF == "4H" ? h4BuyBot : runtime.na
nearestBuyTimeFull = nearestBuyTF == "5M" ? m5BuyTimeRaw :
     nearestBuyTF == "15M" ? m15BuyTimeRaw :
     nearestBuyTF == "1H" ? h1BuyTimeRaw :
     nearestBuyTF == "4H" ? h4BuyTimeRaw : runtime.na

nearestSellTopFull = nearestSellTF == "5M" ? m5SellTop :
     nearestSellTF == "15M" ? m15SellTop :
     nearestSellTF == "1H" ? h1SellTop :
     nearestSellTF == "4H" ? h4SellTop : runtime.na
nearestSellBotFull = nearestSellTF == "5M" ? m5SellBot :
     nearestSellTF == "15M" ? m15SellBot :
     nearestSellTF == "1H" ? h1SellBot :
     nearestSellTF == "4H" ? h4SellBot : runtime.na
nearestSellTimeFull = nearestSellTF == "5M" ? m5SellTimeRaw :
     nearestSellTF == "15M" ? m15SellTimeRaw :
     nearestSellTF == "1H" ? h1SellTimeRaw :
     nearestSellTF == "4H" ? h4SellTimeRaw : runtime.na


// Advanced zone ranking: select the second and third nearest valid BUY and SELL zones.
f_rankBuyZones() =>
    tops = array.from(m5BuyTop, m15BuyTop, h1BuyTop, h4BuyTop)
    bots = array.from(m5BuyBot, m15BuyBot, h1BuyBot, h4BuyBot)
    times = array.from(m5BuyTimeRaw, m15BuyTimeRaw, h1BuyTimeRaw, h4BuyTimeRaw)
    names = array.from("5M", "15M", "1H", "4H")
    dists = []

    for i = 0 to 3
t = tops[int(i)]
b = bots[int(i)]
        if not runtime.na(t) and not runtime.na(b):
d = runtime.close <= t and runtime.close >= b ? 0.0 : runtime.close > t ? runtime.close - t : b - runtime.close
            dists.__setitem__(int(i), d)

first = -1
second = -1
third = -1
d1 = 1e20
d2 = 1e20
d3 = 1e20

    for i = 0 to 3
d = dists[int(i)]
        if d < d1:
            d3 = d2
            third = second
            d2 = d1
            second = first
            d1 = d
            first = i
        elif d < d2:
            d3 = d2
            third = second
            d2 = d
            second = i
        elif d < d3:
            d3 = d
            third = i

top2 = second >= 0 ? tops[int(second)] : runtime.na
bot2 = second >= 0 ? bots[int(second)] : runtime.na
time2 = second >= 0 ? times[int(second)] : runtime.na
tf2 = second >= 0 ? names[int(second)] : "--"

top3 = third >= 0 ? tops[int(third)] : runtime.na
bot3 = third >= 0 ? bots[int(third)] : runtime.na
time3 = third >= 0 ? times[int(third)] : runtime.na
tf3 = third >= 0 ? names[int(third)] : "--"

    [top2, bot2, time2, tf2, top3, bot3, time3, tf3]

f_rankSellZones() =>
    tops = array.from(m5SellTop, m15SellTop, h1SellTop, h4SellTop)
    bots = array.from(m5SellBot, m15SellBot, h1SellBot, h4SellBot)
    times = array.from(m5SellTimeRaw, m15SellTimeRaw, h1SellTimeRaw, h4SellTimeRaw)
    names = array.from("5M", "15M", "1H", "4H")
    dists = []

    for i = 0 to 3
t = tops[int(i)]
b = bots[int(i)]
        if not runtime.na(t) and not runtime.na(b):
d = runtime.close <= t and runtime.close >= b ? 0.0 : runtime.close < b ? b - runtime.close : runtime.close - t
            dists.__setitem__(int(i), d)

first = -1
second = -1
third = -1
d1 = 1e20
d2 = 1e20
d3 = 1e20

    for i = 0 to 3
d = dists[int(i)]
        if d < d1:
            d3 = d2
            third = second
            d2 = d1
            second = first
            d1 = d
            first = i
        elif d < d2:
            d3 = d2
            third = second
            d2 = d
            second = i
        elif d < d3:
            d3 = d
            third = i

top2 = second >= 0 ? tops[int(second)] : runtime.na
bot2 = second >= 0 ? bots[int(second)] : runtime.na
time2 = second >= 0 ? times[int(second)] : runtime.na
tf2 = second >= 0 ? names[int(second)] : "--"

top3 = third >= 0 ? tops[int(third)] : runtime.na
bot3 = third >= 0 ? bots[int(third)] : runtime.na
time3 = third >= 0 ? times[int(third)] : runtime.na
tf3 = third >= 0 ? names[int(third)] : "--"

    [top2, bot2, time2, tf2, top3, bot3, time3, tf3]

[buy2Top, buy2Bot, buy2Time, buy2TF, buy3Top, buy3Bot, buy3Time, buy3TF] = f_rankBuyZones()
[sell2Top, sell2Bot, sell2Time, sell2TF, sell3Top, sell3Bot, sell3Time, sell3TF] = f_rankSellZones()

f_rangesOverlap(float topA, float botA, float topB, float botB) =>
    not runtime.na(topA) and not runtime.na(botA) and not runtime.na(topB) and not runtime.na(botB) and
     runtime.math_max(botA, botB) <= runtime.math_min(topA, topB)

buy2Distinct = not f_rangesOverlap(buy2Top, buy2Bot, nearestBuyTopFull, nearestBuyBotFull)
buy3Distinct = not f_rangesOverlap(buy3Top, buy3Bot, nearestBuyTopFull, nearestBuyBotFull) and
     not f_rangesOverlap(buy3Top, buy3Bot, buy2Top, buy2Bot)
sell2Distinct = not f_rangesOverlap(sell2Top, sell2Bot, nearestSellTopFull, nearestSellBotFull)
sell3Distinct = not f_rangesOverlap(sell3Top, sell3Bot, nearestSellTopFull, nearestSellBotFull) and
     not f_rangesOverlap(sell3Top, sell3Bot, sell2Top, sell2Bot)

if 'premiumBuyBox2' not in locals(): premiumBuyBox2 = runtime.na
if 'premiumBuyBox3' not in locals(): premiumBuyBox3 = runtime.na
if 'premiumSellBox2' not in locals(): premiumSellBox2 = runtime.na
if 'premiumSellBox3' not in locals(): premiumSellBox3 = runtime.na

f_syncAdvancedBox(box bx, bool enabled, int leftTime, float top, float bottom, bool isSell, string labelText) =>
result = bx
valid = enabled and not runtime.na(leftTime) and not runtime.na(top) and not runtime.na(bottom)
    if valid:
recreate = runtime.na(result)
        if not recreate:
            recreate = box.get_left(result) != leftTime or
                 runtime.math_abs(box.get_top(result) - top) > runtime.syminfo.mintick or
                 runtime.math_abs(box.get_bottom(result) - bottom) > runtime.syminfo.mintick
        if recreate:
            if not runtime.na(result):
                runtime.box_delete(result)
            result = runtime.box_new(leftTime, top, runtime.time, bottom,
                 xloc="bar_time", extend="right",
                 bgcolor=isSell ? runtime.color_new(runtime.color_rgb(239, 68, 68), 84) : runtime.color_new(runtime.color_rgb(34, 197, 94), 84),
                 border_color=isSell ? runtime.color_new(runtime.color_rgb(165, 30, 40), 35) : runtime.color_new(runtime.color_rgb(20, 120, 65), 35),
                 border_width=1,
                 text=labelText, text_color=isSell ? runtime.color_rgb(155, 25, 35) : runtime.color_rgb(10, 105, 52),
                 text_size="tiny", text_halign=text.align_center, text_valign=text.align_center)
    else:
        if not runtime.na(result):
            runtime.box_delete(result)
            result = runtime.na
    result

premiumBuyBox2 = f_syncAdvancedBox(premiumBuyBox2, showAdvancedZones and showCleanZones and buy2Distinct, buy2Time, buy2Top, buy2Bot, false, "BUY #2 • " + buy2TF)
premiumBuyBox3 = f_syncAdvancedBox(premiumBuyBox3, showAdvancedZones and showCleanZones and buy3Distinct, buy3Time, buy3Top, buy3Bot, false, "BUY #3 • " + buy3TF)
premiumSellBox2 = f_syncAdvancedBox(premiumSellBox2, showAdvancedZones and showCleanZones and sell2Distinct, sell2Time, sell2Top, sell2Bot, true, "SELL #2 • " + sell2TF)
premiumSellBox3 = f_syncAdvancedBox(premiumSellBox3, showAdvancedZones and showCleanZones and sell3Distinct, sell3Time, sell3Top, sell3Bot, true, "SELL #3 • " + sell3TF)

inBuyZone = not runtime.na(nearestBuyTopFull) and not runtime.na(nearestBuyBotFull) and
     runtime.close <= nearestBuyTopFull and runtime.close >= nearestBuyBotFull
inSellZone = not runtime.na(nearestSellTopFull) and not runtime.na(nearestSellBotFull) and
     runtime.close <= nearestSellTopFull and runtime.close >= nearestSellBotFull

buyDistance = runtime.na(nearestBuyTopFull) ? runtime.na :
     inBuyZone ? 0.0 : runtime.close > nearestBuyTopFull ? runtime.close - nearestBuyTopFull : nearestBuyBotFull - runtime.close
sellDistance = runtime.na(nearestSellBotFull) ? runtime.na :
     inSellZone ? 0.0 : runtime.close < nearestSellBotFull ? nearestSellBotFull - runtime.close : runtime.close - nearestSellTopFull

//=============================================================================
// ALWAYS-VISIBLE MARKET ZONE MAP — 7TF / STABLE CLOSED-CANDLE SELECTION
//
// FINAL BEHAVIOUR:
// • ONE nearest practical BUY zone
// • ONE nearest practical SELL zone
// • 1M / 5M / 15M / 30M / 1H / 4H / D1 all calculated
// • NO second-by-second switching
// • Giant stale HTF zones are penalised so they cannot cover the whole chart
//   when a cleaner lower-TF zone is available.
// • Selection changes only after a CLOSED chart candle and only when the new
//   candidate is materially better, or the current zone has invalidated.
//=============================================================================
mapAtrNow = runtime.math_max(runtime.ta_atr(14), runtime.syminfo.mintick * 20)

f_mapTfPenalty(string tf) =>
    tf == "1M" ? 0.00 :
     tf == "5M" ? 0.05 :
     tf == "15M" ? 0.10 :
     tf == "30M" ? 0.16 :
     tf == "1H" ? 0.25 :
     tf == "4H" ? 0.55 :
     tf == "D1" ? 1.10 : 0.0

f_mapEdgeDistance(float top, float bot, bool isSell) =>
    if runtime.na(top) or runtime.na(bot):
        1e20
    else:
inside = runtime.close <= top and runtime.close >= bot
        isSell ? (inside ? 0.0 : runtime.close < bot ? bot - runtime.close : runtime.close - top) :
         (inside ? 0.0 : runtime.close > top ? runtime.close - top : bot - runtime.close)

f_mapScore(float top, float bot, int leftTime, string tf, bool isSell) =>
    if runtime.na(top) or runtime.na(bot) or runtime.na(leftTime):
        1e20
    else:
width = runtime.math_max(top - bot, runtime.syminfo.mintick)
widthAtr = width / mapAtrNow
ageHours = runtime.math_max(0.0, (runtime.time - leftTime) / 3600000.0)

        // Width penalty is the key fix for the giant D1 box seen in the screenshot.
widthPenalty = width * 0.55

        // If an HTF zone is enormous relative to the live chart ATR, strongly
        // demote it. It can still win only if there is genuinely nothing better.
oversizePenalty = widthAtr > 14.0 ? mapAtrNow * (40.0 + widthAtr) : 0.0

        // Gentle freshness + TF penalties. These do not override actual distance.
agePenalty = mapAtrNow * runtime.math_min(ageHours / 24.0, 30.0) * 0.025
tfPenalty = mapAtrNow * f_mapTfPenalty(tf)

        f_mapEdgeDistance(top, bot, isSell) + widthPenalty + oversizePenalty + agePenalty + tfPenalty

rawMapBuyTop = runtime.na
rawMapBuyBot = runtime.na
rawMapBuyTime = runtime.na
rawMapBuyTF = "--"
rawMapBuyScore = 1e20

rawMapSellTop = runtime.na
rawMapSellBot = runtime.na
rawMapSellTime = runtime.na
rawMapSellTF = "--"
rawMapSellScore = 1e20

// BUY candidates
if show1mZones and not runtime.na(m1BuyTop):
s = f_mapScore(m1BuyTop, m1BuyBot, m1BuyTimeRaw, "1M", false)
    if s < rawMapBuyScore:
        rawMapBuyScore = s
        rawMapBuyTop = m1BuyTop
        rawMapBuyBot = m1BuyBot
        rawMapBuyTime = m1BuyTimeRaw
        rawMapBuyTF = "1M"

if show5mZones and not runtime.na(m5BuyTop):
s = f_mapScore(m5BuyTop, m5BuyBot, m5BuyTimeRaw, "5M", false)
    if s < rawMapBuyScore:
        rawMapBuyScore = s
        rawMapBuyTop = m5BuyTop
        rawMapBuyBot = m5BuyBot
        rawMapBuyTime = m5BuyTimeRaw
        rawMapBuyTF = "5M"

if show15mZones and not runtime.na(m15BuyTop):
s = f_mapScore(m15BuyTop, m15BuyBot, m15BuyTimeRaw, "15M", false)
    if s < rawMapBuyScore:
        rawMapBuyScore = s
        rawMapBuyTop = m15BuyTop
        rawMapBuyBot = m15BuyBot
        rawMapBuyTime = m15BuyTimeRaw
        rawMapBuyTF = "15M"

if show30mZones and not runtime.na(m30BuyTop):
s = f_mapScore(m30BuyTop, m30BuyBot, m30BuyTimeRaw, "30M", false)
    if s < rawMapBuyScore:
        rawMapBuyScore = s
        rawMapBuyTop = m30BuyTop
        rawMapBuyBot = m30BuyBot
        rawMapBuyTime = m30BuyTimeRaw
        rawMapBuyTF = "30M"

if show1hZones and not runtime.na(h1BuyTop):
s = f_mapScore(h1BuyTop, h1BuyBot, h1BuyTimeRaw, "1H", false)
    if s < rawMapBuyScore:
        rawMapBuyScore = s
        rawMapBuyTop = h1BuyTop
        rawMapBuyBot = h1BuyBot
        rawMapBuyTime = h1BuyTimeRaw
        rawMapBuyTF = "1H"

if show4hZones and not runtime.na(h4BuyTop):
s = f_mapScore(h4BuyTop, h4BuyBot, h4BuyTimeRaw, "4H", false)
    if s < rawMapBuyScore:
        rawMapBuyScore = s
        rawMapBuyTop = h4BuyTop
        rawMapBuyBot = h4BuyBot
        rawMapBuyTime = h4BuyTimeRaw
        rawMapBuyTF = "4H"

if showD1Zones and not runtime.na(d1BuyTop):
s = f_mapScore(d1BuyTop, d1BuyBot, d1BuyTimeRaw, "D1", false)
    if s < rawMapBuyScore:
        rawMapBuyScore = s
        rawMapBuyTop = d1BuyTop
        rawMapBuyBot = d1BuyBot
        rawMapBuyTime = d1BuyTimeRaw
        rawMapBuyTF = "D1"

// SELL candidates
if show1mZones and not runtime.na(m1SellTop):
s = f_mapScore(m1SellTop, m1SellBot, m1SellTimeRaw, "1M", true)
    if s < rawMapSellScore:
        rawMapSellScore = s
        rawMapSellTop = m1SellTop
        rawMapSellBot = m1SellBot
        rawMapSellTime = m1SellTimeRaw
        rawMapSellTF = "1M"

if show5mZones and not runtime.na(m5SellTop):
s = f_mapScore(m5SellTop, m5SellBot, m5SellTimeRaw, "5M", true)
    if s < rawMapSellScore:
        rawMapSellScore = s
        rawMapSellTop = m5SellTop
        rawMapSellBot = m5SellBot
        rawMapSellTime = m5SellTimeRaw
        rawMapSellTF = "5M"

if show15mZones and not runtime.na(m15SellTop):
s = f_mapScore(m15SellTop, m15SellBot, m15SellTimeRaw, "15M", true)
    if s < rawMapSellScore:
        rawMapSellScore = s
        rawMapSellTop = m15SellTop
        rawMapSellBot = m15SellBot
        rawMapSellTime = m15SellTimeRaw
        rawMapSellTF = "15M"

if show30mZones and not runtime.na(m30SellTop):
s = f_mapScore(m30SellTop, m30SellBot, m30SellTimeRaw, "30M", true)
    if s < rawMapSellScore:
        rawMapSellScore = s
        rawMapSellTop = m30SellTop
        rawMapSellBot = m30SellBot
        rawMapSellTime = m30SellTimeRaw
        rawMapSellTF = "30M"

if show1hZones and not runtime.na(h1SellTop):
s = f_mapScore(h1SellTop, h1SellBot, h1SellTimeRaw, "1H", true)
    if s < rawMapSellScore:
        rawMapSellScore = s
        rawMapSellTop = h1SellTop
        rawMapSellBot = h1SellBot
        rawMapSellTime = h1SellTimeRaw
        rawMapSellTF = "1H"

if show4hZones and not runtime.na(h4SellTop):
s = f_mapScore(h4SellTop, h4SellBot, h4SellTimeRaw, "4H", true)
    if s < rawMapSellScore:
        rawMapSellScore = s
        rawMapSellTop = h4SellTop
        rawMapSellBot = h4SellBot
        rawMapSellTime = h4SellTimeRaw
        rawMapSellTF = "4H"

if showD1Zones and not runtime.na(d1SellTop):
s = f_mapScore(d1SellTop, d1SellBot, d1SellTimeRaw, "D1", true)
    if s < rawMapSellScore:
        rawMapSellScore = s
        rawMapSellTop = d1SellTop
        rawMapSellBot = d1SellBot
        rawMapSellTime = d1SellTimeRaw
        rawMapSellTF = "D1"

// Stable displayed zone state.
if 'mapBuyTop' not in locals(): mapBuyTop = runtime.na
if 'mapBuyBot' not in locals(): mapBuyBot = runtime.na
if 'mapBuyTime' not in locals(): mapBuyTime = runtime.na
if 'mapBuyTF' not in locals(): mapBuyTF = "--"

if 'mapSellTop' not in locals(): mapSellTop = runtime.na
if 'mapSellBot' not in locals(): mapSellBot = runtime.na
if 'mapSellTime' not in locals(): mapSellTime = runtime.na
if 'mapSellTF' not in locals(): mapSellTF = "--"

mapBuyInvalid = not runtime.na(mapBuyBot) and barstate.isconfirmed and runtime.close < mapBuyBot
mapSellInvalid = not runtime.na(mapSellTop) and barstate.isconfirmed and runtime.close > mapSellTop

if barstate.isconfirmed:
currentBuyScore = f_mapScore(mapBuyTop, mapBuyBot, mapBuyTime, mapBuyTF, false)
currentSellScore = f_mapScore(mapSellTop, mapSellBot, mapSellTime, mapSellTF, true)

rawBuyDifferent = rawMapBuyTime != mapBuyTime or rawMapBuyTF != mapBuyTF or rawMapBuyTop != mapBuyTop or rawMapBuyBot != mapBuyBot
rawSellDifferent = rawMapSellTime != mapSellTime or rawMapSellTF != mapSellTF or rawMapSellTop != mapSellTop or rawMapSellBot != mapSellBot

    // 0.25 ATR hysteresis prevents minor 1M/5M flips every candle.
betterBuy = rawMapBuyScore + mapAtrNow * 0.25 < currentBuyScore
betterSell = rawMapSellScore + mapAtrNow * 0.25 < currentSellScore

replaceBuy = runtime.na(mapBuyTop) or mapBuyInvalid or (rawBuyDifferent and betterBuy)
replaceSell = runtime.na(mapSellTop) or mapSellInvalid or (rawSellDifferent and betterSell)

    if replaceBuy and not runtime.na(rawMapBuyTop):
        mapBuyTop = rawMapBuyTop
        mapBuyBot = rawMapBuyBot
        mapBuyTime = rawMapBuyTime
        mapBuyTF = rawMapBuyTF

    if replaceSell and not runtime.na(rawMapSellTop):
        mapSellTop = rawMapSellTop
        mapSellBot = rawMapSellBot
        mapSellTime = rawMapSellTime
        mapSellTF = rawMapSellTF

priceInMapBuy = not runtime.na(mapBuyTop) and not runtime.na(mapBuyBot) and runtime.close <= mapBuyTop and runtime.close >= mapBuyBot
priceInMapSell = not runtime.na(mapSellTop) and not runtime.na(mapSellBot) and runtime.close <= mapSellTop and runtime.close >= mapSellBot
mapBuyDistanceNow = f_mapEdgeDistance(mapBuyTop, mapBuyBot, false)
mapSellDistanceNow = f_mapEdgeDistance(mapSellTop, mapSellBot, true)

//=============================================================================
// SFA 🐋 WHALE ZONES STIKE — SECOND BUY + SECOND SELL MAP
// Select the best DISTINCT zone after BUY 1 / SELL 1.
// Candidate universe: 1M, 5M, 15M, 30M, 1H, 4H, D1.
//=============================================================================
mapBuy2Top = runtime.na
mapBuy2Bot = runtime.na
mapBuy2Time = runtime.na
mapBuy2TF = "--"
mapBuy2Rank = 1e20

mapSell2Top = runtime.na
mapSell2Bot = runtime.na
mapSell2Time = runtime.na
mapSell2TF = "--"
mapSell2Rank = 1e20

// BUY 2 candidates.
if show1mZones and not runtime.na(m1BuyTop) and not f_rangesOverlap(m1BuyTop, m1BuyBot, mapBuyTop, mapBuyBot):
s = f_mapScore(m1BuyTop, m1BuyBot, m1BuyTimeRaw, "1M", false)
    if s < mapBuy2Rank:
        mapBuy2Rank = s
        mapBuy2Top = m1BuyTop
        mapBuy2Bot = m1BuyBot
        mapBuy2Time = m1BuyTimeRaw
        mapBuy2TF = "1M"

if show5mZones and not runtime.na(m5BuyTop) and not f_rangesOverlap(m5BuyTop, m5BuyBot, mapBuyTop, mapBuyBot):
s = f_mapScore(m5BuyTop, m5BuyBot, m5BuyTimeRaw, "5M", false)
    if s < mapBuy2Rank:
        mapBuy2Rank = s
        mapBuy2Top = m5BuyTop
        mapBuy2Bot = m5BuyBot
        mapBuy2Time = m5BuyTimeRaw
        mapBuy2TF = "5M"

if show15mZones and not runtime.na(m15BuyTop) and not f_rangesOverlap(m15BuyTop, m15BuyBot, mapBuyTop, mapBuyBot):
s = f_mapScore(m15BuyTop, m15BuyBot, m15BuyTimeRaw, "15M", false)
    if s < mapBuy2Rank:
        mapBuy2Rank = s
        mapBuy2Top = m15BuyTop
        mapBuy2Bot = m15BuyBot
        mapBuy2Time = m15BuyTimeRaw
        mapBuy2TF = "15M"

if show30mZones and not runtime.na(m30BuyTop) and not f_rangesOverlap(m30BuyTop, m30BuyBot, mapBuyTop, mapBuyBot):
s = f_mapScore(m30BuyTop, m30BuyBot, m30BuyTimeRaw, "30M", false)
    if s < mapBuy2Rank:
        mapBuy2Rank = s
        mapBuy2Top = m30BuyTop
        mapBuy2Bot = m30BuyBot
        mapBuy2Time = m30BuyTimeRaw
        mapBuy2TF = "30M"

if show1hZones and not runtime.na(h1BuyTop) and not f_rangesOverlap(h1BuyTop, h1BuyBot, mapBuyTop, mapBuyBot):
s = f_mapScore(h1BuyTop, h1BuyBot, h1BuyTimeRaw, "1H", false)
    if s < mapBuy2Rank:
        mapBuy2Rank = s
        mapBuy2Top = h1BuyTop
        mapBuy2Bot = h1BuyBot
        mapBuy2Time = h1BuyTimeRaw
        mapBuy2TF = "1H"

if show4hZones and not runtime.na(h4BuyTop) and not f_rangesOverlap(h4BuyTop, h4BuyBot, mapBuyTop, mapBuyBot):
s = f_mapScore(h4BuyTop, h4BuyBot, h4BuyTimeRaw, "4H", false)
    if s < mapBuy2Rank:
        mapBuy2Rank = s
        mapBuy2Top = h4BuyTop
        mapBuy2Bot = h4BuyBot
        mapBuy2Time = h4BuyTimeRaw
        mapBuy2TF = "4H"

if showD1Zones and not runtime.na(d1BuyTop) and not f_rangesOverlap(d1BuyTop, d1BuyBot, mapBuyTop, mapBuyBot):
s = f_mapScore(d1BuyTop, d1BuyBot, d1BuyTimeRaw, "D1", false)
    if s < mapBuy2Rank:
        mapBuy2Rank = s
        mapBuy2Top = d1BuyTop
        mapBuy2Bot = d1BuyBot
        mapBuy2Time = d1BuyTimeRaw
        mapBuy2TF = "D1"

// SELL 2 candidates.
if show1mZones and not runtime.na(m1SellTop) and not f_rangesOverlap(m1SellTop, m1SellBot, mapSellTop, mapSellBot):
s = f_mapScore(m1SellTop, m1SellBot, m1SellTimeRaw, "1M", true)
    if s < mapSell2Rank:
        mapSell2Rank = s
        mapSell2Top = m1SellTop
        mapSell2Bot = m1SellBot
        mapSell2Time = m1SellTimeRaw
        mapSell2TF = "1M"

if show5mZones and not runtime.na(m5SellTop) and not f_rangesOverlap(m5SellTop, m5SellBot, mapSellTop, mapSellBot):
s = f_mapScore(m5SellTop, m5SellBot, m5SellTimeRaw, "5M", true)
    if s < mapSell2Rank:
        mapSell2Rank = s
        mapSell2Top = m5SellTop
        mapSell2Bot = m5SellBot
        mapSell2Time = m5SellTimeRaw
        mapSell2TF = "5M"

if show15mZones and not runtime.na(m15SellTop) and not f_rangesOverlap(m15SellTop, m15SellBot, mapSellTop, mapSellBot):
s = f_mapScore(m15SellTop, m15SellBot, m15SellTimeRaw, "15M", true)
    if s < mapSell2Rank:
        mapSell2Rank = s
        mapSell2Top = m15SellTop
        mapSell2Bot = m15SellBot
        mapSell2Time = m15SellTimeRaw
        mapSell2TF = "15M"

if show30mZones and not runtime.na(m30SellTop) and not f_rangesOverlap(m30SellTop, m30SellBot, mapSellTop, mapSellBot):
s = f_mapScore(m30SellTop, m30SellBot, m30SellTimeRaw, "30M", true)
    if s < mapSell2Rank:
        mapSell2Rank = s
        mapSell2Top = m30SellTop
        mapSell2Bot = m30SellBot
        mapSell2Time = m30SellTimeRaw
        mapSell2TF = "30M"

if show1hZones and not runtime.na(h1SellTop) and not f_rangesOverlap(h1SellTop, h1SellBot, mapSellTop, mapSellBot):
s = f_mapScore(h1SellTop, h1SellBot, h1SellTimeRaw, "1H", true)
    if s < mapSell2Rank:
        mapSell2Rank = s
        mapSell2Top = h1SellTop
        mapSell2Bot = h1SellBot
        mapSell2Time = h1SellTimeRaw
        mapSell2TF = "1H"

if show4hZones and not runtime.na(h4SellTop) and not f_rangesOverlap(h4SellTop, h4SellBot, mapSellTop, mapSellBot):
s = f_mapScore(h4SellTop, h4SellBot, h4SellTimeRaw, "4H", true)
    if s < mapSell2Rank:
        mapSell2Rank = s
        mapSell2Top = h4SellTop
        mapSell2Bot = h4SellBot
        mapSell2Time = h4SellTimeRaw
        mapSell2TF = "4H"

if showD1Zones and not runtime.na(d1SellTop) and not f_rangesOverlap(d1SellTop, d1SellBot, mapSellTop, mapSellBot):
s = f_mapScore(d1SellTop, d1SellBot, d1SellTimeRaw, "D1", true)
    if s < mapSell2Rank:
        mapSell2Rank = s
        mapSell2Top = d1SellTop
        mapSell2Bot = d1SellBot
        mapSell2Time = d1SellTimeRaw
        mapSell2TF = "D1"

// Structural zone-strength score.
// This is a comparative ZONE QUALITY score, NOT a win-rate probability.
f_masterTfBase(string tf) =>
    tf == "D1" ? 78.0 :
     tf == "4H" ? 74.0 :
     tf == "1H" ? 68.0 :
     tf == "30M" ? 63.0 :
     tf == "15M" ? 59.0 :
     tf == "5M" ? 54.0 :
     tf == "1M" ? 50.0 : 45.0

f_masterTfHours(string tf) =>
    tf == "D1" ? 24.0 :
     tf == "4H" ? 4.0 :
     tf == "1H" ? 1.0 :
     tf == "30M" ? 0.5 :
     tf == "15M" ? 0.25 :
     tf == "5M" ? 5.0 / 60.0 :
     tf == "1M" ? 1.0 / 60.0 : 1.0

f_masterZoneStrength(float top, float bot, int leftTime, string tf, bool isSell) =>
score = 0.0
    if not runtime.na(top) and not runtime.na(bot) and not runtime.na(leftTime):
width = runtime.math_max(top - bot, runtime.syminfo.mintick)
widthAtr = width / mapAtrNow
ageHours = runtime.math_max(0.0, (timenow - leftTime) / 3600000.0)
ageBars = ageHours / runtime.math_max(f_masterTfHours(tf), 1.0 / 60.0)

widthPts =
             widthAtr <= 3.0 ? 12.0 :
             widthAtr <= 6.0 ? 8.0 :
             widthAtr <= 10.0 ? 4.0 :
             widthAtr <= 14.0 ? 0.0 : -12.0

freshnessPts =
             ageBars <= 20.0 ? 10.0 :
             ageBars <= 50.0 ? 6.0 :
             ageBars <= 100.0 ? 2.0 :
             ageBars <= 200.0 ? -4.0 : -10.0

correctlyLocated = isSell ? bot >= runtime.close - mapAtrNow * 0.25 : top <= runtime.close + mapAtrNow * 0.25
locationPts = correctlyLocated ? 6.0 : 0.0

        score = f_masterTfBase(tf) + widthPts + freshnessPts + locationPts

    int(runtime.math_round(runtime.math_min(99.0, runtime.math_max(20.0, score))))

f_masterStars(int pct) =>
    pct >= 90 ? "★★★★★" :
     pct >= 75 ? "★★★★☆" :
     pct >= 60 ? "★★★☆☆" :
     pct >= 40 ? "★★☆☆☆" :
     pct > 0 ? "★☆☆☆☆" : "☆☆☆☆☆"

mapBuyStrengthBase = f_masterZoneStrength(mapBuyTop, mapBuyBot, mapBuyTime, mapBuyTF, false)
mapSellStrengthBase = f_masterZoneStrength(mapSellTop, mapSellBot, mapSellTime, mapSellTF, true)

// Zone-box strength must be self-contained here.
// Do NOT reference focusDir/focusLevel before the rejection engine declares them.
// A small +3 live-location bonus is allowed only when price is currently inside
// the primary zone. Confirmation strength is added later in the dashboard.
mapBuyStrength = runtime.math_min(99, mapBuyStrengthBase + (priceInMapBuy ? 3 : 0))
mapSellStrength = runtime.math_min(99, mapSellStrengthBase + (priceInMapSell ? 3 : 0))
mapBuy2Strength = f_masterZoneStrength(mapBuy2Top, mapBuy2Bot, mapBuy2Time, mapBuy2TF, false)
mapSell2Strength = f_masterZoneStrength(mapSell2Top, mapSell2Bot, mapSell2Time, mapSell2TF, true)

mapBuyStars = f_masterStars(mapBuyStrength)
mapSellStars = f_masterStars(mapSellStrength)
mapBuy2Stars = f_masterStars(mapBuy2Strength)
mapSell2Stars = f_masterStars(mapSell2Strength)

//=============================================================================
// SFA 🐋 WHALE ZONES STIKE — AUTO CONFLUENCE VISUAL ENGINE
//
// DISPLAY RULES
// 1) BUY 1 + BUY 2 overlap / sit runtime.close -> ONE BUY CONFLUENCE band.
// 2) SELL 1 + SELL 2 overlap / sit runtime.close -> ONE SELL CONFLUENCE band.
// 3) The underlying BUY1/BUY2/SELL1/SELL2 logical prices remain separate.
// 4) If an opposite BUY/SELL text area is extremely runtime.close, only the stronger
//    side prints chart text. The dashboard still shows BOTH exact zones.
//
// This is presentation only. Entry/rejection/confirmation logic is unchanged.
//=============================================================================
f_visualZoneTop(float logicalTop, float logicalBot, float minAtrHeight) =>
out = logicalTop
    if not runtime.na(logicalTop) and not runtime.na(logicalBot):
logicalHeight = runtime.math_max(logicalTop - logicalBot, runtime.syminfo.mintick)
displayHeight = runtime.math_max(logicalHeight, mapAtrNow * minAtrHeight)
mid = (logicalTop + logicalBot) * 0.5
        out = mid + displayHeight * 0.5
    out

f_visualZoneBot(float logicalTop, float logicalBot, float minAtrHeight) =>
out = logicalBot
    if not runtime.na(logicalTop) and not runtime.na(logicalBot):
logicalHeight = runtime.math_max(logicalTop - logicalBot, runtime.syminfo.mintick)
displayHeight = runtime.math_max(logicalHeight, mapAtrNow * minAtrHeight)
mid = (logicalTop + logicalBot) * 0.5
        out = mid - displayHeight * 0.5
    out

f_masterZoneGap(float top1, float bot1, float top2, float bot2) =>
gap = 1e20
    if not runtime.na(top1) and not runtime.na(bot1) and not runtime.na(top2) and not runtime.na(bot2):
        if f_rangesOverlap(top1, bot1, top2, bot2):
            gap = 0.0
        elif bot1 > top2:
            gap = bot1 - top2
        elif bot2 > top1:
            gap = bot2 - top1
        else:
            gap = 0.0
    gap

f_masterConfluenceStrength(int s1, int s2) =>
    runtime.math_min(99, int(runtime.math_round((s1 + s2) * 0.5)) + 6)

buyConfluence =
     not runtime.na(mapBuyTop) and not runtime.na(mapBuy2Top) and
     f_masterZoneGap(mapBuyTop, mapBuyBot, mapBuy2Top, mapBuy2Bot) <= mapAtrNow * zoneConfluenceGapAtr

sellConfluence =
     not runtime.na(mapSellTop) and not runtime.na(mapSell2Top) and
     f_masterZoneGap(mapSellTop, mapSellBot, mapSell2Top, mapSell2Bot) <= mapAtrNow * zoneConfluenceGapAtr

buyDisplayLogicalTop =
     buyConfluence ? runtime.math_max(mapBuyTop, mapBuy2Top) : mapBuyTop
buyDisplayLogicalBot =
     buyConfluence ? runtime.math_min(mapBuyBot, mapBuy2Bot) : mapBuyBot

sellDisplayLogicalTop =
     sellConfluence ? runtime.math_max(mapSellTop, mapSell2Top) : mapSellTop
sellDisplayLogicalBot =
     sellConfluence ? runtime.math_min(mapSellBot, mapSell2Bot) : mapSellBot

buyDisplayTime =
     buyConfluence ? runtime.math_min(mapBuyTime, mapBuy2Time) : mapBuyTime
sellDisplayTime =
     sellConfluence ? runtime.math_min(mapSellTime, mapSell2Time) : mapSellTime

buyDisplayTF =
     buyConfluence ?
         (mapBuyTF == mapBuy2TF ? mapBuyTF : mapBuyTF + "+" + mapBuy2TF) :
         mapBuyTF

sellDisplayTF =
     sellConfluence ?
         (mapSellTF == mapSell2TF ? mapSellTF : mapSellTF + "+" + mapSell2TF) :
         mapSellTF

buyDisplayStrength =
     buyConfluence ? f_masterConfluenceStrength(mapBuyStrength, mapBuy2Strength) : mapBuyStrength
sellDisplayStrength =
     sellConfluence ? f_masterConfluenceStrength(mapSellStrength, mapSell2Strength) : mapSellStrength

buyDisplayStars = f_masterStars(buyDisplayStrength)
sellDisplayStars = f_masterStars(sellDisplayStrength)

buyDisplayText =
     buyConfluence ?
         "BUY CONFLUENCE • " + buyDisplayTF + " • " +
         runtime.str_tostring(buyDisplayStrength) + "% • " + buyDisplayStars :
         "BUY 1 • " + mapBuyTF + " • " +
         runtime.str_tostring(mapBuyStrength) + "% • " + mapBuyStars

sellDisplayText =
     sellConfluence ?
         "SELL CONFLUENCE • " + sellDisplayTF + " • " +
         runtime.str_tostring(sellDisplayStrength) + "% • " + sellDisplayStars :
         "SELL 1 • " + mapSellTF + " • " +
         runtime.str_tostring(mapSellStrength) + "% • " + mapSellStars

buy2BoxText =
     "BUY 2 • " + mapBuy2TF + " • " + runtime.str_tostring(mapBuy2Strength) + "% • " + mapBuy2Stars

sell2BoxText =
     "SELL 2 • " + mapSell2TF + " • " + runtime.str_tostring(mapSell2Strength) + "% • " + mapSell2Stars

// Opposite-side text collision protection.
// If BUY and SELL display areas are nearly touching, only the stronger side
// prints text on the chart. Both bands still remain visible and the dashboard
// still lists both exact sides.
oppositeTextCrowded =
     not runtime.na(buyDisplayLogicalTop) and not runtime.na(sellDisplayLogicalTop) and
     f_masterZoneGap(
         buyDisplayLogicalTop, buyDisplayLogicalBot,
         sellDisplayLogicalTop, sellDisplayLogicalBot) <= mapAtrNow * zoneCrossTextGapAtr

showBuyChartText =
     not oppositeTextCrowded or buyDisplayStrength >= sellDisplayStrength
showSellChartText =
     not oppositeTextCrowded or sellDisplayStrength > buyDisplayStrength

// Maximum four logical zones, but only 2–4 visual bands depending on confluence.
if 'marketBuyBox' not in locals(): marketBuyBox = runtime.na
if 'marketSellBox' not in locals(): marketSellBox = runtime.na
if 'marketBuyBox2' not in locals(): marketBuyBox2 = runtime.na
if 'marketSellBox2' not in locals(): marketSellBox2 = runtime.na

if 'marketBuyVisualTop' not in locals(): marketBuyVisualTop = runtime.na
if 'marketBuyVisualBot' not in locals(): marketBuyVisualBot = runtime.na
if 'marketSellVisualTop' not in locals(): marketSellVisualTop = runtime.na
if 'marketSellVisualBot' not in locals(): marketSellVisualBot = runtime.na
if 'marketBuy2VisualTop' not in locals(): marketBuy2VisualTop = runtime.na
if 'marketBuy2VisualBot' not in locals(): marketBuy2VisualBot = runtime.na
if 'marketSell2VisualTop' not in locals(): marketSell2VisualTop = runtime.na
if 'marketSell2VisualBot' not in locals(): marketSell2VisualBot = runtime.na

// Rebuild a side whenever either of its logical zones or confluence state changes.
buyVisualChanged = barstate.isconfirmed and (
     mapBuyTime != mapBuyTime[1] or mapBuyTop != mapBuyTop[1] or
     mapBuyBot != mapBuyBot[1] or mapBuyTF != mapBuyTF[1] or
     mapBuy2Time != mapBuy2Time[1] or mapBuy2Top != mapBuy2Top[1] or
     mapBuy2Bot != mapBuy2Bot[1] or mapBuy2TF != mapBuy2TF[1] or
     buyConfluence != buyConfluence[1])

sellVisualChanged = barstate.isconfirmed and (
     mapSellTime != mapSellTime[1] or mapSellTop != mapSellTop[1] or
     mapSellBot != mapSellBot[1] or mapSellTF != mapSellTF[1] or
     mapSell2Time != mapSell2Time[1] or mapSell2Top != mapSell2Top[1] or
     mapSell2Bot != mapSell2Bot[1] or mapSell2TF != mapSell2TF[1] or
     sellConfluence != sellConfluence[1])

if buyVisualChanged:
    if not runtime.na(marketBuyBox):
        runtime.box_delete(marketBuyBox)
        marketBuyBox = runtime.na
    if not runtime.na(marketBuyBox2):
        runtime.box_delete(marketBuyBox2)
        marketBuyBox2 = runtime.na

    marketBuyVisualTop = f_visualZoneTop(
         buyDisplayLogicalTop, buyDisplayLogicalBot, zoneVisualPrimaryMinAtr)
    marketBuyVisualBot = f_visualZoneBot(
         buyDisplayLogicalTop, buyDisplayLogicalBot, zoneVisualPrimaryMinAtr)

    if showMarketZoneMap and not runtime.na(buyDisplayTime) and:
       not runtime.na(buyDisplayLogicalTop) and not runtime.na(buyDisplayLogicalBot)
        marketBuyBox = runtime.box_new(
             buyDisplayTime, marketBuyVisualTop, runtime.time, marketBuyVisualBot,
             xloc="bar_time", extend="right",
             bgcolor=runtime.color_new(bullColor, buyConfluence ? 76 : 80),
             border_color=runtime.color_new(bullColor, 100), border_width=1,
             text=showBuyChartText ? buyDisplayText : "",
             text_color=chart.fg_color, text_size="small",
             text_halign=text.align_center, text_valign=text.align_center)

    // BUY 2 is shown separately only when it is NOT visually confluent with BUY 1.
    marketBuy2VisualTop = f_visualZoneTop(
         mapBuy2Top, mapBuy2Bot, zoneVisualSecondaryMinAtr)
    marketBuy2VisualBot = f_visualZoneBot(
         mapBuy2Top, mapBuy2Bot, zoneVisualSecondaryMinAtr)

    if showMarketZoneMap and not buyConfluence and:
       not runtime.na(mapBuy2Time) and not runtime.na(mapBuy2Top) and not runtime.na(mapBuy2Bot)
        marketBuyBox2 = runtime.box_new(
             mapBuy2Time, marketBuy2VisualTop, runtime.time, marketBuy2VisualBot,
             xloc="bar_time", extend="right",
             bgcolor=runtime.color_new(bullColor, 90),
             border_color=runtime.color_new(bullColor, 100), border_width=1,
             text=buy2BoxText,
             text_color=chart.fg_color, text_size="small",
             text_halign=text.align_center, text_valign=text.align_center)

if sellVisualChanged:
    if not runtime.na(marketSellBox):
        runtime.box_delete(marketSellBox)
        marketSellBox = runtime.na
    if not runtime.na(marketSellBox2):
        runtime.box_delete(marketSellBox2)
        marketSellBox2 = runtime.na

    marketSellVisualTop = f_visualZoneTop(
         sellDisplayLogicalTop, sellDisplayLogicalBot, zoneVisualPrimaryMinAtr)
    marketSellVisualBot = f_visualZoneBot(
         sellDisplayLogicalTop, sellDisplayLogicalBot, zoneVisualPrimaryMinAtr)

    if showMarketZoneMap and not runtime.na(sellDisplayTime) and:
       not runtime.na(sellDisplayLogicalTop) and not runtime.na(sellDisplayLogicalBot)
        marketSellBox = runtime.box_new(
             sellDisplayTime, marketSellVisualTop, runtime.time, marketSellVisualBot,
             xloc="bar_time", extend="right",
             bgcolor=runtime.color_new(bearColor, sellConfluence ? 78 : 82),
             border_color=runtime.color_new(bearColor, 100), border_width=1,
             text=showSellChartText ? sellDisplayText : "",
             text_color=chart.fg_color, text_size="small",
             text_halign=text.align_center, text_valign=text.align_center)

    // SELL 2 is shown separately only when it is NOT visually confluent with SELL 1.
    marketSell2VisualTop = f_visualZoneTop(
         mapSell2Top, mapSell2Bot, zoneVisualSecondaryMinAtr)
    marketSell2VisualBot = f_visualZoneBot(
         mapSell2Top, mapSell2Bot, zoneVisualSecondaryMinAtr)

    if showMarketZoneMap and not sellConfluence and:
       not runtime.na(mapSell2Time) and not runtime.na(mapSell2Top) and not runtime.na(mapSell2Bot)
        marketSellBox2 = runtime.box_new(
             mapSell2Time, marketSell2VisualTop, runtime.time, marketSell2VisualBot,
             xloc="bar_time", extend="right",
             bgcolor=runtime.color_new(bearColor, 91),
             border_color=runtime.color_new(bearColor, 100), border_width=1,
             text=sell2BoxText,
             text_color=chart.fg_color, text_size="small",
             text_halign=text.align_center, text_valign=text.align_center)

if not showMarketZoneMap:
    if not runtime.na(marketBuyBox):
        runtime.box_delete(marketBuyBox)
        marketBuyBox = runtime.na
    if not runtime.na(marketSellBox):
        runtime.box_delete(marketSellBox)
        marketSellBox = runtime.na
    if not runtime.na(marketBuyBox2):
        runtime.box_delete(marketBuyBox2)
        marketBuyBox2 = runtime.na
    if not runtime.na(marketSellBox2):
        runtime.box_delete(marketSellBox2)
        marketSellBox2 = runtime.na

    marketBuyVisualTop = runtime.na
    marketBuyVisualBot = runtime.na
    marketSellVisualTop = runtime.na
    marketSellVisualBot = runtime.na
    marketBuy2VisualTop = runtime.na
    marketBuy2VisualBot = runtime.na
    marketSell2VisualTop = runtime.na
    marketSell2VisualBot = runtime.na

// Live style/text updates without recreating geometry.
if not runtime.na(marketBuyBox):
    runtime.box_set_text(marketBuyBox, showBuyChartText ? buyDisplayText : "")
    runtime.box_set_text_color(marketBuyBox, chart.fg_color)
    runtime.box_set_bgcolor(
         marketBuyBox,
         runtime.color_new(bullColor, buyConfluence ? (priceInMapBuy ? 70 : 76) : (priceInMapBuy ? 74 : 80)))

if not runtime.na(marketSellBox):
    runtime.box_set_text(marketSellBox, showSellChartText ? sellDisplayText : "")
    runtime.box_set_text_color(marketSellBox, chart.fg_color)
    runtime.box_set_bgcolor(
         marketSellBox,
         runtime.color_new(bearColor, sellConfluence ? (priceInMapSell ? 72 : 78) : (priceInMapSell ? 76 : 82)))

if not runtime.na(marketBuyBox2):
    runtime.box_set_text(marketBuyBox2, buy2BoxText)
    runtime.box_set_text_color(marketBuyBox2, chart.fg_color)
    runtime.box_set_bgcolor(marketBuyBox2, runtime.color_new(bullColor, 90))

if not runtime.na(marketSellBox2):
    runtime.box_set_text(marketSellBox2, sell2BoxText)
    runtime.box_set_text_color(marketSellBox2, chart.fg_color)
    runtime.box_set_bgcolor(marketSellBox2, runtime.color_new(bearColor, 91))

//=============================================================================
// EARLY ZONE-EDGE CONFIRMATION ⚡
// This is the execution timing requested:
// SELL = GREEN test candle at SELL zone -> IMMEDIATE NEXT CLOSED RED candle.
// BUY  = RED test candle at BUY zone  -> IMMEDIATE NEXT CLOSED GREEN candle.
// The signal is therefore printed at the zone reaction, NEVER in the middle
// of a move several candles later.
//=============================================================================
edgeAtr = runtime.math_max(runtime.ta_atr(14), runtime.syminfo.mintick * 20)
edgeTolerance = edgeAtr * 0.12

priorTouchedSellZone =
     not runtime.na(mapSellTop) and not runtime.na(mapSellBot) and
     runtime.high[1] >= mapSellBot - edgeTolerance and runtime.low[1] <= mapSellTop + edgeTolerance

priorTouchedBuyZone =
     not runtime.na(mapBuyTop) and not runtime.na(mapBuyBot) and
     runtime.low[1] <= mapBuyTop + edgeTolerance and runtime.high[1] >= mapBuyBot - edgeTolerance

// Test candle colour at the zone.
sellTestGreen =
     priorTouchedSellZone and runtime.close[1] > runtime.open[1] and
     runtime.close[1] <= mapSellTop + edgeTolerance

buyTestRed =
     priorTouchedBuyZone and runtime.close[1] < runtime.open[1] and
     runtime.close[1] >= mapBuyBot - edgeTolerance

// Immediate next candle must reverse colour and direction.
// No extra candles are allowed between the test and confirmation.
sellConfirmRed =
     edgeConfirmEnabled and barstate.isconfirmed and
     sellTestGreen and runtime.close < runtime.open and runtime.close < runtime.close[1]

buyConfirmGreen =
     edgeConfirmEnabled and barstate.isconfirmed and
     buyTestRed and runtime.close > runtime.open and runtime.close > runtime.close[1]

if 'lastEdgeSellZoneTime' not in locals(): lastEdgeSellZoneTime = runtime.na
if 'lastEdgeBuyZoneTime' not in locals(): lastEdgeBuyZoneTime = runtime.na

edgeSellSignal =
     sellConfirmRed and
     (not edgeOneSignalPerZone or runtime.na(lastEdgeSellZoneTime) or mapSellTime != lastEdgeSellZoneTime)

edgeBuySignal =
     buyConfirmGreen and
     (not edgeOneSignalPerZone or runtime.na(lastEdgeBuyZoneTime) or mapBuyTime != lastEdgeBuyZoneTime)

// Active edge-signal state for dashboard + persistent notifications.
if 'edgeSignalDir' not in locals(): edgeSignalDir = 0
if 'edgeSignalEntry' not in locals(): edgeSignalEntry = runtime.na
if 'edgeSignalInvalid' not in locals(): edgeSignalInvalid = runtime.na
if 'edgeSignalTf' not in locals(): edgeSignalTf = "--"
if 'edgeSignalBar' not in locals(): edgeSignalBar = runtime.na

if edgeSellSignal:
    lastEdgeSellZoneTime = mapSellTime
    edgeSignalDir = -1
    edgeSignalEntry = runtime.close
    edgeSignalInvalid = mapSellTop
    edgeSignalTf = mapSellTF
    edgeSignalBar = runtime.bar_index


if edgeBuySignal:
    lastEdgeBuyZoneTime = mapBuyTime
    edgeSignalDir = 1
    edgeSignalEntry = runtime.close
    edgeSignalInvalid = mapBuyBot
    edgeSignalTf = mapBuyTF
    edgeSignalBar = runtime.bar_index


// Closed-candle invalidation. Opposite edge signal automatically replaces prior state.
edgeSignalInvalidated =
     edgeSignalDir == 1 and barstate.isconfirmed and not runtime.na(edgeSignalInvalid) and runtime.close < edgeSignalInvalid or
     edgeSignalDir == -1 and barstate.isconfirmed and not runtime.na(edgeSignalInvalid) and runtime.close > edgeSignalInvalid

if edgeSignalInvalidated:
    edgeSignalDir = 0
    edgeSignalEntry = runtime.na
    edgeSignalInvalid = runtime.na
    edgeSignalTf = "--"
    edgeSignalBar = runtime.na

edgeSignalText =
     edgeSignalDir == 1 ? "⚡ BUY CONFIRMED • ZONE EDGE" :
     edgeSignalDir == -1 ? "⚡ SELL CONFIRMED • ZONE EDGE" :
     sellTestGreen ? "SELL ZONE • GREEN TEST ✓ • WAIT RED" :
     buyTestRed ? "BUY ZONE • RED TEST ✓ • WAIT GREEN" :
     "⚡ ZONE EDGE • WAIT"

// Premium sideways / trade-quality calculations.
currentAtr = runtime.ta_atr(14)
ema200Slope = ema200 - ema200[emaSlopeLookback]
emaSlopeAtr = not runtime.na(currentAtr) and currentAtr > 0 ? runtime.math_abs(ema200Slope) / currentAtr : 0.0
emaSlopeReady = emaSlopeAtr >= minEmaSlopeAtr

// Gap between the nearest BUY-zone top and nearest SELL-zone bottom.
// Positive = clean room between zones; zero/negative = overlapping/compressed.
rawZoneGap = not runtime.na(nearestBuyTopFull) and not runtime.na(nearestSellBotFull) ?
     nearestSellBotFull - nearestBuyTopFull : runtime.na
zoneGapAtr = not runtime.na(rawZoneGap) and not runtime.na(currentAtr) and currentAtr > 0 ?
     rawZoneGap / currentAtr : runtime.na
zoneGapReady = runtime.na(zoneGapAtr) or zoneGapAtr >= minZoneGapAtr

mtfBuyAgreement = trend5 == 1 and trend15 == 1
mtfSellAgreement = trend5 == -1 and trend15 == -1
mtfAgreementReady = not requireMtfAgreement or mtfBuyAgreement or mtfSellAgreement

// Market state.
adxReady = not requireAdx or adx5 >= adxReadyLevel
adxCaution = requireAdx and adx5 >= adxCautionLevel and adx5 < adxReadyLevel
trendBuyAligned = trend5 == 1 and trend15 == 1
trendSellAligned = trend5 == -1 and trend15 == -1

bullishChochConfirmed = lastChochDir == 1
bearishChochConfirmed = lastChochDir == -1

// Preliminary stop-risk and available room calculations.
previewBuySL = not runtime.na(nearestBuyBotFull) ? nearestBuyBotFull - currentAtr * zoneBufferAtr : runtime.na
previewSellSL = not runtime.na(nearestSellTopFull) ? nearestSellTopFull + currentAtr * zoneBufferAtr : runtime.na
previewBuyRisk = not runtime.na(previewBuySL) ? runtime.math_max(runtime.close - previewBuySL, runtime.syminfo.mintick * 10) : runtime.na
previewSellRisk = not runtime.na(previewSellSL) ? runtime.math_max(previewSellSL - runtime.close, runtime.syminfo.mintick * 10) : runtime.na

buyRoom = not runtime.na(nearestSellBotFull) ? nearestSellBotFull - runtime.close : runtime.na
sellRoom = not runtime.na(nearestBuyTopFull) ? runtime.close - nearestBuyTopFull : runtime.na
buyRoomRR = not runtime.na(buyRoom) and not runtime.na(previewBuyRisk) and previewBuyRisk > 0 ? buyRoom / previewBuyRisk : runtime.na
sellRoomRR = not runtime.na(sellRoom) and not runtime.na(previewSellRisk) and previewSellRisk > 0 ? sellRoom / previewSellRisk : runtime.na

buyRoomReady = runtime.na(buyRoomRR) or buyRoomRR >= minRoomRR
sellRoomReady = runtime.na(sellRoomRR) or sellRoomRR >= minRoomRR

commonQualityReady = not useSidewaysFilter or
     (adxReady and zoneGapReady and emaSlopeReady and mtfAgreementReady)

buyQualityReady = commonQualityReady and buyRoomReady and
     (not requireMtfAgreement or mtfBuyAgreement)
sellQualityReady = commonQualityReady and sellRoomReady and
     (not requireMtfAgreement or mtfSellAgreement)

buySetupNow = barstate.isconfirmed and inBuyZone and trendBuyAligned and
     bullishChochConfirmed and buyQualityReady
sellSetupNow = barstate.isconfirmed and inSellZone and trendSellAligned and
     bearishChochConfirmed and sellQualityReady

//=============================================================================
// OPTIONAL UP / DOWN ZONE TP GUIDANCE
// Completely independent from Flight BUY/SELL control.
// UP/DOWN zone setup can run as a short zone trade while the Flight trade
// continues in its own direction.
//=============================================================================
zoneTpAtrValue = runtime.ta_atr(zoneTpAtrLen)

// ZONE TRADE SIGNAL — confirmation candle inside ANY existing zone.
// A BUY/SELL zone is LOCATION only. It does not itself tell members to trade.
// Direction comes only from the already-existing confirmed reversal candle.
inAnyTradeZone = inBuyZone or inSellZone

buyZoneWidthNow = not runtime.na(nearestBuyTopFull) and not runtime.na(nearestBuyBotFull) ?
     runtime.math_abs(nearestBuyTopFull - nearestBuyBotFull) : runtime.na
sellZoneWidthNow = not runtime.na(nearestSellTopFull) and not runtime.na(nearestSellBotFull) ?
     runtime.math_abs(nearestSellTopFull - nearestSellBotFull) : runtime.na

useBuyZoneContext = inBuyZone and not inSellZone ? true :
     inSellZone and not inBuyZone ? false :
     inBuyZone and inSellZone ? (runtime.na(sellZoneWidthNow) or
     (not runtime.na(buyZoneWidthNow) and buyZoneWidthNow <= sellZoneWidthNow)) : false

activeTradeZoneTf = useBuyZoneContext ? nearestBuyTF :
     inSellZone ? nearestSellTF : "--"
activeTradeZoneTime = useBuyZoneContext ? nearestBuyTimeFull :
     inSellZone ? nearestSellTimeFull : runtime.na

// REAL A-B-C MODEL 1 — VISIBLE ZONE B + ⚡ SIGNAL
// Flight BUY/SELL below is untouched.

// New ⚡ event = a Model source timeframe has just moved into Stage 5,
// which is the NEXT candle after a valid closed Zone-B retest.
e1Bull = m1BullStage == 5 and m1BullStage[1] != 5
e5Bull = m5BullStage == 5 and m5BullStage[1] != 5
e15Bull = m15BullStage == 5 and m15BullStage[1] != 5
e30Bull = m30BullStage == 5 and m30BullStage[1] != 5
e1hBull = h1BullStage == 5 and h1BullStage[1] != 5
e4hBull = h4BullStage == 5 and h4BullStage[1] != 5
eD1Bull = d1BullStage == 5 and d1BullStage[1] != 5

e1Bear = m1BearStage == 5 and m1BearStage[1] != 5
e5Bear = m5BearStage == 5 and m5BearStage[1] != 5
e15Bear = m15BearStage == 5 and m15BearStage[1] != 5
e30Bear = m30BearStage == 5 and m30BearStage[1] != 5
e1hBear = h1BearStage == 5 and h1BearStage[1] != 5
e4hBear = h4BearStage == 5 and h4BearStage[1] != 5
eD1Bear = d1BearStage == 5 and d1BearStage[1] != 5

newUpZoneSignal = false
newDownZoneSignal = false

// Resolve exact levels for the CURRENT CHART TF only.
eventBullTop = newUpZoneSignal ? chartBullTop : runtime.na
eventBullBot = newUpZoneSignal ? chartBullBot : runtime.na
eventBullA = newUpZoneSignal ? chartBullA : runtime.na
eventBullC = newUpZoneSignal ? chartBullC : runtime.na
eventBullTF = newUpZoneSignal ? chartModelTF : "--"
eventBullBTime = newUpZoneSignal ? chartBullBTime : runtime.na

eventBearTop = newDownZoneSignal ? chartBearTop : runtime.na
eventBearBot = newDownZoneSignal ? chartBearBot : runtime.na
eventBearA = newDownZoneSignal ? chartBearA : runtime.na
eventBearC = newDownZoneSignal ? chartBearC : runtime.na
eventBearTF = newDownZoneSignal ? chartModelTF : "--"
eventBearBTime = newDownZoneSignal ? chartBearBTime : runtime.na

// Small internal Model-1 trade state used only for P/L, BE and persistent ⚡ alerts.
if 'zoneTradeDir' not in locals(): zoneTradeDir = 0
if 'zoneTradeEntry' not in locals(): zoneTradeEntry = runtime.na         // actual confirmation-candle runtime.close
if 'zoneTradePointB' not in locals(): zoneTradePointB = runtime.na        // structural Point B / invalidation reference
if 'zoneTradeInvalid' not in locals(): zoneTradeInvalid = runtime.na
if 'zoneTradeTargetC' not in locals(): zoneTradeTargetC = runtime.na       // Point C = TP1 only, NOT final target
if 'zoneTradeTf' not in locals(): zoneTradeTf = "--"
if 'zoneTradeBeLocked' not in locals(): zoneTradeBeLocked = false
if 'zoneTradeC1Hit' not in locals(): zoneTradeC1Hit = false
if 'zoneTradeLastExit' not in locals(): zoneTradeLastExit = "--"
if 'zoneTradeLastExitBar' not in locals(): zoneTradeLastExitBar = runtime.na
if 'zoneTradeCycle' not in locals(): zoneTradeCycle = 0
if 'zoneSignalLabel' not in locals(): zoneSignalLabel = runtime.na
if 'zoneNoTradeLabel' not in locals(): zoneNoTradeLabel = runtime.na

if newUpZoneSignal and not runtime.na(eventBullBot):
    // Opposite/new Model confirmation REPLACES any older simulated trade.
    zoneTradeDir = 1
    zoneTradeEntry = runtime.close              // actual BUY confirmation runtime.close
    zoneTradePointB = eventBullBot      // structural B reference
    zoneTradeInvalid = eventBullBot     // closed below B invalidates
    zoneTradeTargetC = not runtime.na(eventBullC) and eventBullC > runtime.close ? eventBullC : runtime.na
    zoneTradeTf = eventBullTF
    zoneTradeBeLocked = false
    zoneTradeC1Hit = false
    zoneTradeLastExit = "--"
    zoneTradeLastExitBar = runtime.na
    zoneTradeCycle += 1

    // Make the signalled TF the visible bullish Model-1 zone.
    modelBuyTop = eventBullTop
    modelBuyBot = eventBullBot
    modelBuyA = eventBullA
    modelBuyC = eventBullC
    modelBuyStage = 5
    modelBuyBTime = eventBullBTime
    modelBuyTF = eventBullTF


if newDownZoneSignal and not runtime.na(eventBearTop):
    // Opposite/new Model confirmation REPLACES any older simulated trade.
    zoneTradeDir = -1
    zoneTradeEntry = runtime.close              // actual SELL confirmation runtime.close
    zoneTradePointB = eventBearTop      // structural B reference
    zoneTradeInvalid = eventBearTop     // closed above B invalidates
    zoneTradeTargetC = not runtime.na(eventBearC) and eventBearC < runtime.close ? eventBearC : runtime.na
    zoneTradeTf = eventBearTF
    zoneTradeBeLocked = false
    zoneTradeC1Hit = false
    zoneTradeLastExit = "--"
    zoneTradeLastExitBar = runtime.na
    zoneTradeCycle += 1

    modelSellTop = eventBearTop
    modelSellBot = eventBearBot
    modelSellA = eventBearA
    modelSellC = eventBearC
    modelSellStage = 5
    modelSellBTime = eventBearBTime
    modelSellTF = eventBearTF


// Raw simulated P/L from the ACTUAL Model confirmation entry.
modelRunningProfitRaw = f_dashboardPl(zoneTradeEntry, zoneTradeDir)

// Point C is TP1 only. Reaching C does NOT runtime.close the setup.
modelC1HitNow =
     zoneTradeDir != 0 and not zoneTradeC1Hit and not runtime.na(zoneTradeTargetC) and
     ((zoneTradeDir == 1 and runtime.high >= zoneTradeTargetC) or
      (zoneTradeDir == -1 and runtime.low <= zoneTradeTargetC))

if modelC1HitNow:
    zoneTradeC1Hit = true

if zoneTradeDir != 0 and not zoneTradeBeLocked and not runtime.na(modelRunningProfitRaw) and modelRunningProfitRaw >= beTriggerProfitUsd:
    zoneTradeBeLocked = true

modelClosedAtBE =
     zoneTradeBeLocked and barstate.isconfirmed and
     ((zoneTradeDir == 1 and runtime.close <= zoneTradeEntry) or
      (zoneTradeDir == -1 and runtime.close >= zoneTradeEntry))

modelInvalid =
     zoneTradeDir == 1 and barstate.isconfirmed and runtime.close < zoneTradeInvalid or
     zoneTradeDir == -1 and barstate.isconfirmed and runtime.close > zoneTradeInvalid

if modelClosedAtBE or modelInvalid:
    zoneTradeLastExit = modelClosedAtBE ? "BE CLOSED" : "MODEL INVALIDATED"
    zoneTradeLastExitBar = runtime.bar_index
    zoneTradeDir = 0
    zoneTradeEntry = runtime.na
    zoneTradePointB = runtime.na
    zoneTradeInvalid = runtime.na
    zoneTradeTargetC = runtime.na
    zoneTradeTf = "--"
    zoneTradeBeLocked = false
    zoneTradeC1Hit = false


// Visible Model-1 Zone B boxes. These are NOT the generic Flight zones.
if 'abcBuyBox' not in locals(): abcBuyBox = runtime.na
if 'abcSellBox' not in locals(): abcSellBox = runtime.na
if 'abcBuyBLine' not in locals(): abcBuyBLine = runtime.na
if 'abcSellBLine' not in locals(): abcSellBLine = runtime.na
if 'abcBuyALine' not in locals(): abcBuyALine = runtime.na
if 'abcSellALine' not in locals(): abcSellALine = runtime.na
if 'abcBuyCLine' not in locals(): abcBuyCLine = runtime.na
if 'abcSellCLine' not in locals(): abcSellCLine = runtime.na
if 'abcBuyBLabel' not in locals(): abcBuyBLabel = runtime.na
if 'abcSellBLabel' not in locals(): abcSellBLabel = runtime.na
if 'abcBuyALabel' not in locals(): abcBuyALabel = runtime.na
if 'abcBuyCLabel' not in locals(): abcBuyCLabel = runtime.na
if 'abcSellALabel' not in locals(): abcSellALabel = runtime.na
if 'abcSellCLabel' not in locals(): abcSellCLabel = runtime.na

abcBuyChanged = barstate.isconfirmed and (
     modelBuyTop != modelBuyTop[1] or modelBuyBot != modelBuyBot[1] or
     modelBuyTF != modelBuyTF[1] or modelBuyStage != modelBuyStage[1] or
     modelBuyA != modelBuyA[1] or modelBuyC != modelBuyC[1])
abcSellChanged = barstate.isconfirmed and (
     modelSellTop != modelSellTop[1] or modelSellBot != modelSellBot[1] or
     modelSellTF != modelSellTF[1] or modelSellStage != modelSellStage[1] or
     modelSellA != modelSellA[1] or modelSellC != modelSellC[1])

if abcBuyChanged:
    if not runtime.na(abcBuyBox):
        runtime.box_delete(abcBuyBox)
    if not runtime.na(abcBuyBLine):
        runtime.line_delete(abcBuyBLine)
    if not runtime.na(abcBuyALine):
        runtime.line_delete(abcBuyALine)
    if not runtime.na(abcBuyCLine):
        runtime.line_delete(abcBuyCLine)
    if not runtime.na(abcBuyBLabel):
        runtime.label_delete(abcBuyBLabel)
    if not runtime.na(abcBuyALabel):
        runtime.label_delete(abcBuyALabel)
    if not runtime.na(abcBuyCLabel):
        runtime.label_delete(abcBuyCLabel)

    if showModelStructure and not runtime.na(modelBuyTop) and not runtime.na(modelBuyBot) and not runtime.na(modelBuyBTime):
        abcBuyBox = runtime.box_new(modelBuyBTime, modelBuyTop, runtime.time, modelBuyBot,
             xloc="bar_time", extend="right",
             bgcolor=runtime.color_new(bullColor, 91), border_color=gold, border_width=2,
             text="MODEL 1 • ZONE B (DEMAND) • " + modelBuyTF, text_color=bullColor, text_size="small")
        abcBuyBLine = runtime.line_new(modelBuyBTime, modelBuyBot, runtime.time, modelBuyBot,
             xloc="bar_time", extend="right", color=gold, width=2, style=line.style_dashed)
        abcBuyBLabel = runtime.label_new(modelBuyBTime, modelBuyBot,
             "B • ZONE B REF  " + runtime.str_tostring(modelBuyBot, format.mintick),
             xloc="bar_time", style="label_up", color=darkBg, textcolor=gold, size="small")
        if not runtime.na(modelBuyA):
            abcBuyALine = runtime.line_new(modelBuyBTime, modelBuyA, runtime.time, modelBuyA,
                 xloc="bar_time", extend="right", color=runtime.color_new(bullColor, 45), width=1, style=line.style_dotted)
            abcBuyALabel = runtime.label_new(modelBuyBTime, modelBuyA, "A • BOS LEVEL",
                 xloc="bar_time", style="label_left", color=darkBg, textcolor=bullColor, size="tiny")
        if not runtime.na(modelBuyC) and not (zoneTradeDir == 1 and zoneTradeC1Hit):
            abcBuyCLine = runtime.line_new(runtime.time, modelBuyC, runtime.time + 1, modelBuyC,
                 xloc="bar_time", extend="right", color=runtime.color_new(bullColor, 15), width=1, style=line.style_dashed)
            abcBuyCLabel = runtime.label_new(runtime.time, modelBuyC, "C • TP1 STRUCTURE",
                 xloc="bar_time", style="label_left", color=darkBg, textcolor=bullColor, size="tiny")

if abcSellChanged:
    if not runtime.na(abcSellBox):
        runtime.box_delete(abcSellBox)
    if not runtime.na(abcSellBLine):
        runtime.line_delete(abcSellBLine)
    if not runtime.na(abcSellALine):
        runtime.line_delete(abcSellALine)
    if not runtime.na(abcSellCLine):
        runtime.line_delete(abcSellCLine)
    if not runtime.na(abcSellBLabel):
        runtime.label_delete(abcSellBLabel)
    if not runtime.na(abcSellALabel):
        runtime.label_delete(abcSellALabel)
    if not runtime.na(abcSellCLabel):
        runtime.label_delete(abcSellCLabel)

    if showModelStructure and not runtime.na(modelSellTop) and not runtime.na(modelSellBot) and not runtime.na(modelSellBTime):
        abcSellBox = runtime.box_new(modelSellBTime, modelSellTop, runtime.time, modelSellBot,
             xloc="bar_time", extend="right",
             bgcolor=runtime.color_new(bearColor, 92), border_color=gold, border_width=2,
             text="MODEL 1 • ZONE B (SUPPLY) • " + modelSellTF, text_color=bearColor, text_size="small")
        abcSellBLine = runtime.line_new(modelSellBTime, modelSellTop, runtime.time, modelSellTop,
             xloc="bar_time", extend="right", color=gold, width=2, style=line.style_dashed)
        abcSellBLabel = runtime.label_new(modelSellBTime, modelSellTop,
             "B • ZONE B REF  " + runtime.str_tostring(modelSellTop, format.mintick),
             xloc="bar_time", style="label_down", color=darkBg, textcolor=gold, size="small")
        if not runtime.na(modelSellA):
            abcSellALine = runtime.line_new(modelSellBTime, modelSellA, runtime.time, modelSellA,
                 xloc="bar_time", extend="right", color=runtime.color_new(bearColor, 45), width=1, style=line.style_dotted)
            abcSellALabel = runtime.label_new(modelSellBTime, modelSellA, "A • BOS LEVEL",
                 xloc="bar_time", style="label_left", color=darkBg, textcolor=bearColor, size="tiny")
        if not runtime.na(modelSellC) and not (zoneTradeDir == -1 and zoneTradeC1Hit):
            abcSellCLine = runtime.line_new(runtime.time, modelSellC, runtime.time + 1, modelSellC,
                 xloc="bar_time", extend="right", color=runtime.color_new(bearColor, 15), width=1, style=line.style_dashed)
            abcSellCLabel = runtime.label_new(runtime.time, modelSellC, "C • TP1 STRUCTURE",
                 xloc="bar_time", style="label_left", color=darkBg, textcolor=bearColor, size="tiny")

// TP1 CLEANUP:
// After Point C / TP1 is hit, it is no longer an ACTIVE TARGET.
// Remove the C target line/label from the chart and continue only as RUNNER.
if zoneTradeC1Hit:
    if zoneTradeDir == 1:
        if not runtime.na(abcBuyCLine):
            runtime.line_delete(abcBuyCLine)
            abcBuyCLine = runtime.na
        if not runtime.na(abcBuyCLabel):
            runtime.label_delete(abcBuyCLabel)
            abcBuyCLabel = runtime.na
    if zoneTradeDir == -1:
        if not runtime.na(abcSellCLine):
            runtime.line_delete(abcSellCLine)
            abcSellCLine = runtime.na
        if not runtime.na(abcSellCLabel):
            runtime.label_delete(abcSellCLabel)
            abcSellCLabel = runtime.na

zoneTradeStatus =
     zoneTradeDir == 1 ? "⚡ BULL POINT B ACTIVE" :
     zoneTradeDir == -1 ? "⚡ BEAR POINT B ACTIVE" : "WAIT"

//=============================================================================
// ELITE V3.2 — INTERNAL CONTROL ENGINE

// Hidden logic may use pivots, market structure, CHoCH, zone strength,
// trend agreement and zone validity. Members only see the final decision.
//=============================================================================

// Track nearest-zone identity, age and retests.
if 'trackedBuyZoneTime' not in locals(): trackedBuyZoneTime = runtime.na
if 'trackedSellZoneTime' not in locals(): trackedSellZoneTime = runtime.na
if 'buyZoneFirstSeen' not in locals(): buyZoneFirstSeen = runtime.na
if 'sellZoneFirstSeen' not in locals(): sellZoneFirstSeen = runtime.na
if 'buyRetests' not in locals(): buyRetests = 0
if 'sellRetests' not in locals(): sellRetests = 0
if 'wasInBuyZone' not in locals(): wasInBuyZone = false
if 'wasInSellZone' not in locals(): wasInSellZone = false

buyZoneChanged = nearestBuyTimeFull != trackedBuyZoneTime
sellZoneChanged = nearestSellTimeFull != trackedSellZoneTime

if buyZoneChanged:
    trackedBuyZoneTime = nearestBuyTimeFull
    buyZoneFirstSeen = runtime.time
    buyRetests = 0
    wasInBuyZone = false

if sellZoneChanged:
    trackedSellZoneTime = nearestSellTimeFull
    sellZoneFirstSeen = runtime.time
    sellRetests = 0
    wasInSellZone = false

if inBuyZone and not wasInBuyZone:
    buyRetests += 1
if inSellZone and not wasInSellZone:
    sellRetests += 1

wasInBuyZone = inBuyZone
wasInSellZone = inSellZone

f_ageText(int firstSeen) =>
    if runtime.na(firstSeen):
        "NEW"
    else:
mins = int(runtime.math_max(0, (timenow - firstSeen) / 60000))
hrs = int(runtime.math_floor(mins / 60))
days = int(runtime.math_floor(hrs / 24))
remHrs = hrs % 24
remMins = mins % 60
        mins <= 1 ? "NEW" :
         mins < 60 ? runtime.str_tostring(mins) + "m" :
         hrs < 24 ? runtime.str_tostring(hrs) + "h " + runtime.str_tostring(remMins) + "m" :
         days < 30 ? runtime.str_tostring(days) + "D " + runtime.str_tostring(remHrs) + "h" :
         "30D+"

f_eventAgeText(int eventTime) =>
    if runtime.na(eventTime):
        "--"
    else:
mins = int(runtime.math_max(0, (timenow - eventTime) / 60000))
hrs = int(runtime.math_floor(mins / 60))
remMins = mins % 60
        mins <= 1 ? "NOW" :
         hrs > 0 ? runtime.str_tostring(hrs) + "h " + runtime.str_tostring(remMins) + "m AGO" :
         runtime.str_tostring(mins) + "m AGO"

f_grade(float score) =>
    score >= 95 ? "A+" :
     score >= 85 ? "A" :
     score >= 75 ? "B+" :
     score >= 65 ? "B" :
     score >= 50 ? "C" : "D"

f_strengthColor(float score) =>
    score >= 84 ? bullColor :
     score >= 64 ? neutralColor : bearColor

buyTfScore = nearestBuyTF == "4H" ? 20.0 :
     nearestBuyTF == "1H" ? 16.0 :
     nearestBuyTF == "15M" ? 11.0 :
     nearestBuyTF == "5M" ? 7.0 : 0.0

sellTfScore = nearestSellTF == "4H" ? 20.0 :
     nearestSellTF == "1H" ? 16.0 :
     nearestSellTF == "15M" ? 11.0 :
     nearestSellTF == "5M" ? 7.0 : 0.0

adxStrengthScore = adx5 >= 35 ? 16.0 :
     adx5 >= 25 ? 12.0 :
     adx5 >= 20 ? 6.0 : 0.0

// Hidden pivot / structure confirmation.
internalPivotHigh = runtime.ta_pivothigh(runtime.high, controlPivotLen, controlPivotLen)
internalPivotLow = runtime.ta_pivotlow(runtime.low, controlPivotLen, controlPivotLen)

if 'lastInternalHigh' not in locals(): lastInternalHigh = runtime.na
if 'prevInternalHigh' not in locals(): prevInternalHigh = runtime.na
if 'lastInternalLow' not in locals(): lastInternalLow = runtime.na
if 'prevInternalLow' not in locals(): prevInternalLow = runtime.na

if not runtime.na(internalPivotHigh):
    prevInternalHigh = lastInternalHigh
    lastInternalHigh = internalPivotHigh

if not runtime.na(internalPivotLow):
    prevInternalLow = lastInternalLow
    lastInternalLow = internalPivotLow

internalHH = not runtime.na(lastInternalHigh) and not runtime.na(prevInternalHigh) and lastInternalHigh > prevInternalHigh
internalLH = not runtime.na(lastInternalHigh) and not runtime.na(prevInternalHigh) and lastInternalHigh < prevInternalHigh
internalHL = not runtime.na(lastInternalLow) and not runtime.na(prevInternalLow) and lastInternalLow > prevInternalLow
internalLL = not runtime.na(lastInternalLow) and not runtime.na(prevInternalLow) and lastInternalLow < prevInternalLow

internalBullStructure = internalHH or internalHL
internalBearStructure = internalLH or internalLL

// Zone strength remains member-facing, but its calculation stays hidden.
buyStrengthRaw = 42.0 + buyTfScore + adxStrengthScore
buyStrengthRaw += mtfBuyAgreement ? 12.0 : trend5 == 1 ? 5.0 : 0.0
buyStrengthRaw += bullishChochConfirmed ? 8.0 : 0.0
buyStrengthRaw += internalBullStructure ? 8.0 : 0.0
buyStrengthRaw += zoneGapReady ? 5.0 : 0.0
buyStrengthRaw += buyRetests <= 1 ? 9.0 : buyRetests == 2 ? 5.0 : buyRetests == 3 ? 1.0 : -6.0
buyStrength = runtime.math_max(20.0, runtime.math_min(99.0, buyStrengthRaw))

sellStrengthRaw = 42.0 + sellTfScore + adxStrengthScore
sellStrengthRaw += mtfSellAgreement ? 12.0 : trend5 == -1 ? 5.0 : 0.0
sellStrengthRaw += bearishChochConfirmed ? 8.0 : 0.0
sellStrengthRaw += internalBearStructure ? 8.0 : 0.0
sellStrengthRaw += zoneGapReady ? 5.0 : 0.0
sellStrengthRaw += sellRetests <= 1 ? 9.0 : sellRetests == 2 ? 5.0 : sellRetests == 3 ? 1.0 : -6.0
sellStrength = runtime.math_max(20.0, runtime.math_min(99.0, sellStrengthRaw))

buyGrade = f_grade(buyStrength)
sellGrade = f_grade(sellStrength)

// Hidden control scores. The dashboard never exposes these components.
buyControlScore = buyStrength
buyControlScore += inBuyZone ? 8.0 : 0.0
buyControlScore += bullishChochConfirmed ? 8.0 : 0.0
buyControlScore += internalBullStructure ? 8.0 : 0.0
buyControlScore += mtfBuyAgreement ? 6.0 : 0.0

sellControlScore = sellStrength
sellControlScore += inSellZone ? 8.0 : 0.0
sellControlScore += bearishChochConfirmed ? 8.0 : 0.0
sellControlScore += internalBearStructure ? 8.0 : 0.0
sellControlScore += mtfSellAgreement ? 6.0 : 0.0

fullBuyConfirmation = barstate.isconfirmed and
     buyControlScore >= controlMinScore and
     bullishChochConfirmed and
     internalBullStructure and
     (inBuyZone or runtime.close > nearestBuyTopFull)

fullSellConfirmation = barstate.isconfirmed and
     sellControlScore >= controlMinScore and
     bearishChochConfirmed and
     internalBearStructure and
     (inSellZone or runtime.close < nearestSellBotFull)

//=============================================================================
// V6.0 FRESH MARKET-CONTROL STATE MACHINE
//
// HH / HL / LH / LL, pivots, CHoCH, EMA200 and zones are used internally.
// Members only see BUY ACTIVE, SELL ACTIVE, SIDEWAYS or WAIT FOR ZONE.
//
// Important:
// - A small pullback cannot reverse control.
// - A genuine opposite-zone reaction + pivot break can reverse control.
// - No old-direction score advantage is required after a confirmed takeover.
//=============================================================================

// Persistent market state.
if 'radarDir' not in locals(): radarDir = 0                    // 1 BUY, -1 SELL, 0 neutral
if 'radarEntry' not in locals(): radarEntry = runtime.na
if 'radarEntryLot' not in locals(): radarEntryLot = runtime.na              // SFA lot locked at FLIGHT entry
if 'activeZoneTop' not in locals(): activeZoneTop = runtime.na
if 'activeZoneBottom' not in locals(): activeZoneBottom = runtime.na
if 'radarStartTime' not in locals(): radarStartTime = runtime.na
if 'radarStartBar' not in locals(): radarStartBar = runtime.na
if 'radarFinal' not in locals(): radarFinal = ""
if 'radarLastEventTime' not in locals(): radarLastEventTime = runtime.na
if 'radarLastAlertBar' not in locals(): radarLastAlertBar = runtime.na

// One active arrow only.
if 'activeTrendArrow' not in locals(): activeTrendArrow = runtime.na
if 'lastArrowDir' not in locals(): lastArrowDir = 0

// Takeover confirmation counters.
if 'bullTakeoverCount' not in locals(): bullTakeoverCount = 0
if 'bearTakeoverCount' not in locals(): bearTakeoverCount = 0

// Remember the most recent runtime.time price touched each side.
if 'lastBuyZoneTouchBar' not in locals(): lastBuyZoneTouchBar = runtime.na
if 'lastSellZoneTouchBar' not in locals(): lastSellZoneTouchBar = runtime.na

if inBuyZone:
    lastBuyZoneTouchBar = runtime.bar_index
if inSellZone:
    lastSellZoneTouchBar = runtime.bar_index

recentBuyZoneTouch = not runtime.na(lastBuyZoneTouchBar) and
     runtime.bar_index - lastBuyZoneTouchBar <= takeoverWindowBars
recentSellZoneTouch = not runtime.na(lastSellZoneTouchBar) and
     runtime.bar_index - lastSellZoneTouchBar <= takeoverWindowBars

// Live pivot breaks use the last confirmed pivot values.
// This reacts faster than waiting for a new HH/HL label to be fully formed.
breakAbovePivot = not runtime.na(lastInternalHigh) and runtime.close > lastInternalHigh
breakBelowPivot = not runtime.na(lastInternalLow) and runtime.close < lastInternalLow

candleBody = runtime.math_abs(runtime.close - runtime.open)
strongBullBody = runtime.close > runtime.open and candleBody >= currentAtr * takeoverBodyAtr
strongBearBody = runtime.close < runtime.open and candleBody >= currentAtr * takeoverBodyAtr

recentSwingLow = runtime.ta_lowest(runtime.low, controlPivotLen * 4 + 4)
recentSwingHigh = runtime.ta_highest(runtime.high, controlPivotLen * 4 + 4)

bullExpansion = runtime.close - recentSwingLow >= currentAtr * takeoverMoveAtr
bearExpansion = recentSwingHigh - runtime.close >= currentAtr * takeoverMoveAtr

// Fresh takeover confirmation.
// Zone reaction + pivot break are the core requirements.
// Structure/CHOCH/EMA200 support the confirmation but one lagging item
// cannot keep the dashboard stuck forever.
bullTakeoverRaw = barstate.isconfirmed and
     recentBuyZoneTouch and
     breakAbovePivot and
     strongBullBody and
     bullExpansion and
     runtime.close > ema200 and
     (internalBullStructure or bullishChochConfirmed or trend5 == 1)

bearTakeoverRaw = barstate.isconfirmed and
     recentSellZoneTouch and
     breakBelowPivot and
     strongBearBody and
     bearExpansion and
     runtime.close < ema200 and
     (internalBearStructure or bearishChochConfirmed or trend5 == -1)

// Continue confirmation briefly after the actual break candle.
bullTakeoverFollow = radarDir == -1 and bullTakeoverCount > 0 and
     runtime.close > ema200 and runtime.close > lastInternalHigh
bearTakeoverFollow = radarDir == 1 and bearTakeoverCount > 0 and
     runtime.close < ema200 and runtime.close < lastInternalLow

if bullTakeoverRaw or bullTakeoverFollow:
    bullTakeoverCount += 1
else:
    bullTakeoverCount = 0

if bearTakeoverRaw or bearTakeoverFollow:
    bearTakeoverCount += 1
else:
    bearTakeoverCount = 0

confirmedBullTakeover = bullTakeoverCount >= takeoverConfirmBars
confirmedBearTakeover = bearTakeoverCount >= takeoverConfirmBars

// Initial state: use the strongest complete setup, or a confirmed live takeover.
if radarDir == 0:
    if confirmedBullTakeover or (fullBuyConfirmation and buyControlScore >= sellControlScore):
        radarDir = 1
        radarEntry = runtime.close
        radarEntryLot = dashboardLotSize
        activeZoneTop = nearestBuyTopFull
        activeZoneBottom = nearestBuyBotFull
        radarStartTime = runtime.time
        radarStartBar = runtime.bar_index
        radarFinal = "BUY CONTROL STARTED"
        radarLastEventTime = runtime.time
        radarLastAlertBar = runtime.na
        bullTakeoverCount = 0
        bearTakeoverCount = 0
    elif confirmedBearTakeover or (fullSellConfirmation and sellControlScore >= buyControlScore):
        radarDir = -1
        radarEntry = runtime.close
        radarEntryLot = dashboardLotSize
        activeZoneTop = nearestSellTopFull
        activeZoneBottom = nearestSellBotFull
        radarStartTime = runtime.time
        radarStartBar = runtime.bar_index
        radarFinal = "SELL CONTROL STARTED"
        radarLastEventTime = runtime.time
        radarLastAlertBar = runtime.na
        bullTakeoverCount = 0
        bearTakeoverCount = 0

// Direct confirmed takeover.
// The old direction is replaced immediately after the required closed bars.
if radarDir == -1 and confirmedBullTakeover:
    radarDir = 1
    radarEntry = runtime.close
    radarEntryLot = dashboardLotSize
    activeZoneTop = nearestBuyTopFull
    activeZoneBottom = nearestBuyBotFull
    radarStartTime = runtime.time
    radarStartBar = runtime.bar_index
    radarFinal = "BUY TAKEOVER CONFIRMED"
    radarLastEventTime = runtime.time
    radarLastAlertBar = runtime.na
    bullTakeoverCount = 0
    bearTakeoverCount = 0

if radarDir == 1 and confirmedBearTakeover:
    radarDir = -1
    radarEntry = runtime.close
    radarEntryLot = dashboardLotSize
    activeZoneTop = nearestSellTopFull
    activeZoneBottom = nearestSellBotFull
    radarStartTime = runtime.time
    radarStartBar = runtime.bar_index
    radarFinal = "SELL TAKEOVER CONFIRMED"
    radarLastEventTime = runtime.time
    radarLastAlertBar = runtime.na
    bullTakeoverCount = 0
    bearTakeoverCount = 0

// Neutralise only when the active zone is broken AND opposite structure confirms.
// A normal pullback cannot end the active state.
buyControlBroken = radarDir == 1 and barstate.isconfirmed and
     not runtime.na(activeZoneBottom) and runtime.close < activeZoneBottom and
     breakBelowPivot and (internalBearStructure or bearishChochConfirmed)

sellControlBroken = radarDir == -1 and barstate.isconfirmed and
     not runtime.na(activeZoneTop) and runtime.close > activeZoneTop and
     breakAbovePivot and (internalBullStructure or bullishChochConfirmed)

if buyControlBroken and not confirmedBearTakeover:
    radarDir = 0
    radarEntry = runtime.na
    radarEntryLot = runtime.na
    activeZoneTop = runtime.na
    activeZoneBottom = runtime.na
    radarStartTime = runtime.na
    radarStartBar = runtime.na
    radarFinal = "BUY CONTROL ENDED"
    radarLastEventTime = runtime.time
    radarLastAlertBar = runtime.na

if sellControlBroken and not confirmedBullTakeover:
    radarDir = 0
    radarEntry = runtime.na
    radarEntryLot = runtime.na
    activeZoneTop = runtime.na
    activeZoneBottom = runtime.na
    radarStartTime = runtime.na
    radarStartBar = runtime.na
    radarFinal = "SELL CONTROL ENDED"
    radarLastEventTime = runtime.time
    radarLastAlertBar = runtime.na

//=============================================================================
// MAIN FLIGHT CHART SIGNAL
//=============================================================================
trendArrowAtr = runtime.math_max(runtime.ta_atr(14), runtime.syminfo.mintick * 20)
flightMarkerGap =
     runtime.math_max(
         trendArrowAtr * trendArrowGapAtr,
         (runtime.high - runtime.low) * 1.25,
         runtime.syminfo.mintick * 60)

flightBuySignalEvent =
     barstate.isconfirmed and radarDir == 1 and radarDir != runtime.nz(radarDir[1], 0)

flightSellSignalEvent =
     barstate.isconfirmed and radarDir == -1 and radarDir != runtime.nz(radarDir[1], 0)

flightEndedEvent =
     barstate.isconfirmed and radarDir == 0 and runtime.nz(radarDir[1], 0) != 0

if showFlightOnChart and radarDir != lastArrowDir:
    if not runtime.na(activeTrendArrow):
        runtime.label_delete(activeTrendArrow)
        activeTrendArrow = runtime.na

arrowBar = runtime.nz(radarStartBar, runtime.bar_index)

    if radarDir == 1:
buyArrowPrice = runtime.low - flightMarkerGap
        activeTrendArrow = runtime.label_new(
             arrowBar,
             buyArrowPrice,
             "🐋 WHALE BUY",
             xloc=xloc.runtime.bar_index,
             yloc="price",
             style="label_up",
             color=runtime.color_new(bullColor, 0),
             textcolor="#ffffff",
             size=f_flightChartSize(),
             tooltip="SFA WHALE BUY\nSame locked main signal logic. Remains active until WHALE SELL or signal end.")

    elif radarDir == -1:
sellArrowPrice = runtime.high + flightMarkerGap
        activeTrendArrow = runtime.label_new(
             arrowBar,
             sellArrowPrice,
             "🐋 WHALE SELL",
             xloc=xloc.runtime.bar_index,
             yloc="price",
             style="label_down",
             color=runtime.color_new(bearColor, 0),
             textcolor="#ffffff",
             size=f_flightChartSize(),
             tooltip="SFA WHALE SELL\nSame locked main signal logic. Remains active until WHALE BUY or signal end.")

    lastArrowDir = radarDir

if not showFlightOnChart and not runtime.na(activeTrendArrow):
    runtime.label_delete(activeTrendArrow)
    activeTrendArrow = runtime.na
    lastArrowDir = radarDir

marketSideways = radarDir == 0 and useSidewaysFilter and
     (adx5 < adxCautionLevel or not zoneGapReady or not emaSlopeReady or not mtfAgreementReady)

// NO TRADE is valid only when BUY/SELL zones are compressed
// AND price is actually near/inside one of those zones.
zoneActionNearAtr = 0.25
zoneNearPrice =
     inBuyZone or inSellZone or
     (not runtime.na(buyDistance) and buyDistance <= currentAtr * zoneActionNearAtr) or
     (not runtime.na(sellDistance) and sellDistance <= currentAtr * zoneActionNearAtr)

zoneNoTradeNow = not zoneGapReady and zoneNearPrice
zoneNoTradeEvent = zoneNoTradeNow and not zoneNoTradeNow[1]
zoneNoTradeExit = not zoneNoTradeNow and zoneNoTradeNow[1]

showNoTradeBadgeOnChart = false

if showNoTradeBadgeOnChart and zoneNoTradeEvent:
    if not runtime.na(zoneNoTradeLabel):
        runtime.label_delete(zoneNoTradeLabel)
    zoneNoTradeLabel = runtime.label_new(
         runtime.bar_index,
         runtime.high + runtime.math_max(runtime.ta_atr(14) * 0.18, runtime.syminfo.mintick * 10),
         "⚠ NO TRADE",
         xloc=xloc.runtime.bar_index,
         yloc="price",
         style="label_down",
         color=runtime.color_rgb(202, 138, 4),
         textcolor="#ffffff",
         size=f_zoneSignalSize(),
         tooltip="BUY/SELL zones compressed near price")

if zoneNoTradeExit and not runtime.na(zoneNoTradeLabel):
    runtime.label_delete(zoneNoTradeLabel)
    zoneNoTradeLabel = runtime.na

// A confirmed UP/DOWN always removes temporary NO TRADE.
if (newUpZoneSignal or newDownZoneSignal) and not runtime.na(zoneNoTradeLabel):
    runtime.label_delete(zoneNoTradeLabel)
    zoneNoTradeLabel = runtime.na

uiMarketState =
     marketSideways ? "SIDEWAYS" :
     radarDir == 1 ? "TRENDING UP" :
     radarDir == -1 ? "TRENDING DOWN" :
     "WAIT"

if 'uiUpCountToday' not in locals(): uiUpCountToday = 0
if 'uiDownCountToday' not in locals(): uiDownCountToday = 0
uiNewDay = dayofmonth != dayofmonth[1] or month != month[1] or year != year[1]
if uiNewDay:
    uiUpCountToday = 0
    uiDownCountToday = 0
if newUpZoneSignal:
    uiUpCountToday += 1
if newDownZoneSignal:
    uiDownCountToday += 1


f_qualityLabel(float score) =>
    score >= 95 ? "ELITE" :
     score >= 85 ? "PREMIUM" :
     score >= 75 ? "STRONG" :
     score >= 65 ? "GOOD" :
     score >= 50 ? "FAIR" : "WEAK"

f_qualityBar(float score) =>
filled = int(runtime.math_round(runtime.math_max(0.0, runtime.math_min(100.0, score)) / 20.0))
    filled >= 5 ? "★★★★★" :
     filled == 4 ? "★★★★☆" :
     filled == 3 ? "★★★☆☆" :
     filled == 2 ? "★★☆☆☆" :
     filled == 1 ? "★☆☆☆☆" : "☆☆☆☆☆"

f_zoneLife(int retests, float strength) =>
    retests == 0 ? "FRESH" :
     retests == 1 ? "TESTED" :
     retests == 2 ? "RETEST 2" :
     retests == 3 and strength >= 65 ? "RETEST 3" :
     strength < 55 ? "WEAK" : "MATURE"

f_timeText(int eventTime) =>
    if runtime.na(eventTime):
        "--"
    else:
        str.format_time(eventTime, "HH:mm", "Europe/London")

// -----------------------------------------------------------------------------
// FINAL MODEL-1 / FLIGHT DISPLAY VARIABLES
// -----------------------------------------------------------------------------
buyZoneStatus = f_modelStageText(modelBuyStage, true)
sellZoneStatus = f_modelStageText(modelSellStage, false)

buyStatusColor =
     modelBuyStage == 5 ? bullColor :
     modelBuyStage >= 3 ? neutralColor : "#c0c0c0"

sellStatusColor =
     modelSellStage == 5 ? bearColor :
     modelSellStage >= 3 ? neutralColor : "#c0c0c0"

runningAge = radarDir == 0 ? "--" : f_ageText(radarStartTime)

flightRunningPl =
     radarDir == 0 or runtime.na(radarEntry) ?
          runtime.na :
          f_dashboardPlLot(
               radarEntry,
               runtime.close,
               radarDir,
               runtime.na(radarEntryLot) ? dashboardLotSize : radarEntryLot)

flightSignalText =
     radarDir == 1 ? "🐋 WHALE BUY // RUNNING" :
     radarDir == -1 ? "🐋 WHALE SELL // RUNNING" :
     "🐋 WHALE WAIT // IDLE"

flightEntryText =
     radarDir == 0 or runtime.na(radarEntry) ? "--" :
     runtime.str_tostring(radarEntry, format.mintick)

flightPlText =
     runtime.na(flightRunningPl) ? "--" :
     "$" + runtime.str_tostring(flightRunningPl, "#.00")

flightAgeText =
     radarDir == 0 ? "--" : runningAge

dashboardLotModelText =
     dashboardIsGold ? "GOLD // LOT " + dashboardLotText :
     dashboardIsSilver ? "SILVER // LOT " + dashboardLotText :
     dashboardIsBtc ? "BTC // LOT " + dashboardLotText :
     dashboardIsEth ? "ETH // LOT " + dashboardLotText :
     dashboardIsForex ? "FX // LOT " + dashboardLotText + " // ~ $10/PIP" :
     "LOT " + dashboardLotText

controlStrength =
     radarDir == 1 ?
         (buyStrength >= 85 ? "✈ BUY CONTROL • STRONG" :
          buyStrength >= 70 ? "✈ BUY CONTROL • ACTIVE" : "✈ BUY CONTROL • WEAKENING") :
     radarDir == -1 ?
         (sellStrength >= 85 ? "✈ SELL CONTROL • STRONG" :
          sellStrength >= 70 ? "✈ SELL CONTROL • ACTIVE" : "✈ SELL CONTROL • WEAKENING") :
     "✈ WAIT"

activeGuide =
     zoneTradeDir == 1 ? "⚡ BULL POINT B ACTIVE" :
     zoneTradeDir == -1 ? "⚡ BEAR POINT B ACTIVE" :
     radarDir == 1 ? "✈ BUY ACTIVE" :
     radarDir == -1 ? "✈ SELL ACTIVE" :
     "WAIT"

radarConfidence =
     radarDir == 1 ? buyStrength :
     radarDir == -1 ? sellStrength :
     runtime.math_max(buyStrength, sellStrength)

dashboardTradeWarning =
     zoneTradeDir == 1 ? "⚡ MODEL 1 BULL ACTIVE • B ENTRY " + runtime.str_tostring(zoneTradeEntry, format.mintick) :
     zoneTradeDir == -1 ? "⚡ MODEL 1 BEAR ACTIVE • B ENTRY " + runtime.str_tostring(zoneTradeEntry, format.mintick) :
     radarDir == 1 ? "✈ FLIGHT BUY ACTIVE" :
     radarDir == -1 ? "✈ FLIGHT SELL ACTIVE" :
     "WAIT"

marketStatusColor =
     zoneTradeDir == 1 ? bullColor :
     zoneTradeDir == -1 ? bearColor :
     radarDir == 1 ? bullColor :
     radarDir == -1 ? bearColor :
     neutralColor

uiStatusText = activeGuide
uiStatusColor = marketStatusColor

f_dashboardPos(string posOpt) =>
    switch posOpt
        "Top Left" => position.top_left
        "Top Center" => position.top_center
        "Top Right" => position.top_right
        "Middle Left" => position.middle_left
        "Middle Center" => position.middle_center
        "Middle Right" => position.middle_right
        "Bottom Left" => position.bottom_left
        "Bottom Center" => position.bottom_center
        => position.bottom_right

f_dashboardSize(string sizeOpt) =>
    switch sizeOpt
        "Tiny" => "tiny"
        "Small" => "small"
        "Large" => "large"
        => "normal"

f_dashboardHeaderSize(string sizeOpt) =>
    sizeOpt == "Tiny" ? "small" :
     sizeOpt == "Small" ? "normal" :
     "large"

// -----------------------------------------------------------------------------
//=============================================================================
//=============================================================================
// SFA FINAL REJECTION ENGINE
//
// ONLY LOGIC USED FOR THE TRADE SIGNAL:
//
// BUY
//   meaningful BUY zone
//   -> RED rejection/test candle closes valid at the zone
//   -> IMMEDIATE NEXT CLOSED GREEN candle follows through
//   -> ⚡ BUY CONFIRMED
//
// SELL
//   meaningful SELL zone
//   -> GREEN rejection/test candle closes valid at the zone
//   -> IMMEDIATE NEXT CLOSED RED candle follows through
//   -> ⚡ SELL CONFIRMED
//
// Confirmation ladder:
//   1/4 Rejection runtime.close
//   2/4 Next-candle follow-through   <-- DEFAULT ENTRY
//   3/4 Break rejection runtime.high / runtime.low
//   4/4 Structure shift BOS / CHOCH
//
// A running SELL keeps running if price only finds/tests a BUY zone.
// It reverses only after a valid BUY confirmation.
// Exact opposite for a running BUY.
//=============================================================================

rejAtr = runtime.math_max(runtime.ta_atr(14), runtime.syminfo.mintick * 20)
rejTouchTolerance = rejAtr * 0.08

// Keep the visible ⚡ safely outside the entire candle/wick.
// Tall candles use candle-range spacing; normal candles use ATR spacing.
signalMarkerGap =
     runtime.math_max(
         rejAtr * signalMarkerGapAtr,
         (runtime.high - runtime.low) * signalMarkerCandleGap,
         runtime.syminfo.mintick * 50)

rejBuyZoneChanged =
     mapBuyTime != mapBuyTime[1] or mapBuyTop != mapBuyTop[1] or mapBuyBot != mapBuyBot[1]
rejSellZoneChanged =
     mapSellTime != mapSellTime[1] or mapSellTop != mapSellTop[1] or mapSellBot != mapSellBot[1]

if 'rejBuyBar' not in locals(): rejBuyBar = runtime.na
if 'rejBuyHigh' not in locals(): rejBuyHigh = runtime.na
if 'rejBuyLow' not in locals(): rejBuyLow = runtime.na
if 'rejBuyClose' not in locals(): rejBuyClose = runtime.na
if 'rejBuyStructLevel' not in locals(): rejBuyStructLevel = runtime.na
if 'rejBuyLevel' not in locals(): rejBuyLevel = 0

if 'rejSellBar' not in locals(): rejSellBar = runtime.na
if 'rejSellHigh' not in locals(): rejSellHigh = runtime.na
if 'rejSellLow' not in locals(): rejSellLow = runtime.na
if 'rejSellClose' not in locals(): rejSellClose = runtime.na
if 'rejSellStructLevel' not in locals(): rejSellStructLevel = runtime.na
if 'rejSellLevel' not in locals(): rejSellLevel = 0

if 'rejBuyVol' not in locals(): rejBuyVol = runtime.na
if 'rejBuyAvgVol' not in locals(): rejBuyAvgVol = runtime.na
if 'rejBuyClosePos' not in locals(): rejBuyClosePos = runtime.na
if 'rejBuySwept' not in locals(): rejBuySwept = false

if 'rejSellVol' not in locals(): rejSellVol = runtime.na
if 'rejSellAvgVol' not in locals(): rejSellAvgVol = runtime.na
if 'rejSellClosePos' not in locals(): rejSellClosePos = runtime.na
if 'rejSellSwept' not in locals(): rejSellSwept = false

// Recent rejection event memory (latest 3).
var array<int> recentEvtTime = []
var array<int> recentEvtDir = []
var array<float> recentEvtLevel = []
var array<float> recentEvtClosePos = []
var array<float> recentEvtEffort = []

f_pushRecent(int t, int dir, float lvl, float closePos, float effort) =>
    array.unshift(recentEvtTime, t)
    array.unshift(recentEvtDir, dir)
    array.unshift(recentEvtLevel, lvl)
    array.unshift(recentEvtClosePos, closePos)
    array.unshift(recentEvtEffort, effort)
    while len(recentEvtTime) > 3
        recentEvtTime.pop()
        recentEvtDir.pop()
        recentEvtLevel.pop()
        recentEvtClosePos.pop()
        recentEvtEffort.pop()


if rejBuyZoneChanged:
    rejBuyBar = runtime.na
    rejBuyHigh = runtime.na
    rejBuyLow = runtime.na
    rejBuyClose = runtime.na
    rejBuyStructLevel = runtime.na
    rejBuyVol = runtime.na
    rejBuyAvgVol = runtime.na
    rejBuyClosePos = runtime.na
    rejBuySwept = false
    rejBuyLevel = 0

if rejSellZoneChanged:
    rejSellBar = runtime.na
    rejSellHigh = runtime.na
    rejSellLow = runtime.na
    rejSellClose = runtime.na
    rejSellStructLevel = runtime.na
    rejSellVol = runtime.na
    rejSellAvgVol = runtime.na
    rejSellClosePos = runtime.na
    rejSellSwept = false
    rejSellLevel = 0

buyTouchesZone =
     not runtime.na(mapBuyTop) and not runtime.na(mapBuyBot) and
     runtime.low <= mapBuyTop + rejTouchTolerance and runtime.high >= mapBuyBot - rejTouchTolerance

sellTouchesZone =
     not runtime.na(mapSellTop) and not runtime.na(mapSellBot) and
     runtime.high >= mapSellBot - rejTouchTolerance and runtime.low <= mapSellTop + rejTouchTolerance

buyRejectionClose =
     barstate.isconfirmed and buyTouchesZone and
     runtime.close < runtime.open and
     runtime.close >= mapBuyBot and
     runtime.close > runtime.low + (runtime.high - runtime.low) * 0.25

sellRejectionClose =
     barstate.isconfirmed and sellTouchesZone and
     runtime.close > runtime.open and
     runtime.close <= mapSellTop and
     runtime.close < runtime.high - (runtime.high - runtime.low) * 0.25

if buyRejectionClose:
    rejBuyBar = runtime.bar_index
    rejBuyHigh = runtime.high
    rejBuyLow = runtime.low
    rejBuyClose = runtime.close
    rejBuyStructLevel = runtime.ta_highest(runtime.high[1], rejectStructureLookback)
    rejBuyVol = runtime.volume
    rejBuyAvgVol = runtime.ta_sma(runtime.volume, 20)
    rejBuyClosePos = runtime.high == runtime.low ? 50.0 : (runtime.close - runtime.low) / (runtime.high - runtime.low) * 100.0
    rejBuySwept = runtime.low < mapBuyBot
    rejBuyLevel = 1
    f_pushRecent(runtime.time, 1, mapBuyBot, rejBuyClosePos,
         runtime.na(rejBuyAvgVol) or rejBuyAvgVol == 0 ? 0.0 : rejBuyVol / rejBuyAvgVol)


if sellRejectionClose:
    rejSellBar = runtime.bar_index
    rejSellHigh = runtime.high
    rejSellLow = runtime.low
    rejSellClose = runtime.close
    rejSellStructLevel = runtime.ta_lowest(runtime.low[1], rejectStructureLookback)
    rejSellVol = runtime.volume
    rejSellAvgVol = runtime.ta_sma(runtime.volume, 20)
    rejSellClosePos = runtime.high == runtime.low ? 50.0 : (runtime.close - runtime.low) / (runtime.high - runtime.low) * 100.0
    rejSellSwept = runtime.high > mapSellTop
    rejSellLevel = 1
    f_pushRecent(runtime.time, -1, mapSellTop, rejSellClosePos,
         runtime.na(rejSellAvgVol) or rejSellAvgVol == 0 ? 0.0 : rejSellVol / rejSellAvgVol)


buyFollowThrough =
     barstate.isconfirmed and rejBuyLevel == 1 and
     not runtime.na(rejBuyBar) and runtime.bar_index == rejBuyBar + 1 and
     runtime.close > runtime.open and runtime.close > rejBuyClose

sellFollowThrough =
     barstate.isconfirmed and rejSellLevel == 1 and
     not runtime.na(rejSellBar) and runtime.bar_index == rejSellBar + 1 and
     runtime.close < runtime.open and runtime.close < rejSellClose

if barstate.isconfirmed and rejBuyLevel == 1 and not runtime.na(rejBuyBar) and runtime.bar_index > rejBuyBar:
    if buyFollowThrough:
        rejBuyLevel = 2
    else:
        rejBuyBar = runtime.na
        rejBuyHigh = runtime.na
        rejBuyLow = runtime.na
        rejBuyClose = runtime.na
        rejBuyStructLevel = runtime.na
        rejBuyLevel = 0

if barstate.isconfirmed and rejSellLevel == 1 and not runtime.na(rejSellBar) and runtime.bar_index > rejSellBar:
    if sellFollowThrough:
        rejSellLevel = 2
    else:
        rejSellBar = runtime.na
        rejSellHigh = runtime.na
        rejSellLow = runtime.na
        rejSellClose = runtime.na
        rejSellStructLevel = runtime.na
        rejSellLevel = 0

if rejBuyLevel >= 2 and not runtime.na(rejBuyHigh) and barstate.isconfirmed and runtime.close > rejBuyHigh:
    rejBuyLevel = runtime.math_max(rejBuyLevel, 3)

if rejSellLevel >= 2 and not runtime.na(rejSellLow) and barstate.isconfirmed and runtime.close < rejSellLow:
    rejSellLevel = runtime.math_max(rejSellLevel, 3)

buyStructureShift =
     rejBuyLevel >= 2 and barstate.isconfirmed and
     ((not runtime.na(rejBuyStructLevel) and runtime.close > rejBuyStructLevel) or bullishChochConfirmed)

sellStructureShift =
     rejSellLevel >= 2 and barstate.isconfirmed and
     ((not runtime.na(rejSellStructLevel) and runtime.close < rejSellStructLevel) or bearishChochConfirmed)

if buyStructureShift:
    rejBuyLevel = 4
if sellStructureShift:
    rejSellLevel = 4

if 'rejLastBuySignalZoneTime' not in locals(): rejLastBuySignalZoneTime = runtime.na
if 'rejLastSellSignalZoneTime' not in locals(): rejLastSellSignalZoneTime = runtime.na

//=============================================================================
// V20.5 LIVE STATE RESET
// Historical chart logic can still render normally, but ACTIVE trade/card
// memory is rebuilt only from the recent window. This prevents an ancient
// historical BUY/SELL from appearing as a current live trade after reload.
//=============================================================================
sfaLiveRebuildHours = 48
sfaLiveRebuildMs = sfaLiveRebuildHours * 60 * 60 * 1000
sfaInLiveRebuildWindow = runtime.time >= timenow - sfaLiveRebuildMs
sfaLiveStateResetBar =
     sfaInLiveRebuildWindow and
     (runtime.bar_index == 0 or not sfaInLiveRebuildWindow[1])

// Reset raw-confirmation de-dup memory exactly at the recent-window boundary.
if sfaLiveStateResetBar:
    rejLastBuySignalZoneTime = runtime.na
    rejLastSellSignalZoneTime = runtime.na
    rejBuyLevel = 0
    rejSellLevel = 0

rejBuySignalRaw = buyFollowThrough
rejSellSignalRaw = sellFollowThrough

rejBuySignal =
     rejBuySignalRaw and
     (not rejectOneTradePerConfirm or runtime.na(rejLastBuySignalZoneTime) or mapBuyTime != rejLastBuySignalZoneTime)

rejSellSignal =
     rejSellSignalRaw and
     (not rejectOneTradePerConfirm or runtime.na(rejLastSellSignalZoneTime) or mapSellTime != rejLastSellSignalZoneTime)

// Raw L2 confirmations are internal.
// Lock the zone so the same zone cannot keep firing confirmation events.
if rejBuySignal:
    rejLastBuySignalZoneTime = mapBuyTime

if rejSellSignal:
    rejLastSellSignalZoneTime = mapSellTime

//=============================================================================
// SIMPLE REAL TRADE STATE
// A zone touch alone NEVER reverses the current trade.
// Only the opposite confirmed ⚡ reverses it.
//=============================================================================
if 'rejTradeDir' not in locals(): rejTradeDir = 0
if 'rejTradeEntry' not in locals(): rejTradeEntry = runtime.na
if 'rejTradeStop' not in locals(): rejTradeStop = runtime.na
if 'rejTradeZoneInvalid' not in locals(): rejTradeZoneInvalid = runtime.na
if 'rejTradeEntryBar' not in locals(): rejTradeEntryBar = runtime.na
if 'rejTradeEntryTime' not in locals(): rejTradeEntryTime = runtime.na
if 'rejTradeBeLocked' not in locals(): rejTradeBeLocked = false
if 'rejTradeCycle' not in locals(): rejTradeCycle = 0
if 'rejTradeLastExit' not in locals(): rejTradeLastExit = "--"
if 'rejLastAlertBar' not in locals(): rejLastAlertBar = runtime.na

// Dedicated decision memory. Kept separate from the active trade so the
// dashboard can still show the last exit after a new opposite trade begins.
if 'decisionLastExitTime' not in locals(): decisionLastExitTime = runtime.na
if 'decisionLastExitPrice' not in locals(): decisionLastExitPrice = runtime.na
if 'decisionLastExitDir' not in locals(): decisionLastExitDir = 0
if 'decisionLastExitReason' not in locals(): decisionLastExitReason = "--"

// Last accepted REAL L2 signal. This remains visible even after the trade
// later closes, so members can distinguish "last signal" from "current setup".
if 'rejLastSignalDir' not in locals(): rejLastSignalDir = 0
if 'rejLastSignalEntry' not in locals(): rejLastSignalEntry = runtime.na
if 'rejLastSignalTime' not in locals(): rejLastSignalTime = runtime.na
if 'rejLastSignalKind' not in locals(): rejLastSignalKind = "--"

//-----------------------------------------------------------------------------
// V20.2 CARD-ONLY MAJOR TARGET SELECTOR
// Target must be completely on the correct side of Entry.
// Priority: 1H/4H/D1 -> 30M/15M -> 5M/1M fallback.
//-----------------------------------------------------------------------------
f_cardMajorSellTarget(float entry) =>
outTop = runtime.na
outBot = runtime.na
outTf = "--"
best = 1e20

    // Tier 1: major HTF SELL zones above BUY entry.
    if not runtime.na(h1SellTop) and not runtime.na(h1SellBot) and h1SellBot > entry:
d = h1SellBot - entry
        if d < best:
            best = d
            outTop = h1SellTop
            outBot = h1SellBot
            outTf = "1H"

    if not runtime.na(h4SellTop) and not runtime.na(h4SellBot) and h4SellBot > entry:
d = h4SellBot - entry
        if d < best:
            best = d
            outTop = h4SellTop
            outBot = h4SellBot
            outTf = "4H"

    if not runtime.na(d1SellTop) and not runtime.na(d1SellBot) and d1SellBot > entry:
d = d1SellBot - entry
        if d < best:
            best = d
            outTop = d1SellTop
            outBot = d1SellBot
            outTf = "D1"

    // Tier 2: middle TF only if no major HTF target exists.
    if runtime.na(outTop):
        best = 1e20

        if not runtime.na(m30SellTop) and not runtime.na(m30SellBot) and m30SellBot > entry:
d = m30SellBot - entry
            if d < best:
                best = d
                outTop = m30SellTop
                outBot = m30SellBot
                outTf = "30M"

        if not runtime.na(m15SellTop) and not runtime.na(m15SellBot) and m15SellBot > entry:
d = m15SellBot - entry
            if d < best:
                best = d
                outTop = m15SellTop
                outBot = m15SellBot
                outTf = "15M"

    // V20.3: no 5M / 1M target fallback.
    // Small live/confluence zones are ignored for active trade targets.

    [outTop, outBot, outTf]

f_cardMajorBuyTarget(float entry) =>
outTop = runtime.na
outBot = runtime.na
outTf = "--"
best = 1e20

    // Tier 1: major HTF BUY zones below SELL entry.
    if not runtime.na(h1BuyTop) and not runtime.na(h1BuyBot) and h1BuyTop < entry:
d = entry - h1BuyTop
        if d < best:
            best = d
            outTop = h1BuyTop
            outBot = h1BuyBot
            outTf = "1H"

    if not runtime.na(h4BuyTop) and not runtime.na(h4BuyBot) and h4BuyTop < entry:
d = entry - h4BuyTop
        if d < best:
            best = d
            outTop = h4BuyTop
            outBot = h4BuyBot
            outTf = "4H"

    if not runtime.na(d1BuyTop) and not runtime.na(d1BuyBot) and d1BuyTop < entry:
d = entry - d1BuyTop
        if d < best:
            best = d
            outTop = d1BuyTop
            outBot = d1BuyBot
            outTf = "D1"

    // Tier 2: middle TF only if no major HTF target exists.
    if runtime.na(outTop):
        best = 1e20

        if not runtime.na(m30BuyTop) and not runtime.na(m30BuyBot) and m30BuyTop < entry:
d = entry - m30BuyTop
            if d < best:
                best = d
                outTop = m30BuyTop
                outBot = m30BuyBot
                outTf = "30M"

        if not runtime.na(m15BuyTop) and not runtime.na(m15BuyBot) and m15BuyTop < entry:
d = entry - m15BuyTop
            if d < best:
                best = d
                outTop = m15BuyTop
                outBot = m15BuyBot
                outTf = "15M"

    // V20.3: no 5M / 1M target fallback.
    // Small live/confluence zones are ignored for active trade targets.

    [outTop, outBot, outTf]

//-----------------------------------------------------------------------------
// V20.4 STEP-ZONE SELECTOR
// 1M / 5M opposite zones are sequential checkpoints before the major target.
//-----------------------------------------------------------------------------
f_cardStepSellTarget(float reference, float majorNear) =>
outTop = runtime.na
outBot = runtime.na
outTf = "--"
best = 1e20

    if not runtime.na(m1SellTop) and not runtime.na(m1SellBot) and:
       m1SellBot > reference and
       (runtime.na(majorNear) or m1SellBot < majorNear)
d = m1SellBot - reference
        if d < best:
            best = d
            outTop = m1SellTop
            outBot = m1SellBot
            outTf = "1M"

    if not runtime.na(m5SellTop) and not runtime.na(m5SellBot) and:
       m5SellBot > reference and
       (runtime.na(majorNear) or m5SellBot < majorNear)
d = m5SellBot - reference
        if d < best:
            best = d
            outTop = m5SellTop
            outBot = m5SellBot
            outTf = "5M"

    [outTop, outBot, outTf]

f_cardStepBuyTarget(float reference, float majorNear) =>
outTop = runtime.na
outBot = runtime.na
outTf = "--"
best = 1e20

    if not runtime.na(m1BuyTop) and not runtime.na(m1BuyBot) and:
       m1BuyTop < reference and
       (runtime.na(majorNear) or m1BuyTop > majorNear)
d = reference - m1BuyTop
        if d < best:
            best = d
            outTop = m1BuyTop
            outBot = m1BuyBot
            outTf = "1M"

    if not runtime.na(m5BuyTop) and not runtime.na(m5BuyBot) and:
       m5BuyTop < reference and
       (runtime.na(majorNear) or m5BuyTop > majorNear)
d = reference - m5BuyTop
        if d < best:
            best = d
            outTop = m5BuyTop
            outBot = m5BuyBot
            outTf = "5M"

    [outTop, outBot, outTf]

// V20 DISPLAY-ONLY origin-zone snapshot.
if 'cardOriginTop' not in locals(): cardOriginTop = runtime.na
if 'cardOriginBot' not in locals(): cardOriginBot = runtime.na
if 'cardOriginTf' not in locals(): cardOriginTf = "--"

// V20.1 DISPLAY-ONLY fixed target snapshot.
// The Card keeps this opposite zone fixed for the active setup and ignores
// newer/smaller live zones until a new real trade/reversal is accepted.
if 'cardTargetTop' not in locals(): cardTargetTop = runtime.na
if 'cardTargetBot' not in locals(): cardTargetBot = runtime.na
if 'cardTargetTf' not in locals(): cardTargetTf = "--"
if 'cardLockedDir' not in locals(): cardLockedDir = 0
if 'cardTargetReached' not in locals(): cardTargetReached = false
if 'cardTargetReachedBar' not in locals(): cardTargetReachedBar = runtime.na
if 'cardSearchReference' not in locals(): cardSearchReference = runtime.na

// V20.4 small checkpoint state.
if 'cardStepTop' not in locals(): cardStepTop = runtime.na
if 'cardStepBot' not in locals(): cardStepBot = runtime.na
if 'cardStepTf' not in locals(): cardStepTf = "--"
if 'cardStepDir' not in locals(): cardStepDir = 0
if 'cardStepSearchReference' not in locals(): cardStepSearchReference = runtime.na
if 'cardStepReached' not in locals(): cardStepReached = false

// True when the currently armed decision is a small 1M/5M checkpoint.
if 'cardDecisionIsStep' not in locals(): cardDecisionIsStep = false

// Most recently broken opposite checkpoint (STEP or MAJOR).
// BREAK keeps the same signal active. A later full cross back through this
// broken zone is treated as a confirmed failed-break reversal.
if 'cardBrokenWatchDir' not in locals(): cardBrokenWatchDir = 0
if 'cardBrokenWatchTop' not in locals(): cardBrokenWatchTop = runtime.na
if 'cardBrokenWatchBot' not in locals(): cardBrokenWatchBot = runtime.na
if 'cardBrokenWatchTf' not in locals(): cardBrokenWatchTf = "--"

f_rejStop(int dir, float entry) =>
stop = runtime.na
    if slDisplayMode == "Zone":
        stop = dir == 1 ? mapBuyBot - rejAtr * slZoneBufferDisplay :
             mapSellTop + rejAtr * slZoneBufferDisplay
    elif slDisplayMode == "ATR":
        stop = dir == 1 ? entry - rejAtr * slAtrMultDisplay :
             entry + rejAtr * slAtrMultDisplay
    elif slDisplayMode == "Custom Points":
dist = slCustomPointsDisplay * runtime.syminfo.mintick
        stop = dir == 1 ? entry - dist : entry + dist
    stop

// Real trade-space check.
// BUY needs room to the next SELL zone.
// SELL needs room to the next BUY zone.
buyCandidateInvalid = mapBuyBot
buyCandidateTarget = mapSellBot
buyCandidateRisk = runtime.na(buyCandidateInvalid) ? runtime.na : runtime.math_abs(runtime.close - buyCandidateInvalid)
buyCandidateReward =
     runtime.na(buyCandidateTarget) or buyCandidateTarget <= runtime.close ? runtime.na :
     buyCandidateTarget - runtime.close
buyCandidateRR =
     runtime.na(buyCandidateRisk) or buyCandidateRisk <= 0 or runtime.na(buyCandidateReward) ? runtime.na :
     buyCandidateReward / buyCandidateRisk
buySpaceOk = not runtime.na(buyCandidateRR) and buyCandidateRR >= minRoomRR

sellCandidateInvalid = mapSellTop
sellCandidateTarget = mapBuyTop
sellCandidateRisk = runtime.na(sellCandidateInvalid) ? runtime.na : runtime.math_abs(sellCandidateInvalid - runtime.close)
sellCandidateReward =
     runtime.na(sellCandidateTarget) or sellCandidateTarget >= runtime.close ? runtime.na :
     runtime.close - sellCandidateTarget
sellCandidateRR =
     runtime.na(sellCandidateRisk) or sellCandidateRisk <= 0 or runtime.na(sellCandidateReward) ? runtime.na :
     sellCandidateReward / sellCandidateRisk
sellSpaceOk = not runtime.na(sellCandidateRR) and sellCandidateRR >= minRoomRR

if 'rejNoTradeDir' not in locals(): rejNoTradeDir = 0
if 'rejNoTradeReason' not in locals(): rejNoTradeReason = "--"
if 'rejNoTradeRR' not in locals(): rejNoTradeRR = runtime.na

// V20.5 CORE LIVE RESET.
// Wipe all ancient active-trade / Card memory before the first recent bar is
// allowed to build a new current setup.
if sfaLiveStateResetBar:
    rejTradeDir = 0
    rejTradeEntry = runtime.na
    rejTradeStop = runtime.na
    rejTradeZoneInvalid = runtime.na
    rejTradeEntryBar = runtime.na
    rejTradeEntryTime = runtime.na
    rejTradeBeLocked = false
    rejTradeCycle = 0
    rejTradeLastExit = "--"
    rejLastAlertBar = runtime.na

    decisionLastExitTime = runtime.na
    decisionLastExitPrice = runtime.na
    decisionLastExitDir = 0
    decisionLastExitReason = "--"

    rejLastSignalDir = 0
    rejLastSignalEntry = runtime.na
    rejLastSignalTime = runtime.na
    rejLastSignalKind = "--"

    cardOriginTop = runtime.na
    cardOriginBot = runtime.na
    cardOriginTf = "--"

    cardTargetTop = runtime.na
    cardTargetBot = runtime.na
    cardTargetTf = "--"
    cardLockedDir = 0
    cardTargetReached = false
    cardTargetReachedBar = runtime.na
    cardSearchReference = runtime.na

    cardStepTop = runtime.na
    cardStepBot = runtime.na
    cardStepTf = "--"
    cardStepDir = 0
    cardStepSearchReference = runtime.na
    cardStepReached = false
    cardDecisionIsStep = false

    cardBrokenWatchDir = 0
    cardBrokenWatchTop = runtime.na
    cardBrokenWatchBot = runtime.na
    cardBrokenWatchTf = "--"

    rejNoTradeDir = 0
    rejNoTradeReason = "--"
    rejNoTradeRR = runtime.na

// Capture direction AFTER any V20.5 live reset.
rejTradeDirBefore = rejTradeDir

//=============================================================================
// V16.6 SIMPLE REACH / REJECT / BREAK ENGINE
//=============================================================================

// Exact visible primary boxes members see.
decisionVisibleBuyTouch =
     not runtime.na(marketBuyVisualTop) and not runtime.na(marketBuyVisualBot) and
     runtime.high >= marketBuyVisualBot and runtime.low <= marketBuyVisualTop

decisionVisibleSellTouch =
     not runtime.na(marketSellVisualTop) and not runtime.na(marketSellVisualBot) and
     runtime.high >= marketSellVisualBot and runtime.low <= marketSellVisualTop

// ------------------------------------------------------------------
// OPPOSITE ZONE CONFLICT / CONFLUENCE FILTER
// If BUY and SELL boxes overlap, or the gap between them is very small,
// they become ONE combined cluster. Decision is made only outside the
// entire combined area.
// ------------------------------------------------------------------
decisionBothBoxesReady =
     not runtime.na(marketBuyVisualTop) and not runtime.na(marketBuyVisualBot) and
     not runtime.na(marketSellVisualTop) and not runtime.na(marketSellVisualBot)

decisionBoxesOverlap =
     decisionBothBoxesReady and
     runtime.math_max(marketBuyVisualBot, marketSellVisualBot) <=
     runtime.math_min(marketBuyVisualTop, marketSellVisualTop)

decisionOppositeGap =
     not decisionBothBoxesReady ? runtime.na :
     decisionBoxesOverlap ? 0.0 :
     marketSellVisualBot > marketBuyVisualTop ?
          marketSellVisualBot - marketBuyVisualTop :
     marketBuyVisualBot > marketSellVisualTop ?
          marketBuyVisualBot - marketSellVisualTop :
     0.0

decisionZoneConflict =
     conflictFilterEnabled and decisionBothBoxesReady and
     (decisionBoxesOverlap or decisionOppositeGap <= mapAtrNow * conflictGapAtr)

decisionConflictTop =
     decisionZoneConflict ? runtime.math_max(marketBuyVisualTop, marketSellVisualTop) : runtime.na

decisionConflictBot =
     decisionZoneConflict ? runtime.math_min(marketBuyVisualBot, marketSellVisualBot) : runtime.na

decisionConflictTouch =
     decisionZoneConflict and
     runtime.high >= decisionConflictBot and runtime.low <= decisionConflictTop

// Visual highlight: one gold neutral band across the complete cluster.
if 'decisionConflictBox' not in locals(): decisionConflictBox = runtime.na

if runtime.barstate_islast:
    if showConflictHighlight and decisionZoneConflict and:
       not runtime.na(decisionConflictTop) and not runtime.na(decisionConflictBot)
        if runtime.na(decisionConflictBox):
            decisionConflictBox = runtime.box_new(
                 runtime.bar_index, decisionConflictTop,
                 runtime.bar_index + 1, decisionConflictBot,
                 xloc=xloc.runtime.bar_index, extend="right",
                 bgcolor=runtime.color_new(gold, 88),
                 border_color=runtime.color_new(gold, 25),
                 border_width=1,
                 text="⚠ BUY / SELL CONFLICT • WAIT OUTSIDE",
                 text_color=gold,
                 text_size="tiny",
                 text_halign=text.align_center,
                 text_valign=text.align_center)
        else:
            runtime.box_set_lefttop(decisionConflictBox, runtime.bar_index, decisionConflictTop)
            runtime.box_set_rightbottom(decisionConflictBox, runtime.bar_index + 1, decisionConflictBot)
            runtime.box_set_bgcolor(decisionConflictBox, runtime.color_new(gold, 88))
            runtime.box_set_border_color(decisionConflictBox, runtime.color_new(gold, 25))
            runtime.box_set_text(decisionConflictBox, "⚠ BUY / SELL CONFLICT • WAIT OUTSIDE")
    else:
        if not runtime.na(decisionConflictBox):
            runtime.box_delete(decisionConflictBox)
            decisionConflictBox = runtime.na

f_fullyAbove(float zoneTop) =>
    outsideConfirmMode == "Full Candle" ? runtime.low > zoneTop :
     outsideConfirmMode == "Body" ? runtime.math_min(runtime.open, runtime.close) > zoneTop :
     runtime.close > zoneTop

f_fullyBelow(float zoneBot) =>
    outsideConfirmMode == "Full Candle" ? runtime.high < zoneBot :
     outsideConfirmMode == "Body" ? runtime.math_max(runtime.open, runtime.close) < zoneBot :
     runtime.close < zoneBot

// ------------------------------------------------------------------
// IDLE ORIGIN ZONE
// ------------------------------------------------------------------
if 'decisionBuyTouchBar' not in locals(): decisionBuyTouchBar = runtime.na
if 'decisionBuyTouchTime' not in locals(): decisionBuyTouchTime = runtime.na
if 'decisionBuyTouchTop' not in locals(): decisionBuyTouchTop = runtime.na
if 'decisionBuyTouchBot' not in locals(): decisionBuyTouchBot = runtime.na

if 'decisionSellTouchBar' not in locals(): decisionSellTouchBar = runtime.na
if 'decisionSellTouchTime' not in locals(): decisionSellTouchTime = runtime.na
if 'decisionSellTouchTop' not in locals(): decisionSellTouchTop = runtime.na
if 'decisionSellTouchBot' not in locals(): decisionSellTouchBot = runtime.na

// ------------------------------------------------------------------
// ACTIVE OPPOSITE-ZONE DECISION SNAPSHOT
// This is EMPTY while travelling. It locks only at actual zone reach.
// ------------------------------------------------------------------
if 'decisionTargetSide' not in locals(): decisionTargetSide = 0       // 1 BUY zone, -1 SELL zone
if 'decisionTargetTop' not in locals(): decisionTargetTop = runtime.na
if 'decisionTargetBot' not in locals(): decisionTargetBot = runtime.na
if 'decisionTargetTime' not in locals(): decisionTargetTime = runtime.na
if 'decisionTargetTF' not in locals(): decisionTargetTF = "--"
if 'decisionTargetTouched' not in locals(): decisionTargetTouched = false
if 'decisionTargetTouchBar' not in locals(): decisionTargetTouchBar = runtime.na
if 'decisionLastBrokenTargetTime' not in locals(): decisionLastBrokenTargetTime = runtime.na
if 'decisionLastBrokenTargetSide' not in locals(): decisionLastBrokenTargetSide = 0

// Conflict target identity so the same overlapping cluster cannot fire
// repeatedly after a confirmed break.
if 'decisionLastConflictBuyTime' not in locals(): decisionLastConflictBuyTime = runtime.na
if 'decisionLastConflictSellTime' not in locals(): decisionLastConflictSellTime = runtime.na
if 'decisionTargetIsConflict' not in locals(): decisionTargetIsConflict = false

if 'decisionTargetLastEvent' not in locals(): decisionTargetLastEvent = "WAIT"

if 'decisionLastEntryLabel' not in locals(): decisionLastEntryLabel = runtime.na
if 'decisionLastExitLabel' not in locals(): decisionLastExitLabel = runtime.na
if 'decisionLastExitLabelBar' not in locals(): decisionLastExitLabelBar = runtime.na
if 'decisionLastTargetLabel' not in locals(): decisionLastTargetLabel = runtime.na
if 'decisionOriginWatchLabel' not in locals(): decisionOriginWatchLabel = runtime.na

// V20.5 DECISION-MEMORY RESET.
// Old touch/target snapshots must not survive into the live rebuild window.
if sfaLiveStateResetBar:
    decisionBuyTouchBar = runtime.na
    decisionBuyTouchTime = runtime.na
    decisionBuyTouchTop = runtime.na
    decisionBuyTouchBot = runtime.na

    decisionSellTouchBar = runtime.na
    decisionSellTouchTime = runtime.na
    decisionSellTouchTop = runtime.na
    decisionSellTouchBot = runtime.na

    decisionTargetSide = 0
    decisionTargetTop = runtime.na
    decisionTargetBot = runtime.na
    decisionTargetTime = runtime.na
    decisionTargetTF = "--"
    decisionTargetTouched = false
    decisionTargetTouchBar = runtime.na
    decisionLastBrokenTargetTime = runtime.na
    decisionLastBrokenTargetSide = 0
    decisionLastConflictBuyTime = runtime.na
    decisionLastConflictSellTime = runtime.na
    decisionTargetIsConflict = false
    decisionTargetLastEvent = "LIVE RESET • WAIT CURRENT ZONE"

    // A stale yellow WATCH label is the only historical decision object we
    // actively remove. Entry/exit history can remain visible on the chart.
    if not runtime.na(decisionOriginWatchLabel):
        runtime.label_delete(decisionOriginWatchLabel)
        decisionOriginWatchLabel = runtime.na

    if not runtime.na(decisionLastExitLabel):
        runtime.label_delete(decisionLastExitLabel)
        decisionLastExitLabel = runtime.na
        decisionLastExitLabelBar = runtime.na

// ------------------------------------------------------------------
// V20.6 ACTIVE INVALIDATION / AT-RISK
// Intrabar cross = warning only. Confirmed runtime.close beyond invalidation = stop
// the active setup and require a fresh zone touch + confirmation.
// ------------------------------------------------------------------
buyTradeAtRisk =
     rejTradeDir == 1 and not runtime.na(rejTradeZoneInvalid) and
     runtime.low < rejTradeZoneInvalid

sellTradeAtRisk =
     rejTradeDir == -1 and not runtime.na(rejTradeZoneInvalid) and
     runtime.high > rejTradeZoneInvalid

buyTradeInvalidated =
     rejTradeDir == 1 and not runtime.na(rejTradeZoneInvalid) and
     barstate.isconfirmed and runtime.close < rejTradeZoneInvalid

sellTradeInvalidated =
     rejTradeDir == -1 and not runtime.na(rejTradeZoneInvalid) and
     barstate.isconfirmed and runtime.close > rejTradeZoneInvalid

tradeInvalidatedEvent = buyTradeInvalidated or sellTradeInvalidated

if tradeInvalidatedEvent:
invalidDir = rejTradeDir

    decisionLastExitTime = runtime.time
    decisionLastExitPrice = runtime.close
    decisionLastExitDir = invalidDir
    decisionLastExitReason =
         invalidDir == 1 ? "BUY INVALIDATED • CLOSED BELOW ORIGIN ZONE" :
         "SELL INVALIDATED • CLOSED ABOVE ORIGIN ZONE"

    rejTradeLastExit = decisionLastExitReason

    rejTradeDir = 0
    rejTradeEntry = runtime.na
    rejTradeStop = runtime.na
    rejTradeZoneInvalid = runtime.na
    rejTradeEntryBar = runtime.na
    rejTradeEntryTime = runtime.na
    rejTradeBeLocked = false
    rejLastAlertBar = runtime.na

    cardOriginTop = runtime.na
    cardOriginBot = runtime.na
    cardOriginTf = "--"

    cardTargetTop = runtime.na
    cardTargetBot = runtime.na
    cardTargetTf = "--"
    cardLockedDir = 0
    cardTargetReached = false
    cardTargetReachedBar = runtime.na
    cardSearchReference = runtime.na

    cardStepTop = runtime.na
    cardStepBot = runtime.na
    cardStepTf = "--"
    cardStepDir = 0
    cardStepSearchReference = runtime.na
    cardStepReached = false
    cardDecisionIsStep = false

    cardBrokenWatchDir = 0
    cardBrokenWatchTop = runtime.na
    cardBrokenWatchBot = runtime.na
    cardBrokenWatchTf = "--"

    decisionTargetSide = 0
    decisionTargetTop = runtime.na
    decisionTargetBot = runtime.na
    decisionTargetTime = runtime.na
    decisionTargetTF = "--"
    decisionTargetTouched = false
    decisionTargetTouchBar = runtime.na
    decisionTargetIsConflict = false
    decisionTargetLastEvent = decisionLastExitReason

    decisionBuyTouchBar = runtime.na
    decisionBuyTouchTime = runtime.na
    decisionBuyTouchTop = runtime.na
    decisionBuyTouchBot = runtime.na

    decisionSellTouchBar = runtime.na
    decisionSellTouchTime = runtime.na
    decisionSellTouchTop = runtime.na
    decisionSellTouchBot = runtime.na

    if not runtime.na(decisionOriginWatchLabel):
        runtime.label_delete(decisionOriginWatchLabel)
        decisionOriginWatchLabel = runtime.na

    if decisionHistoryOpt == "Latest Only" and not runtime.na(decisionLastExitLabel):
        runtime.label_delete(decisionLastExitLabel)

    decisionLastExitLabel = runtime.label_new(
         runtime.bar_index,
         invalidDir == 1 ? runtime.high + signalMarkerGap * 0.55 : runtime.low - signalMarkerGap * 0.55,
         invalidDir == 1 ? "BUY INVALID ✕\nWAIT ZONE" :
                           "SELL INVALID ✕\nWAIT ZONE",
         xloc=xloc.runtime.bar_index,
         yloc="price",
         style=invalidDir == 1 ? "label_down" : "label_up",
         color=runtime.color_rgb(111, 20, 35),
         textcolor=runtime.color_rgb(245, 247, 250),
         size=f_decisionLabelSize())
    decisionLastExitLabelBar = runtime.bar_index

// ------------------------------------------------------------------
// V20.8 TEMPORARY MANAGEMENT-LABEL CLEANUP
// INVALIDATED is an event warning, not permanent chart history.
// ------------------------------------------------------------------
tempExitLabelExpired =
     not runtime.na(decisionLastExitLabel) and
     not runtime.na(decisionLastExitLabelBar) and
     runtime.bar_index - decisionLastExitLabelBar >= 4

if tempExitLabelExpired:
    runtime.label_delete(decisionLastExitLabel)
    decisionLastExitLabel = runtime.na
    decisionLastExitLabelBar = runtime.na

// ------------------------------------------------------------------
// IDLE: lock exact visible box when price first reaches it.
// ------------------------------------------------------------------
if rejTradeDirBefore == 0 and runtime.na(decisionBuyTouchBar) and decisionVisibleBuyTouch:
    decisionBuyTouchBar = runtime.bar_index
    decisionBuyTouchTime = buyDisplayTime
    decisionBuyTouchTop = marketBuyVisualTop
    decisionBuyTouchBot = marketBuyVisualBot

if rejTradeDirBefore == 0 and runtime.na(decisionSellTouchBar) and decisionVisibleSellTouch:
    decisionSellTouchBar = runtime.bar_index
    decisionSellTouchTime = sellDisplayTime
    decisionSellTouchTop = marketSellVisualTop
    decisionSellTouchBot = marketSellVisualBot

newBuyOriginLock =
     rejTradeDirBefore == 0 and
     not runtime.na(decisionBuyTouchBar) and decisionBuyTouchBar == runtime.bar_index

newSellOriginLock =
     rejTradeDirBefore == 0 and
     not runtime.na(decisionSellTouchBar) and decisionSellTouchBar == runtime.bar_index

if (newBuyOriginLock or newSellOriginLock) and not runtime.na(decisionLastExitLabel):
    runtime.label_delete(decisionLastExitLabel)
    decisionLastExitLabel = runtime.na
    decisionLastExitLabelBar = runtime.na

if showOriginWatchLabel and (newBuyOriginLock or newSellOriginLock):
    if not runtime.na(decisionOriginWatchLabel):
        runtime.label_delete(decisionOriginWatchLabel)
    decisionOriginWatchLabel = runtime.label_new(
         runtime.bar_index,
         newBuyOriginLock ? runtime.low - signalMarkerGap * 0.35 : runtime.high + signalMarkerGap * 0.35,
         newBuyOriginLock ? "BUY ZONE TOUCHED • WAIT CLOSE" : "SELL ZONE TOUCHED • WAIT CLOSE",
         xloc=xloc.runtime.bar_index,
         yloc="price",
         style=newBuyOriginLock ? "label_up" : "label_down",
         color=runtime.color_rgb(255, 199, 64),
         textcolor=darkBg,
         size="tiny")

idleBuyArmed =
     rejTradeDirBefore == 0 and
     not runtime.na(decisionBuyTouchTop) and not runtime.na(decisionBuyTouchBot)

idleSellArmed =
     rejTradeDirBefore == 0 and
     not runtime.na(decisionSellTouchTop) and not runtime.na(decisionSellTouchBot)

// First 100%-outside candle after zone was reached.
initialBuyEntryEvent =
     barstate.isconfirmed and idleBuyArmed and
     f_fullyAbove(decisionBuyTouchTop)

initialSellEntryEvent =
     barstate.isconfirmed and idleSellArmed and
     f_fullyBelow(decisionSellTouchBot)

// Wrong-way full break cancels the idle setup.
idleBuyWrongWayBreak =
     barstate.isconfirmed and idleBuyArmed and
     f_fullyBelow(decisionBuyTouchBot)

idleSellWrongWayBreak =
     barstate.isconfirmed and idleSellArmed and
     f_fullyAbove(decisionSellTouchTop)

if idleBuyWrongWayBreak and not initialBuyEntryEvent:
    if not runtime.na(decisionOriginWatchLabel):
        runtime.label_delete(decisionOriginWatchLabel)
        decisionOriginWatchLabel = runtime.na
    decisionBuyTouchBar = runtime.na
    decisionBuyTouchTime = runtime.na
    decisionBuyTouchTop = runtime.na
    decisionBuyTouchBot = runtime.na

if idleSellWrongWayBreak and not initialSellEntryEvent:
    if not runtime.na(decisionOriginWatchLabel):
        runtime.label_delete(decisionOriginWatchLabel)
        decisionOriginWatchLabel = runtime.na
    decisionSellTouchBar = runtime.na
    decisionSellTouchTime = runtime.na
    decisionSellTouchTop = runtime.na
    decisionSellTouchBot = runtime.na

// ------------------------------------------------------------------
// V20.4 ACTIVE TRADE — STEP FIRST, MAJOR DESTINATION SECOND.
//
// BUY: nearest 1M/5M SELL step -> next step -> major SELL zone.
// SELL: nearest 1M/5M BUY step -> next step -> major BUY zone.
//
// At every checkpoint:
// REJECT = reverse.
// BREAK = keep same active signal and move to next checkpoint.
// ------------------------------------------------------------------

if rejTradeDirBefore == 1 and cardLockedDir == 1 and runtime.na(cardTargetTop) and not runtime.na(cardSearchReference):
    [retrySellTop, retrySellBot, retrySellTf] = f_cardMajorSellTarget(cardSearchReference)
    if not runtime.na(retrySellTop):
        cardTargetTop = retrySellTop
        cardTargetBot = retrySellBot
        cardTargetTf = retrySellTf
        cardTargetReached = false
        cardTargetReachedBar = runtime.na

if rejTradeDirBefore == -1 and cardLockedDir == -1 and runtime.na(cardTargetTop) and not runtime.na(cardSearchReference):
    [retryBuyTop, retryBuyBot, retryBuyTf] = f_cardMajorBuyTarget(cardSearchReference)
    if not runtime.na(retryBuyTop):
        cardTargetTop = retryBuyTop
        cardTargetBot = retryBuyBot
        cardTargetTf = retryBuyTf
        cardTargetReached = false
        cardTargetReachedBar = runtime.na

if rejTradeDirBefore == 1 and cardStepDir == 1 and runtime.na(cardStepTop) and not runtime.na(cardStepSearchReference):
    [retryStepSellTop, retryStepSellBot, retryStepSellTf] =
         f_cardStepSellTarget(cardStepSearchReference, cardTargetBot)
    if not runtime.na(retryStepSellTop):
        cardStepTop = retryStepSellTop
        cardStepBot = retryStepSellBot
        cardStepTf = retryStepSellTf
        cardStepReached = false

if rejTradeDirBefore == -1 and cardStepDir == -1 and runtime.na(cardStepTop) and not runtime.na(cardStepSearchReference):
    [retryStepBuyTop, retryStepBuyBot, retryStepBuyTf] =
         f_cardStepBuyTarget(cardStepSearchReference, cardTargetTop)
    if not runtime.na(retryStepBuyTop):
        cardStepTop = retryStepBuyTop
        cardStepBot = retryStepBuyBot
        cardStepTf = retryStepBuyTf
        cardStepReached = false

fixedStepReady =
     rejTradeDirBefore != 0 and
     cardStepDir == rejTradeDirBefore and
     not runtime.na(cardStepTop) and not runtime.na(cardStepBot)

fixedMajorTargetReady =
     rejTradeDirBefore != 0 and
     cardLockedDir == rejTradeDirBefore and
     not runtime.na(cardTargetTop) and not runtime.na(cardTargetBot)

activeCheckpointIsStep = fixedStepReady

activeCheckpointTop =
     activeCheckpointIsStep ? cardStepTop :
     fixedMajorTargetReady ? cardTargetTop : runtime.na

activeCheckpointBot =
     activeCheckpointIsStep ? cardStepBot :
     fixedMajorTargetReady ? cardTargetBot : runtime.na

activeCheckpointTf =
     activeCheckpointIsStep ? cardStepTf :
     fixedMajorTargetReady ? cardTargetTf : "--"

fixedCheckpointTouch =
     not runtime.na(activeCheckpointTop) and not runtime.na(activeCheckpointBot) and
     runtime.high >= activeCheckpointBot and runtime.low <= activeCheckpointTop

canArmConflictDecision = false

canArmBuyDecision =
     rejTradeDirBefore == -1 and
     runtime.na(decisionTargetTop) and
     fixedCheckpointTouch

canArmSellDecision =
     rejTradeDirBefore == 1 and
     runtime.na(decisionTargetTop) and
     fixedCheckpointTouch

newTargetTouchEvent = canArmBuyDecision or canArmSellDecision
newExitWatchEvent = newTargetTouchEvent

if canArmBuyDecision:
    cardDecisionIsStep = activeCheckpointIsStep
    decisionTargetSide = 1
    decisionTargetTop = activeCheckpointTop
    decisionTargetBot = activeCheckpointBot
    decisionTargetTime = runtime.time
    decisionTargetTF = activeCheckpointTf
    decisionTargetTouched = true
    decisionTargetTouchBar = runtime.bar_index
    decisionTargetIsConflict = false

    if cardDecisionIsStep:
        cardStepReached = true
        decisionTargetLastEvent =
             "STEP BUY " + activeCheckpointTf + " REACHED • REJECT OR BREAK?"
    else:
        cardTargetReached = true
        cardTargetReachedBar = runtime.bar_index
        decisionTargetLastEvent =
             "MAJOR BUY " + activeCheckpointTf + " REACHED • REJECT OR BREAK?"

if canArmSellDecision:
    cardDecisionIsStep = activeCheckpointIsStep
    decisionTargetSide = -1
    decisionTargetTop = activeCheckpointTop
    decisionTargetBot = activeCheckpointBot
    decisionTargetTime = runtime.time
    decisionTargetTF = activeCheckpointTf
    decisionTargetTouched = true
    decisionTargetTouchBar = runtime.bar_index
    decisionTargetIsConflict = false

    if cardDecisionIsStep:
        cardStepReached = true
        decisionTargetLastEvent =
             "STEP SELL " + activeCheckpointTf + " REACHED • REJECT OR BREAK?"
    else:
        cardTargetReached = true
        cardTargetReachedBar = runtime.bar_index
        decisionTargetLastEvent =
             "MAJOR SELL " + activeCheckpointTf + " REACHED • REJECT OR BREAK?"

// Fresh-target validity.
// Never allow a target touched many bars ago to reverse the trade later.
decisionTargetAge =
     decisionTargetTouched and not runtime.na(decisionTargetTouchBar) ?
          runtime.bar_index - decisionTargetTouchBar : 0

decisionTargetFresh =
     decisionTargetTouched and not runtime.na(decisionTargetTouchBar) and
     ((rejTradeDirBefore != 0 and cardLockedDir == rejTradeDirBefore) or
      decisionTargetAge <= targetDecisionBars)

// ------------------------------------------------------------------
// DECISION AT OPPOSITE BOX
// SELL reaches BUY:
//   fully ABOVE BUY = BUY rejection -> reverse BUY
//   fully BELOW BUY = BUY break -> SELL continues
// BUY reaches SELL:
//   fully BELOW SELL = SELL rejection -> reverse SELL
//   fully ABOVE SELL = SELL break -> BUY continues
// ------------------------------------------------------------------
sellTargetRejectUp =
     rejTradeDirBefore == -1 and decisionTargetFresh and
     (decisionTargetSide == 1 or decisionTargetIsConflict) and
     barstate.isconfirmed and f_fullyAbove(decisionTargetTop)

sellTargetBreakDown =
     rejTradeDirBefore == -1 and decisionTargetFresh and
     (decisionTargetSide == 1 or decisionTargetIsConflict) and
     barstate.isconfirmed and f_fullyBelow(decisionTargetBot)

buyTargetRejectDown =
     rejTradeDirBefore == 1 and decisionTargetFresh and
     (decisionTargetSide == -1 or decisionTargetIsConflict) and
     barstate.isconfirmed and f_fullyBelow(decisionTargetBot)

buyTargetBreakUp =
     rejTradeDirBefore == 1 and decisionTargetFresh and
     (decisionTargetSide == -1 or decisionTargetIsConflict) and
     barstate.isconfirmed and f_fullyAbove(decisionTargetTop)

buyReversalEvent = sellTargetRejectUp
sellReversalEvent = buyTargetRejectDown
sellContinueEvent = sellTargetBreakDown
buyContinueEvent = buyTargetBreakUp
decisionContinueEvent = sellContinueEvent or buyContinueEvent

// BUY broke a major SELL zone -> BUY remains active.
// If price later closes fully BELOW that broken SELL zone -> reverse SELL.
brokenSellZoneFailedToSell =
     rejTradeDirBefore == 1 and cardBrokenWatchDir == 1 and
     not runtime.na(cardBrokenWatchBot) and barstate.isconfirmed and
     f_fullyBelow(cardBrokenWatchBot)

// SELL broke a major BUY zone -> SELL remains active.
// If price later closes fully ABOVE that broken BUY zone -> reverse BUY.
brokenBuyZoneFailedToBuy =
     rejTradeDirBefore == -1 and cardBrokenWatchDir == -1 and
     not runtime.na(cardBrokenWatchTop) and barstate.isconfirmed and
     f_fullyAbove(cardBrokenWatchTop)

rejBuyEntryEvent =
     initialBuyEntryEvent or buyReversalEvent or brokenBuyZoneFailedToBuy

rejSellEntryEvent =
     initialSellEntryEvent or sellReversalEvent or brokenSellZoneFailedToSell

decisionTargetExpired =
     decisionTargetTouched and not decisionTargetFresh and
     not rejBuyEntryEvent and not rejSellEntryEvent and
     not decisionContinueEvent

rejNoTradeDir = 0
rejNoTradeReason = "--"
rejNoTradeRR = runtime.na

// ------------------------------------------------------------------
// BUY START / BUY REVERSAL
// ------------------------------------------------------------------
if (rejBuyEntryEvent or rejSellEntryEvent) and not runtime.na(decisionLastExitLabel):
    runtime.label_delete(decisionLastExitLabel)
    decisionLastExitLabel = runtime.na
    decisionLastExitLabelBar = runtime.na

if rejBuyEntryEvent:
    if not runtime.na(decisionOriginWatchLabel):
        runtime.label_delete(decisionOriginWatchLabel)
        decisionOriginWatchLabel = runtime.na

    if rejTradeDirBefore == -1:
        decisionLastExitTime = runtime.time
        decisionLastExitPrice = runtime.close
        decisionLastExitDir = -1
        decisionLastExitReason =
             brokenBuyZoneFailedToBuy ? "BROKEN BUY ZONE RECLAIM" :
             "BUY BOX REJECT"

    rejLastSignalDir = 1
    rejLastSignalEntry = runtime.close
    rejLastSignalTime = runtime.time
    rejLastSignalKind = rejTradeDirBefore == -1 ? "BUY REVERSAL" : "BUY ENTRY"

    rejTradeDir = 1
    rejTradeEntry = runtime.close

    // Display snapshot only — does not affect trade logic.
    cardOriginTop =
         rejTradeDirBefore == -1 ?
              (brokenBuyZoneFailedToBuy ? cardBrokenWatchTop : decisionTargetTop) :
              decisionBuyTouchTop
    cardOriginBot =
         rejTradeDirBefore == -1 ?
              (brokenBuyZoneFailedToBuy ? cardBrokenWatchBot : decisionTargetBot) :
              decisionBuyTouchBot
    cardOriginTf =
         rejTradeDirBefore == -1 ?
              (brokenBuyZoneFailedToBuy ? cardBrokenWatchTf : decisionTargetTF) :
              buyDisplayTF

    // V20.2 Card only: lock the nearest VALID MAJOR SELL zone above Entry.
    // Prefer 1H/4H/D1; small live zones cannot replace it afterwards.
    [majorSellTop, majorSellBot, majorSellTf] = f_cardMajorSellTarget(runtime.close)
    cardTargetTop = majorSellTop
    cardTargetBot = majorSellBot
    cardTargetTf = majorSellTf
    cardLockedDir = 1
    cardTargetReached = false
    cardTargetReachedBar = runtime.na
    cardSearchReference = runtime.close

    cardStepSearchReference = runtime.close
    [firstStepSellTop, firstStepSellBot, firstStepSellTf] =
         f_cardStepSellTarget(cardStepSearchReference, cardTargetBot)
    cardStepTop = firstStepSellTop
    cardStepBot = firstStepSellBot
    cardStepTf = firstStepSellTf
    cardStepDir = 1
    cardStepReached = false
    cardDecisionIsStep = false

    // V21.7 STATE-MEMORY FIX ONLY:
    // Snapshot the exact reversal/origin invalidation BEFORE clearing the
    // broken-zone watch memory. This does not change any Zone signal rule.
buyInvalidSnapshot = runtime.na
    if rejTradeDirBefore == -1:
        if brokenBuyZoneFailedToBuy:
            buyInvalidSnapshot = cardBrokenWatchBot
        else:
            buyInvalidSnapshot = decisionTargetBot
    else:
        buyInvalidSnapshot = decisionBuyTouchBot

    cardBrokenWatchDir = 0
    cardBrokenWatchTop = runtime.na
    cardBrokenWatchBot = runtime.na
    cardBrokenWatchTf = "--"

    rejTradeStop = f_rejStop(1, runtime.close)
    rejTradeZoneInvalid = buyInvalidSnapshot
    rejTradeEntryBar = runtime.bar_index
    rejTradeEntryTime = runtime.time
    rejTradeBeLocked = false
    rejTradeCycle += 1
    rejTradeLastExit = "--"
    rejLastAlertBar = runtime.bar_index

    // Travelling state starts with NO target snapshot.
    decisionTargetSide = 0
    decisionTargetTop = runtime.na
    decisionTargetBot = runtime.na
    decisionTargetTime = runtime.na
    decisionTargetTF = "--"
    decisionTargetTouched = false
    decisionTargetTouchBar = runtime.na
    decisionTargetIsConflict = false
    decisionLastBrokenTargetTime = runtime.na
    decisionLastBrokenTargetSide = 0
    decisionLastConflictBuyTime = runtime.na
    decisionLastConflictSellTime = runtime.na
    decisionTargetLastEvent = "BUY ACTIVE • WAIT SELL BOX"

    rejBuyLevel = runtime.math_max(rejBuyLevel, 2)

    if decisionHistoryOpt == "Latest Only":
        if not runtime.na(decisionLastEntryLabel):
            runtime.label_delete(decisionLastEntryLabel)
        if not runtime.na(decisionLastTargetLabel):
            runtime.label_delete(decisionLastTargetLabel)
            decisionLastTargetLabel = runtime.na

buyDecisionText =
         rejTradeDirBefore == -1 and decisionTargetIsConflict ?
              "BUY REVERSE ↑\nCONFLICT EXIT" :
         rejTradeDirBefore == -1 ?
              "BUY REVERSE ↑" :
              "BUY ENTRY ✓"

    decisionLastEntryLabel = runtime.label_new(
         runtime.bar_index,
         runtime.low - signalMarkerGap,
         showDecisionLabels ? buyDecisionText : "⚡",
         xloc=xloc.runtime.bar_index,
         yloc="price",
         style=showDecisionLabels ? "label_up" : "none",
         color=showDecisionLabels ? runtime.color_rgb(7, 78, 57) : runtime.color_new(bullColor, 100),
         textcolor=showDecisionLabels ? "#ffffff" : bullColor,
         size=showDecisionLabels ? f_decisionLabelSize() : "large")

    decisionBuyTouchBar = runtime.na
    decisionBuyTouchTime = runtime.na
    decisionBuyTouchTop = runtime.na
    decisionBuyTouchBot = runtime.na
    decisionSellTouchBar = runtime.na
    decisionSellTouchTime = runtime.na
    decisionSellTouchTop = runtime.na
    decisionSellTouchBot = runtime.na

// ------------------------------------------------------------------
// SELL START / SELL REVERSAL
// ------------------------------------------------------------------
if rejSellEntryEvent:
    if not runtime.na(decisionOriginWatchLabel):
        runtime.label_delete(decisionOriginWatchLabel)
        decisionOriginWatchLabel = runtime.na

    if rejTradeDirBefore == 1:
        decisionLastExitTime = runtime.time
        decisionLastExitPrice = runtime.close
        decisionLastExitDir = 1
        decisionLastExitReason =
             brokenSellZoneFailedToSell ? "BROKEN SELL ZONE FAILED" :
             "SELL BOX REJECT"

    rejLastSignalDir = -1
    rejLastSignalEntry = runtime.close
    rejLastSignalTime = runtime.time
    rejLastSignalKind = rejTradeDirBefore == 1 ? "SELL REVERSAL" : "SELL ENTRY"

    rejTradeDir = -1
    rejTradeEntry = runtime.close

    // Display snapshot only — does not affect trade logic.
    cardOriginTop =
         rejTradeDirBefore == 1 ?
              (brokenSellZoneFailedToSell ? cardBrokenWatchTop : decisionTargetTop) :
              decisionSellTouchTop
    cardOriginBot =
         rejTradeDirBefore == 1 ?
              (brokenSellZoneFailedToSell ? cardBrokenWatchBot : decisionTargetBot) :
              decisionSellTouchBot
    cardOriginTf =
         rejTradeDirBefore == 1 ?
              (brokenSellZoneFailedToSell ? cardBrokenWatchTf : decisionTargetTF) :
              sellDisplayTF

    // V20.2 Card only: lock the nearest VALID MAJOR BUY zone below Entry.
    // Prefer 1H/4H/D1; small live zones cannot replace it afterwards.
    [majorBuyTop, majorBuyBot, majorBuyTf] = f_cardMajorBuyTarget(runtime.close)
    cardTargetTop = majorBuyTop
    cardTargetBot = majorBuyBot
    cardTargetTf = majorBuyTf
    cardLockedDir = -1
    cardTargetReached = false
    cardTargetReachedBar = runtime.na
    cardSearchReference = runtime.close

    cardStepSearchReference = runtime.close
    [firstStepBuyTop, firstStepBuyBot, firstStepBuyTf] =
         f_cardStepBuyTarget(cardStepSearchReference, cardTargetTop)
    cardStepTop = firstStepBuyTop
    cardStepBot = firstStepBuyBot
    cardStepTf = firstStepBuyTf
    cardStepDir = -1
    cardStepReached = false
    cardDecisionIsStep = false

    // V21.7 STATE-MEMORY FIX ONLY:
    // Snapshot the exact reversal/origin invalidation BEFORE clearing the
    // broken-zone watch memory. This does not change any Zone signal rule.
sellInvalidSnapshot = runtime.na
    if rejTradeDirBefore == 1:
        if brokenSellZoneFailedToSell:
            sellInvalidSnapshot = cardBrokenWatchTop
        else:
            sellInvalidSnapshot = decisionTargetTop
    else:
        sellInvalidSnapshot = decisionSellTouchTop

    cardBrokenWatchDir = 0
    cardBrokenWatchTop = runtime.na
    cardBrokenWatchBot = runtime.na
    cardBrokenWatchTf = "--"

    rejTradeStop = f_rejStop(-1, runtime.close)
    rejTradeZoneInvalid = sellInvalidSnapshot
    rejTradeEntryBar = runtime.bar_index
    rejTradeEntryTime = runtime.time
    rejTradeBeLocked = false
    rejTradeCycle += 1
    rejTradeLastExit = "--"
    rejLastAlertBar = runtime.bar_index

    decisionTargetSide = 0
    decisionTargetTop = runtime.na
    decisionTargetBot = runtime.na
    decisionTargetTime = runtime.na
    decisionTargetTF = "--"
    decisionTargetTouched = false
    decisionTargetTouchBar = runtime.na
    decisionTargetIsConflict = false
    decisionLastBrokenTargetTime = runtime.na
    decisionLastBrokenTargetSide = 0
    decisionLastConflictBuyTime = runtime.na
    decisionLastConflictSellTime = runtime.na
    decisionTargetLastEvent = "SELL ACTIVE • WAIT BUY BOX"

    rejSellLevel = runtime.math_max(rejSellLevel, 2)

    if decisionHistoryOpt == "Latest Only":
        if not runtime.na(decisionLastEntryLabel):
            runtime.label_delete(decisionLastEntryLabel)
        if not runtime.na(decisionLastTargetLabel):
            runtime.label_delete(decisionLastTargetLabel)
            decisionLastTargetLabel = runtime.na

sellDecisionText =
         rejTradeDirBefore == 1 and decisionTargetIsConflict ?
              "SELL REVERSE ↓\nCONFLICT EXIT" :
         rejTradeDirBefore == 1 ?
              "SELL REVERSE ↓" :
              "SELL ENTRY ✓"

    decisionLastEntryLabel = runtime.label_new(
         runtime.bar_index,
         runtime.high + signalMarkerGap,
         showDecisionLabels ? sellDecisionText : "⚡",
         xloc=xloc.runtime.bar_index,
         yloc="price",
         style=showDecisionLabels ? "label_down" : "none",
         color=showDecisionLabels ? runtime.color_rgb(112, 27, 38) : runtime.color_new(bearColor, 100),
         textcolor=showDecisionLabels ? "#ffffff" : bearColor,
         size=showDecisionLabels ? f_decisionLabelSize() : "large")

    decisionBuyTouchBar = runtime.na
    decisionBuyTouchTime = runtime.na
    decisionBuyTouchTop = runtime.na
    decisionBuyTouchBot = runtime.na
    decisionSellTouchBar = runtime.na
    decisionSellTouchTime = runtime.na
    decisionSellTouchTop = runtime.na
    decisionSellTouchBot = runtime.na

// ------------------------------------------------------------------
// V20.4 BREAK = KEEP SAME ACTIVE SIGNAL.
//
// STEP BREAK -> same trade, next 1M/5M checkpoint.
// MAJOR BREAK -> same trade, next major destination + restart step ladder.
// ------------------------------------------------------------------
if decisionContinueEvent:
brokenTop = decisionTargetTop
brokenBot = decisionTargetBot
brokenTf = decisionTargetTF
brokenWasStep = cardDecisionIsStep

    decisionLastBrokenTargetTime = decisionTargetTime
    decisionLastBrokenTargetSide = decisionTargetSide
    decisionLastConflictBuyTime = runtime.na
    decisionLastConflictSellTime = runtime.na

    // Most recently broken checkpoint becomes failed-break reversal watch.
    cardBrokenWatchDir = rejTradeDirBefore
    cardBrokenWatchTop = brokenTop
    cardBrokenWatchBot = brokenBot
    cardBrokenWatchTf = brokenTf

    if buyContinueEvent:
        if brokenWasStep:
            cardStepSearchReference = brokenTop + runtime.syminfo.mintick
            [nextStepSellTop, nextStepSellBot, nextStepSellTf] =
                 f_cardStepSellTarget(cardStepSearchReference, cardTargetBot)
            cardStepTop = nextStepSellTop
            cardStepBot = nextStepSellBot
            cardStepTf = nextStepSellTf
            cardStepDir = 1
            cardStepReached = false
            decisionTargetLastEvent =
                 "STEP SELL " + brokenTf + " BROKE ↑ • BUY CONTINUES"
        else:
            cardSearchReference = brokenTop + runtime.syminfo.mintick
            [nextSellTop, nextSellBot, nextSellTf] =
                 f_cardMajorSellTarget(cardSearchReference)
            cardTargetTop = nextSellTop
            cardTargetBot = nextSellBot
            cardTargetTf = nextSellTf
            cardLockedDir = 1
            cardTargetReached = false
            cardTargetReachedBar = runtime.na

            cardStepSearchReference = brokenTop + runtime.syminfo.mintick
            [newStepSellTop, newStepSellBot, newStepSellTf] =
                 f_cardStepSellTarget(cardStepSearchReference, cardTargetBot)
            cardStepTop = newStepSellTop
            cardStepBot = newStepSellBot
            cardStepTf = newStepSellTf
            cardStepDir = 1
            cardStepReached = false
            decisionTargetLastEvent =
                 "MAJOR SELL " + brokenTf + " BROKE ↑ • BUY CONTINUES"

    if sellContinueEvent:
        if brokenWasStep:
            cardStepSearchReference = brokenBot - runtime.syminfo.mintick
            [nextStepBuyTop, nextStepBuyBot, nextStepBuyTf] =
                 f_cardStepBuyTarget(cardStepSearchReference, cardTargetTop)
            cardStepTop = nextStepBuyTop
            cardStepBot = nextStepBuyBot
            cardStepTf = nextStepBuyTf
            cardStepDir = -1
            cardStepReached = false
            decisionTargetLastEvent =
                 "STEP BUY " + brokenTf + " BROKE ↓ • SELL CONTINUES"
        else:
            cardSearchReference = brokenBot - runtime.syminfo.mintick
            [nextBuyTop, nextBuyBot, nextBuyTf] =
                 f_cardMajorBuyTarget(cardSearchReference)
            cardTargetTop = nextBuyTop
            cardTargetBot = nextBuyBot
            cardTargetTf = nextBuyTf
            cardLockedDir = -1
            cardTargetReached = false
            cardTargetReachedBar = runtime.na

            cardStepSearchReference = brokenBot - runtime.syminfo.mintick
            [newStepBuyTop, newStepBuyBot, newStepBuyTf] =
                 f_cardStepBuyTarget(cardStepSearchReference, cardTargetTop)
            cardStepTop = newStepBuyTop
            cardStepBot = newStepBuyBot
            cardStepTf = newStepBuyTf
            cardStepDir = -1
            cardStepReached = false
            decisionTargetLastEvent =
                 "MAJOR BUY " + brokenTf + " BROKE ↓ • SELL CONTINUES"

    if decisionHistoryOpt == "Latest Only" and not runtime.na(decisionLastTargetLabel):
        runtime.label_delete(decisionLastTargetLabel)

continueLabelText =
         sellContinueEvent ?
              (brokenWasStep ? "SELL CONTINUE ↓\nSTEP BREAK" : "SELL CONTINUE ↓\nMAJOR BREAK") :
              (brokenWasStep ? "BUY CONTINUE ↑\nSTEP BREAK" : "BUY CONTINUE ↑\nMAJOR BREAK")

    decisionLastTargetLabel = runtime.label_new(
         runtime.bar_index,
         sellContinueEvent ? runtime.high + signalMarkerGap * 0.65 : runtime.low - signalMarkerGap * 0.65,
         continueLabelText,
         xloc=xloc.runtime.bar_index,
         yloc="price",
         style=sellContinueEvent ? "label_down" : "label_up",
         color=sellContinueEvent ? runtime.color_rgb(112, 27, 38) : runtime.color_rgb(7, 78, 57),
         textcolor="#ffffff",
         size=f_decisionLabelSize())

    // BREAK never changes the active BUY / SELL direction.
    decisionTargetSide = 0
    decisionTargetTop = runtime.na
    decisionTargetBot = runtime.na
    decisionTargetTime = runtime.na
    decisionTargetTF = "--"
    decisionTargetTouched = false
    decisionTargetTouchBar = runtime.na
    decisionTargetIsConflict = false
    cardDecisionIsStep = false

// ------------------------------------------------------------------
// STALE TARGET EXPIRED
// Remove old WATCH state and wait for price to physically reach the
// CURRENT opposite box again. No reversal/continue signal is printed.
// ------------------------------------------------------------------
if decisionTargetExpired:
    decisionTargetSide = 0
    decisionTargetTop = runtime.na
    decisionTargetBot = runtime.na
    decisionTargetTime = runtime.na
    decisionTargetTF = "--"
    decisionTargetTouched = false
    decisionTargetTouchBar = runtime.na
    decisionTargetIsConflict = false
    decisionTargetLastEvent = "OLD TARGET EXPIRED • WAIT CURRENT BOX"

// Compatibility booleans for existing dashboard.
decisionBuyTouchValid =
     rejTradeDir == -1 ?
          ((decisionTargetSide == 1 or decisionTargetIsConflict) and decisionTargetTouched) :
     rejTradeDir == 0 ? idleBuyArmed : false

decisionSellTouchValid =
     rejTradeDir == 1 ?
          ((decisionTargetSide == -1 or decisionTargetIsConflict) and decisionTargetTouched) :
     rejTradeDir == 0 ? idleSellArmed : false

rejTradePl = f_dashboardPl(rejTradeEntry, rejTradeDir)

if rejTradeDir != 0 and not rejTradeBeLocked and not runtime.na(rejTradePl) and rejTradePl >= beTriggerProfitUsd:
    rejTradeBeLocked = true

// V16.2 HOLD MODE:
// BE/SL/zone invalidation are INFORMATION ONLY.
// They do NOT runtime.close the Zone decision trade.
// The trade reverses only after the OPPOSITE visible zone confirms
// with a closed candle outside its box.
rejBeClosed = false
rejStopClosed = false
rejZoneInvalidClosed = false
rejTradeCloseEvent = false
rejTradeClosingDir = 0
rejTradeClosingEntry = runtime.na
rejTradeClosingReason = "--"

//=============================================================================
// OPPOSITE BOX REACHED = THIS IS WHERE DECISION WORK STARTS
//=============================================================================
sellTradeExitWatchActive =
     rejTradeDir == -1 and decisionTargetSide == 1 and decisionTargetTouched

buyTradeExitWatchActive =
     rejTradeDir == 1 and decisionTargetSide == -1 and decisionTargetTouched

exitWatchActive = sellTradeExitWatchActive or buyTradeExitWatchActive

if 'decisionExitWatchLabel' not in locals(): decisionExitWatchLabel = runtime.na

if newTargetTouchEvent:
    if not runtime.na(decisionExitWatchLabel):
        runtime.label_delete(decisionExitWatchLabel)

    if showExitWatchLabel:
watchBelow = canArmBuyDecision or
             (canArmConflictDecision and rejTradeDirBefore == -1)

watchText =
             canArmConflictDecision ?
                  "CONFLICT ⚠\nWAIT OUTSIDE" :
             canArmBuyDecision ?
                  "BUY BOX ⚠\nREJECT / BREAK" :
                  "SELL BOX ⚠\nREJECT / BREAK"

        decisionExitWatchLabel = runtime.label_new(
             runtime.bar_index,
             watchBelow ? runtime.low - signalMarkerGap * 0.55 : runtime.high + signalMarkerGap * 0.55,
             watchText,
             xloc=xloc.runtime.bar_index,
             yloc="price",
             style=watchBelow ? "label_up" : "label_down",
             color=runtime.color_rgb(255, 199, 64),
             textcolor=darkBg,
             size="tiny",
             tooltip="Decision window is fresh only for a few bars after the box is reached. Conflict cluster: price must fully exit the entire cluster.")

if rejBuyEntryEvent or rejSellEntryEvent or decisionContinueEvent or decisionTargetExpired:
    if not runtime.na(decisionExitWatchLabel):
        runtime.label_delete(decisionExitWatchLabel)
        decisionExitWatchLabel = runtime.na

// Exact decision candle highlighting.
decisionCandleColor =
     not highlightDecisionCandles ? runtime.na :
     rejBuyEntryEvent ? runtime.color_rgb(67, 232, 183) :
     rejSellEntryEvent ? runtime.color_rgb(255, 104, 117) :
     buyContinueEvent ? runtime.color_rgb(67, 232, 183) :
     sellContinueEvent ? runtime.color_rgb(255, 104, 117) : runtime.na

barcolor(decisionCandleColor)

//=============================================================================
// MEMBER-FACING V16.3 TARGET DECISION STATUS
//=============================================================================
currentSetupDir =
     rejTradeDir != 0 ? rejTradeDir :
     idleBuyArmed and not idleSellArmed ? 1 :
     idleSellArmed and not idleBuyArmed ? -1 :
     priceInMapBuy ? 1 :
     priceInMapSell ? -1 : radarDir

currentSetupLevel =
     rejTradeDir != 0 ? 2 :
     idleBuyArmed or idleSellArmed ? 1 : 0

currentSetupRR =
     currentSetupDir == 1 ? buyCandidateRR :
     currentSetupDir == -1 ? sellCandidateRR : runtime.na

currentSetupSpaceOk =
     currentSetupDir == 1 ? buySpaceOk :
     currentSetupDir == -1 ? sellSpaceOk : false

currentSetupSide = currentSetupDir == 1 ? "BUY" : currentSetupDir == -1 ? "SELL" : "WAIT"

targetSideText =
     decisionTargetIsConflict ? "CONFLICT CLUSTER" :
     decisionTargetSide == 1 ? "BUY ZONE" :
     decisionTargetSide == -1 ? "SELL ZONE" : "--"

targetPriceText =
     runtime.na(decisionTargetTop) or runtime.na(decisionTargetBot) ? "--" :
     runtime.str_tostring(decisionTargetBot, format.mintick) + " - " + runtime.str_tostring(decisionTargetTop, format.mintick)

currentSetupText =
     rejTradeDir != 0 and decisionTargetIsConflict and decisionTargetFresh ?
          (rejTradeDir == 1 ? "BUY ACTIVE • CONFLICT • WAIT OUTSIDE" : "SELL ACTIVE • CONFLICT • WAIT OUTSIDE") :
     rejTradeDir == -1 and decisionTargetFresh ? "SELL ACTIVE • BUY ZONE REACHED • REJECT OR BREAK" :
     rejTradeDir == 1 and decisionTargetFresh ? "BUY ACTIVE • SELL ZONE REACHED • REJECT OR BREAK" :
     rejTradeDir == -1 ? "SELL ACTIVE • WAIT CURRENT BUY BOX" :
     rejTradeDir == 1 ? "BUY ACTIVE • WAIT CURRENT SELL BOX" :
     idleBuyArmed ? "BUY ZONE LOCKED • WAIT BODY 100% ABOVE" :
     idleSellArmed ? "SELL ZONE LOCKED • WAIT BODY 100% BELOW" :
     "WAIT FOR BUY / SELL ZONE"

currentSetupColor = currentSetupDir == 1 ? bullColor : currentSetupDir == -1 ? bearColor : neutralColor

focusDir = currentSetupDir
focusLevel = currentSetupLevel
focusColor = focusDir == 1 ? bullColor : focusDir == -1 ? bearColor : neutralColor

signalStatus =
     rejTradeDir != 0 and decisionTargetIsConflict and decisionTargetFresh ? "CONFLICT • WAIT OUTSIDE" :
     rejTradeDir == -1 and decisionTargetFresh ? "SELL • TARGET BUY ZONE • DECIDE" :
     rejTradeDir == 1 and decisionTargetFresh ? "BUY • TARGET SELL ZONE • DECIDE" :
     rejTradeDir == -1 ? "SELL ACTIVE • HOLD" :
     rejTradeDir == 1 ? "BUY ACTIVE • HOLD" :
     idleBuyArmed ? "BUY WATCH • LOCKED ZONE" :
     idleSellArmed ? "SELL WATCH • LOCKED ZONE" : "WAIT FOR ZONE"

tradeStatus = rejTradeDir == 1 ? "RUNNING BUY 🔒" : rejTradeDir == -1 ? "RUNNING SELL 🔒" : "WAIT"

rejPlText = runtime.na(rejTradePl) ? "--" : "$" + runtime.str_tostring(rejTradePl, "#.00")
rejBeText = rejTradeDir == 0 ? "WAIT" : rejTradeBeLocked ? "PROFIT PROTECTED" : "WATCH"
rejSlText = slDisplayMode == "Off" ? "OFF" : runtime.na(rejTradeStop) ? "--" : runtime.str_tostring(rejTradeStop, format.mintick)

decisionInvalidDisplay =
     rejTradeDir != 0 and not runtime.na(rejTradeZoneInvalid) ? rejTradeZoneInvalid :
     focusDir == 1 ? mapBuyBot : focusDir == -1 ? mapSellTop : runtime.na

decisionEntryTimeText = runtime.na(rejTradeEntryTime) ? "--" : str.format_time(rejTradeEntryTime, "HH:mm", "Europe/London")
decisionTradeAgeText = rejTradeDir == 0 or runtime.na(rejTradeEntryTime) ? "--" : f_ageText(rejTradeEntryTime)

decisionExitWatchText =
     rejTradeDir != 0 and decisionTargetIsConflict and decisionTargetFresh ? "CONFLICT • WAIT OUTSIDE" :
     rejTradeDir != 0 and decisionTargetFresh ? targetSideText + " • DECISION NOW" :
     rejTradeDir != 0 ? (rejTradeDir == -1 ? "HOLD → CURRENT BUY BOX" : "HOLD → CURRENT SELL BOX") :
     idleBuyArmed ? "BUY WATCH" : idleSellArmed ? "SELL WATCH" : "WAIT FOR ZONE"

decisionExitWatchColor =
     rejTradeDir != 0 and decisionTargetTouched ? gold :
     rejTradeDir == 1 ? bullColor : rejTradeDir == -1 ? bearColor : neutralColor

decisionLastExitText =
     decisionLastExitDir == 0 or runtime.na(decisionLastExitTime) ? "LAST REVERSAL • --" :
     "LAST REVERSAL • " + (decisionLastExitDir == 1 ? "EXIT BUY" : "EXIT SELL") +
     " • " + decisionLastExitReason +
     " • " + str.format_time(decisionLastExitTime, "HH:mm", "Europe/London") +
     " • " + runtime.str_tostring(decisionLastExitPrice, format.mintick)

// Dedicated FLIGHT SIGNAL row — never hidden inside another header.
masterFlightText =
     radarDir == 1 ?
         "✈ MAIN FLIGHT • BUY • " + runtime.str_tostring(radarConfidence, "#") + "% • " + runningAge :
     radarDir == -1 ?
         "✈ MAIN FLIGHT • SELL • " + runtime.str_tostring(radarConfidence, "#") + "% • " + runningAge :
     "✈ MAIN FLIGHT • WAIT"

masterFlightColor =
     radarDir == 1 ? bullColor :
     radarDir == -1 ? bearColor : neutralColor

lastSignalTimeText =
     runtime.na(rejLastSignalTime) ? "--" :
     str.format_time(rejLastSignalTime, "HH:mm", "Europe/London")

masterLastSignalText =
     rejLastSignalDir == 0 ? "⚡ LAST REAL SIGNAL • --" :
     "⚡ LAST REAL SIGNAL • " + rejLastSignalKind +
     " • " + lastSignalTimeText +
     " • " + runtime.str_tostring(rejLastSignalEntry, format.mintick)

masterLastSignalColor =
     rejLastSignalDir == 1 ? bullColor :
     rejLastSignalDir == -1 ? bearColor : neutralColor

masterTradeStateText =
     rejTradeDir == 1 ? "TRADE STATUS • BUY ACTIVE 🔒" :
     rejTradeDir == -1 ? "TRADE STATUS • SELL ACTIVE 🔒" :
     rejTradeLastExit != "--" and rejLastSignalDir != 0 ?
         "TRADE STATUS • CLOSED • " + rejTradeLastExit +
         " • LAST " + (rejLastSignalDir == 1 ? "BUY" : "SELL") :
     "TRADE STATUS • NO ACTIVE TRADE"

masterTradeStateColor =
     rejTradeDir == 1 ? bullColor :
     rejTradeDir == -1 ? bearColor :
     rejTradeLastExit != "--" ? gold : neutralColor

// Main banner describes ACTUAL trade state first.
// A rejected current setup is shown separately below; it does not overwrite
// the member's understanding of the last real signal.
masterDecisionText =
     rejTradeDir == 1 ? "⚡ BUY ACTIVE • LOCKED" :
     rejTradeDir == -1 ? "⚡ SELL ACTIVE • LOCKED" :
     rejLastSignalDir == 1 and rejTradeLastExit != "--" ?
         "NO ACTIVE TRADE • LAST BUY • " + rejTradeLastExit :
     rejLastSignalDir == -1 and rejTradeLastExit != "--" ?
         "NO ACTIVE TRADE • LAST SELL • " + rejTradeLastExit :
     rejLastSignalDir == 1 ? "NO ACTIVE TRADE • LAST SIGNAL BUY" :
     rejLastSignalDir == -1 ? "NO ACTIVE TRADE • LAST SIGNAL SELL" :
     "WAIT FOR ZONE + CLOSED OUTSIDE"

masterDecisionColor =
     rejTradeDir == 1 ? bullColor :
     rejTradeDir == -1 ? bearColor :
     rejLastSignalDir == 1 ? bullColor :
     rejLastSignalDir == -1 ? bearColor : neutralColor

ladder1 = focusLevel >= 1 ? "✓" : "○"
ladder2 = focusLevel >= 2 ? "✓" : "○"
ladder3 = focusLevel >= 3 ? "✓" : "○"
ladder4 = focusLevel >= 4 ? "✓" : "○"

focusStrength =
     focusDir == 1 ? buyStrength :
     focusDir == -1 ? sellStrength :
     runtime.math_max(buyStrength, sellStrength)

//=============================================================================
// V1.2 LOCKED WHALE MONTHLY LEDGER + $100 PROFIT-LOCK LADDER
//=============================================================================
// IMPORTANT: This entire ledger block is intentionally placed AFTER the original
// Zone signal/decision engine. It reads FLIGHT state only and does not write to any
// Zone entry, reversal, target, conflict, rejection, confirmation or lifecycle variable.
// The Zone engine above is preserved exactly from the known-good pre-ledger build.
//
// CLOSED WHALE trades only.
// Each new confirmed WHALE signal opens ONE simulated ledger trade using the SFA lot
// locked at that entry.
//
// V2.4 GOLD + SILVER HOLD / MONEY-MANAGEMENT SCOPE:
//   GOLD (XAUUSD) + SILVER (XAGUSD) ONLY:
//     +$100 reached  -> lock +$25
//     +$250 reached  -> lock +$100
//     +$500 reached  -> lock +$250
//     +$750 reached  -> lock +$500
//     +$1,000 reached -> lock +$750
//     ...then every additional +$250 favourable move locks another +$250.
//   GOLD / SILVER HOLD EXIT (V2.4):
//     A normal signal END / neutral candle does NOT runtime.close the ledger trade.
//     A same-side WHALE re-entry does NOT reset the original trade entry or lock.
//     The trade stays runtime.open until an OPPOSITE WHALE signal or an active profit-lock stop is hit.
//   BTC / ETH / FOREX: EXACT V2.1 protection behaviour is preserved:
//     +$100 reached -> ENTRY / BE
//     +$500 reached -> lock +$250
//     +$750 reached -> lock +$500
//     +$1,000 reached -> lock +$750
//     ...then every additional +$250 favourable move locks another +$250.
//
// There is still NO artificial hard stop before profit protection.
//
// IMPORTANT HISTORICAL-BAR RULE:
// Pine historical OHLC does not reveal whether the HIGH or LOW happened first.
// To avoid false same-candle BE/lock exits, an upgraded trail becomes active on
// the NEXT bar. Existing trail protection is checked first; only if the trade is
// still runtime.open do we ratchet the stop from that bar's favourable excursion.
// This makes the monthly ledger much closer to a real step-trailing workflow.
//
// This is a dashboard simulation only; Pine cannot physically move a broker SL.
// Direct FLIGHT reversal closes any still-runtime.open ledger trade at the confirmed
// runtime.close unless an already-active trail stop was hit on that bar (trail priority).
// Neutralisation closes the runtime.open ledger trade at the confirmed runtime.close.
// Monthly attribution uses the CLOSE date/runtime.time in Europe/London.
const string flightLedgerTimezone = "Europe/London"
const int flightLedgerRows = 100

// V2.1 baseline — preserved for ETH / FOREX.
const float flightLedgerBeTriggerUsd = 100.0
const float flightLedgerLockStepUsd = 250.0
const float flightLedgerFirstProfitLockTriggerUsd = 500.0

// V2.5 BTC ONLY — HOLD + adaptive closed-candle protection.
// No forced BE below +$500.
// +$500 peak  -> protect +$100
// +$1,000     -> protect +$500
// +$1,500     -> protect +$750
// +$2,000     -> protect +$1,000
// Above +$2,000 -> protect 60% of the highest favourable P/L.
const float flightBtcProtectTrigger1Usd = 500.0
const float flightBtcProtectLock1Usd = 100.0
const float flightBtcProtectTrigger2Usd = 1000.0
const float flightBtcProtectLock2Usd = 500.0
const float flightBtcProtectTrigger3Usd = 1500.0
const float flightBtcProtectLock3Usd = 750.0
const float flightBtcProtectTrigger4Usd = 2000.0
const float flightBtcProtectLock4Usd = 1000.0
const float flightBtcPeakTrailPct = 0.60

// V2.4 GOLD + SILVER ONLY — protected profit + HOLD through neutral/same-side continuation.
const float flightMetalProtectTrigger1Usd = 100.0
const float flightMetalProtectLock1Usd = 25.0
const float flightMetalProtectTrigger2Usd = 250.0
const float flightMetalProtectLock2Usd = 100.0
const float flightMetalProtectTrigger3Usd = 500.0
const float flightMetalProtectLock3Usd = 250.0
const float flightMetalProtectTrigger4Usd = 750.0
const float flightMetalProtectLock4Usd = 500.0
const float flightMetalProtectTrigger5Usd = 1000.0
const float flightMetalProtectLock5Usd = 750.0
const float flightMetalProtectStepUsd = 250.0

flightLedgerUseMetalProfitLock = dashboardIsGold or dashboardIsSilver
// V2.4 metals keep HOLD semantics.
flightLedgerUseMetalHold = dashboardIsGold or dashboardIsSilver
// V2.5 BTC gets its OWN HOLD + adaptive protection. This changes only the simulated
// BTC ledger management; the locked Zone/WHALE signal engine and alert engine are untouched.
flightLedgerUseBtcAdaptiveHold = dashboardIsBtc
flightLedgerUseHold = flightLedgerUseMetalHold or flightLedgerUseBtcAdaptiveHold

if 'flightMonthSignalCount' not in locals(): flightMonthSignalCount = 0
if 'flightMonthTradeCount' not in locals(): flightMonthTradeCount = 0
if 'flightMonthWinCount' not in locals(): flightMonthWinCount = 0
if 'flightMonthLossCount' not in locals(): flightMonthLossCount = 0
if 'flightMonthBeCount' not in locals(): flightMonthBeCount = 0
if 'flightMonthNetPl' not in locals(): flightMonthNetPl = 0.0

var array<int> flightLedgerCloseTimes = []
var array<int> flightLedgerDirs = []
var array<float> flightLedgerLots = []
var array<float> flightLedgerPls = []
var array<float> flightLedgerEntries = []
var array<float> flightLedgerExits = []

// Independent ledger-trade state.
if 'flightLedgerTradeDir' not in locals(): flightLedgerTradeDir = 0
if 'flightLedgerTradeEntry' not in locals(): flightLedgerTradeEntry = runtime.na
if 'flightLedgerTradeLot' not in locals(): flightLedgerTradeLot = runtime.na
if 'flightLedgerTradeEntryBar' not in locals(): flightLedgerTradeEntryBar = runtime.na
if 'flightLedgerTradeEntryTime' not in locals(): flightLedgerTradeEntryTime = runtime.na

// Protective-stop state.
// ETH / FOREX retain V2.1:
//   trailSteps = 0 -> no protective stop yet; wait for +$100.
//   trailSteps = 1 -> +$100 reached, SL at ENTRY (BE).
//   trailSteps = 2 -> +$500 reached, +$250 locked.
//   trailSteps = 3 -> +$750 reached, +$500 locked, etc.
// GOLD / SILVER V2.4:
//   trailSteps = 0 -> no protective stop yet; wait for +$100.
//   trailSteps = 1 -> +$100 reached, +$25 locked.
//   trailSteps = 2 -> +$250 reached, +$100 locked.
//   trailSteps = 3 -> +$500 reached, +$250 locked.
//   trailSteps = 4 -> +$750 reached, +$500 locked.
//   trailSteps = 5 -> +$1,000 reached, +$750 locked, etc.
if 'flightLedgerTrailSteps' not in locals(): flightLedgerTrailSteps = 0
if 'flightLedgerLockedUsd' not in locals(): flightLedgerLockedUsd = runtime.na
if 'flightLedgerTrailStopPrice' not in locals(): flightLedgerTrailStopPrice = runtime.na
// V2.5 BTC peak favourable P/L used by the adaptive 60% trail.
if 'flightLedgerPeakUsd' not in locals(): flightLedgerPeakUsd = runtime.na

flightMonthKey =
     year(runtime.time, flightLedgerTimezone) * 100 +
     month(runtime.time, flightLedgerTimezone)

flightNewCalendarMonth =
     not runtime.na(flightMonthKey[1]) and flightMonthKey != flightMonthKey[1]

if flightNewCalendarMonth:
    flightMonthSignalCount = 0
    flightMonthTradeCount = 0
    flightMonthWinCount = 0
    flightMonthLossCount = 0
    flightMonthBeCount = 0
    flightMonthNetPl = 0.0
    // Keep the rolling last-100 history across month boundaries. Monthly counters reset above.

// Every confirmed new BUY/SELL FLIGHT event is a new ledger signal.
flightLedgerNewSignal = flightBuySignalEvent or flightSellSignalEvent

// -----------------------------------------------------------------------------
// ACTIVE PROTECTIVE STOP CHECK — only an already-active protection/lock.
// GOLD/SILVER: the first active protection already carries +$25.
// BTC V2.5 first protection starts only after +$500 and protects +$100.
// ETH/FOREX retain V2.1 +$100 -> BE. There is no artificial hard stop before protection.
// This prevents historical OHLC from falsely assuming a newly-raised stop was
// hit earlier on the same candle.
// -----------------------------------------------------------------------------
flightLedgerTrailActive =
     flightLedgerTradeDir != 0 and
     not runtime.na(flightLedgerTrailStopPrice)

// V2.5 BTC: protection is confirmed by the CANDLE CLOSE, not by a wick.
// Metals and legacy instruments retain their previous wick-touch behavior.
flightLedgerBtcProtectionTouched =
     barstate.isconfirmed and
     flightLedgerTrailActive and
     flightLedgerUseBtcAdaptiveHold and
     ((flightLedgerTradeDir == 1 and runtime.close <= flightLedgerTrailStopPrice) or
      (flightLedgerTradeDir == -1 and runtime.close >= flightLedgerTrailStopPrice))

flightLedgerLegacyTrailStopTouched =
     barstate.isconfirmed and
     flightLedgerTrailActive and
     not flightLedgerUseBtcAdaptiveHold and
     ((flightLedgerTradeDir == 1 and runtime.low <= flightLedgerTrailStopPrice) or
      (flightLedgerTradeDir == -1 and runtime.high >= flightLedgerTrailStopPrice))

flightLedgerTrailStopTouched =
     flightLedgerBtcProtectionTouched or flightLedgerLegacyTrailStopTouched

// V2.5 HOLD:
// - Gold/Silver keep V2.4 hold behavior.
// - BTC now also ignores neutralisation and same-side WHALE re-entry.
// - HOLD instruments runtime.close only on a genuine opposite WHALE signal or active protection.
// ETH / FOREX keep the V2.1 runtime.close rule.
flightLedgerOppositeSignal =
     flightLedgerTradeDir != 0 and
     ((flightLedgerTradeDir == 1 and flightSellSignalEvent) or
      (flightLedgerTradeDir == -1 and flightBuySignalEvent))

flightLedgerCloseBySignal =
     flightLedgerTradeDir != 0 and
     (flightLedgerUseHold ?
          flightLedgerOppositeSignal :
          (flightLedgerNewSignal or flightEndedEvent))

flightLedgerCloseNow = flightLedgerTrailStopTouched or flightLedgerCloseBySignal

if flightLedgerCloseNow and not runtime.na(flightLedgerTradeEntry):
closedDir = flightLedgerTradeDir
closedLot = runtime.na(flightLedgerTradeLot) ? dashboardLotSize : flightLedgerTradeLot
closedExitPrice = flightLedgerTrailStopTouched ? flightLedgerTrailStopPrice : runtime.close
closedPl = runtime.na

    // An already-active protective stop has priority over a signal runtime.close.
    // Use the exact locked-dollar value stored by the active instrument ladder.
    if flightLedgerTrailStopTouched:
        closedPl = runtime.na(flightLedgerLockedUsd) ? 0.0 : flightLedgerLockedUsd
    else:
        closedPl = f_dashboardPlLot(flightLedgerTradeEntry, closedExitPrice, closedDir, closedLot)

    if not runtime.na(closedPl):
        flightMonthTradeCount += 1
        flightMonthNetPl += closedPl

        if closedPl > 0:
            flightMonthWinCount += 1
        elif closedPl < 0:
            flightMonthLossCount += 1
        else:
            flightMonthBeCount += 1

        flightLedgerCloseTimes.append(runtime.time)
        flightLedgerDirs.append(closedDir)
        flightLedgerLots.append(closedLot)
        flightLedgerPls.append(closedPl)
        flightLedgerEntries.append(flightLedgerTradeEntry)
        flightLedgerExits.append(closedExitPrice)

        if len(flightLedgerPls) > flightLedgerRows:
            flightLedgerCloseTimes.pop(0)
            flightLedgerDirs.pop(0)
            flightLedgerLots.pop(0)
            flightLedgerPls.pop(0)
            flightLedgerEntries.pop(0)
            flightLedgerExits.pop(0)

    flightLedgerTradeDir = 0
    flightLedgerTradeEntry = runtime.na
    flightLedgerTradeLot = runtime.na
    flightLedgerTradeEntryBar = runtime.na
    flightLedgerTradeEntryTime = runtime.na
    flightLedgerTrailSteps = 0
    flightLedgerLockedUsd = runtime.na
    flightLedgerTrailStopPrice = runtime.na
    flightLedgerPeakUsd = runtime.na

// Count each NEW WHALE BUY / WHALE SELL once for the current month.
if flightLedgerNewSignal:
    flightMonthSignalCount += 1

// Every NEW confirmed WHALE signal starts one fresh ledger trade. On a direct
// reversal, the previous trade is closed above first, then the opposite opens.
// V2.4 metals exception: if a Gold/Silver trade is already runtime.open and the same-side
// WHALE signal appears again after a neutral phase, KEEP the original trade/entry.
if flightLedgerNewSignal and radarDir != 0 and not runtime.na(radarEntry) and:
     (not flightLedgerUseHold or flightLedgerTradeDir == 0)
    flightLedgerTradeDir = radarDir
    flightLedgerTradeEntry = radarEntry
    flightLedgerTradeLot = runtime.na(radarEntryLot) ? dashboardLotSize : radarEntryLot
    flightLedgerTradeEntryBar = runtime.bar_index
    flightLedgerTradeEntryTime = runtime.time
    flightLedgerTrailSteps = 0
    flightLedgerLockedUsd = runtime.na
    flightLedgerPeakUsd = runtime.na
    // No artificial hard SL before the instrument-specific protection trigger.
    // GOLD/SILVER first protection = +$25 after +$100.
    // BTC has no forced BE and waits until +$500 before protecting +$100.
    // ETH/FOREX retain V2.1 +$100 -> BE.
    flightLedgerTrailStopPrice = runtime.na

// -----------------------------------------------------------------------------
// PROFIT-LOCK RATCHET — update only AFTER stop/signal processing for this bar.
// The new stop therefore protects from the next bar onward.
//
// GOLD + SILVER ONLY:
//   +$100   -> lock +$25
//   +$250   -> lock +$100
//   +$500   -> lock +$250
//   +$750   -> lock +$500
//   +$1,000 -> lock +$750
//   then every additional +$250 favourable move locks another +$250.
//
// BTC V2.5 ONLY:
//   below +$500 -> HOLD, no forced BE
//   +$500  -> protect +$100
//   +$1,000 -> protect +$500
//   +$1,500 -> protect +$750
//   +$2,000 -> protect +$1,000
//   above +$2,000 -> protect 60% of highest favourable P/L
//   protection is only EXIT-confirmed on a CLOSED candle.
// ETH / FOREX remain V2.1.
// -----------------------------------------------------------------------------
flightLedgerCanRatchet = barstate.isconfirmed and not flightLedgerCloseNow and flightLedgerTradeDir != 0 and not runtime.na(flightLedgerTradeEntry) and not runtime.na(flightLedgerTradeEntryBar) and runtime.bar_index > flightLedgerTradeEntryBar

if flightLedgerCanRatchet:
activeLot = runtime.na(flightLedgerTradeLot) ? dashboardLotSize : flightLedgerTradeLot
favourablePrice = flightLedgerTradeDir == 1 ? runtime.high : runtime.low
favourablePl = f_dashboardPlLot(
         flightLedgerTradeEntry, favourablePrice, flightLedgerTradeDir, activeLot)
moneyFactor = f_dashboardMoneyFactorForLot(activeLot)

    if flightLedgerUseMetalProfitLock:
        // GOLD / SILVER: first protection is PROFIT, never $0 BE.
metalNewSteps = 0
metalNewLockedUsd = runtime.na

        if not runtime.na(favourablePl):
            if favourablePl >= flightMetalProtectTrigger5Usd:
extraMetalSteps = int(runtime.math_floor((favourablePl - flightMetalProtectTrigger5Usd) / flightMetalProtectStepUsd))
                metalNewSteps = 5 + extraMetalSteps
                metalNewLockedUsd = flightMetalProtectLock5Usd + extraMetalSteps * flightMetalProtectStepUsd
            elif favourablePl >= flightMetalProtectTrigger4Usd:
                metalNewSteps = 4
                metalNewLockedUsd = flightMetalProtectLock4Usd
            elif favourablePl >= flightMetalProtectTrigger3Usd:
                metalNewSteps = 3
                metalNewLockedUsd = flightMetalProtectLock3Usd
            elif favourablePl >= flightMetalProtectTrigger2Usd:
                metalNewSteps = 2
                metalNewLockedUsd = flightMetalProtectLock2Usd
            elif favourablePl >= flightMetalProtectTrigger1Usd:
                metalNewSteps = 1
                metalNewLockedUsd = flightMetalProtectLock1Usd

        if metalNewSteps > flightLedgerTrailSteps and not runtime.na(metalNewLockedUsd):
            flightLedgerTrailSteps = metalNewSteps
            flightLedgerLockedUsd = metalNewLockedUsd

            if not runtime.na(moneyFactor) and moneyFactor > 0:
                flightLedgerTrailStopPrice =
                     flightLedgerTradeEntry +
                     flightLedgerTradeDir * (metalNewLockedUsd / moneyFactor)
    elif flightLedgerUseBtcAdaptiveHold:
        // BTC V2.5 — HOLD + adaptive profit protection.
        // Track the best favourable excursion. Ratchet AFTER this bar's exit check,
        // therefore any newly-raised protection becomes active from the next bar.
        if not runtime.na(favourablePl):
            flightLedgerPeakUsd = runtime.na(flightLedgerPeakUsd) ? favourablePl : runtime.math_max(flightLedgerPeakUsd, favourablePl)

btcPeak = runtime.na(flightLedgerPeakUsd) ? 0.0 : flightLedgerPeakUsd
btcNewLockedUsd = runtime.na
btcNewStage = 0

        if btcPeak >= flightBtcProtectTrigger4Usd:
            btcNewStage = 5 + int(runtime.math_floor((btcPeak - flightBtcProtectTrigger4Usd) / 250.0))
            btcNewLockedUsd = runtime.math_max(flightBtcProtectLock4Usd, btcPeak * flightBtcPeakTrailPct)
        elif btcPeak >= flightBtcProtectTrigger3Usd:
            btcNewStage = 4
            btcNewLockedUsd = flightBtcProtectLock3Usd
        elif btcPeak >= flightBtcProtectTrigger2Usd:
            btcNewStage = 3
            btcNewLockedUsd = flightBtcProtectLock2Usd
        elif btcPeak >= flightBtcProtectTrigger1Usd:
            btcNewStage = 2
            btcNewLockedUsd = flightBtcProtectLock1Usd

        if not runtime.na(btcNewLockedUsd) and (runtime.na(flightLedgerLockedUsd) or btcNewLockedUsd > flightLedgerLockedUsd):
            flightLedgerTrailSteps = btcNewStage
            flightLedgerLockedUsd = btcNewLockedUsd

            if not runtime.na(moneyFactor) and moneyFactor > 0:
                flightLedgerTrailStopPrice =
                     flightLedgerTradeEntry +
                     flightLedgerTradeDir * (btcNewLockedUsd / moneyFactor)
    else:
        // ETH / FOREX: V2.1 logic preserved exactly.
        // Stage 1: early BE protection at +$100.
        if not runtime.na(favourablePl) and favourablePl >= flightLedgerBeTriggerUsd and flightLedgerTrailSteps < 1:
            flightLedgerTrailSteps = 1
            flightLedgerLockedUsd = 0.0
            flightLedgerTrailStopPrice = flightLedgerTradeEntry

        // Stage 2+: first real profit lock at +$500, then every +$250.
        if not runtime.na(favourablePl) and favourablePl >= flightLedgerFirstProfitLockTriggerUsd:
reachedProfitLocks = int(runtime.math_floor((favourablePl - flightLedgerFirstProfitLockTriggerUsd) / flightLedgerLockStepUsd)) + 1
newTrailSteps = 1 + reachedProfitLocks

            if newTrailSteps > flightLedgerTrailSteps:
newLockedUsd = reachedProfitLocks * flightLedgerLockStepUsd

                flightLedgerTrailSteps = newTrailSteps
                flightLedgerLockedUsd = newLockedUsd

                if not runtime.na(moneyFactor) and moneyFactor > 0:
                    flightLedgerTrailStopPrice =
                         flightLedgerTradeEntry +
                         flightLedgerTradeDir * (newLockedUsd / moneyFactor)


//=============================================================================
// MULTI-TIMEFRAME REJECTION STATUS (DASHBOARD ONLY)
// Every timeframe processes its own completed candle and its own zones.
//=============================================================================
f_rejMtfState() =>
    [sTop, sBot, sTime, bTop, bBot, bTime] = f_continuousZones()

    if 'd' not in locals(): d = 0
    if 'lvl' not in locals(): lvl = 0
    if 'rTime' not in locals(): rTime = runtime.na
    if 'rHi' not in locals(): rHi = runtime.na
    if 'rLo' not in locals(): rLo = runtime.na
    if 'rClose' not in locals(): rClose = runtime.na
    if 'structHi' not in locals(): structHi = runtime.na
    if 'structLo' not in locals(): structLo = runtime.na
    if 'lastProcessed' not in locals(): lastProcessed = runtime.na
    if 'lastBuyZoneTime' not in locals(): lastBuyZoneTime = runtime.na
    if 'lastSellZoneTime' not in locals(): lastSellZoneTime = runtime.na

    // Reset a side if its active zone changes.
    if bTime != lastBuyZoneTime and not runtime.na(bTime):
        if d == 1:
            d = 0
            lvl = 0
        lastBuyZoneTime = bTime

    if sTime != lastSellZoneTime and not runtime.na(sTime):
        if d == -1:
            d = 0
            lvl = 0
        lastSellZoneTime = sTime

    if not runtime.na(runtime.time[1]) and runtime.time[1] != lastProcessed:
o = runtime.open[1]
h = runtime.high[1]
l = runtime.low[1]
c = runtime.close[1]
t = runtime.time[1]
        lastProcessed = t

        // Existing L1 must be confirmed by the immediate next completed candle.
        if lvl == 1 and not runtime.na(rTime) and t > rTime:
okFollow = d == 1 ?
                 (c > o and c > rClose) :
                 (c < o and c < rClose)
            if okFollow:
                lvl = 2
            else:
                d = 0
                lvl = 0
                rTime = runtime.na
                rHi = runtime.na
                rLo = runtime.na
                rClose = runtime.na

        // Advance confirmed setups.
        if lvl >= 2:
            if d == 1 and not runtime.na(rHi) and c > rHi:
                lvl = runtime.math_max(lvl, 3)
            if d == -1 and not runtime.na(rLo) and c < rLo:
                lvl = runtime.math_max(lvl, 3)

            if d == 1 and not runtime.na(structHi) and c > structHi:
                lvl = 4
            if d == -1 and not runtime.na(structLo) and c < structLo:
                lvl = 4

            // Closed through invalid side = setup no longer valid.
            if d == 1 and not runtime.na(bBot) and c < bBot:
                d = 0
                lvl = 0
            if d == -1 and not runtime.na(sTop) and c > sTop:
                d = 0
                lvl = 0

        // Fresh rejection can start a new watch.
bTouch = not runtime.na(bTop) and not runtime.na(bBot) and l <= bTop and h >= bBot
sTouch = not runtime.na(sTop) and not runtime.na(sBot) and h >= sBot and l <= sTop

bReject = bTouch and c < o and c >= bBot and c > l + (h - l) * 0.25
sReject = sTouch and c > o and c <= sTop and c < h - (h - l) * 0.25

        if bReject:
            d = 1
            lvl = 1
            rTime = t
            rHi = h
            rLo = l
            rClose = c
            structHi = runtime.ta_highest(runtime.high[2], rejectStructureLookback)
            structLo = runtime.na

        if sReject:
            d = -1
            lvl = 1
            rTime = t
            rHi = h
            rLo = l
            rClose = c
            structLo = runtime.ta_lowest(runtime.low[2], rejectStructureLookback)
            structHi = runtime.na

    [d, lvl]

[mtf1Dir, mtf1Lvl] = runtime.request_security(runtime.syminfo.tickerid, "1", f_rejMtfState(), "gaps_off", "lookahead_off")
[mtf5Dir, mtf5Lvl] = runtime.request_security(runtime.syminfo.tickerid, "5", f_rejMtfState(), "gaps_off", "lookahead_off")
[mtf15Dir, mtf15Lvl] = runtime.request_security(runtime.syminfo.tickerid, "15", f_rejMtfState(), "gaps_off", "lookahead_off")
[mtf30Dir, mtf30Lvl] = runtime.request_security(runtime.syminfo.tickerid, "30", f_rejMtfState(), "gaps_off", "lookahead_off")
[mtf1hDir, mtf1hLvl] = runtime.request_security(runtime.syminfo.tickerid, "60", f_rejMtfState(), "gaps_off", "lookahead_off")
[mtf4hDir, mtf4hLvl] = runtime.request_security(runtime.syminfo.tickerid, "240", f_rejMtfState(), "gaps_off", "lookahead_off")
[mtfD1Dir, mtfD1Lvl] = runtime.request_security(runtime.syminfo.tickerid, "D", f_rejMtfState(), "gaps_off", "lookahead_off")

f_mtfTxt(int d, int l) =>
    l <= 0 ? "WAIT" :
     d == 1 ? ("L" + runtime.str_tostring(l) + " BUY" + (l >= 2 ? " ⚡" : "")) :
     d == -1 ? ("L" + runtime.str_tostring(l) + " SELL" + (l >= 2 ? " ⚡" : "")) :
     "WAIT"

f_mtfCol(int d, int l) =>
    l <= 0 ? neutralColor :
     d == 1 ? bullColor :
     d == -1 ? bearColor : neutralColor

// The current chart timeframe must always show exactly the same state
// as the main live rejection engine.
mtf1DirUi = runtime.syminfo.period == "1" ? focusDir : mtf1Dir
mtf1LvlUi = runtime.syminfo.period == "1" ? focusLevel : mtf1Lvl
mtf5DirUi = runtime.syminfo.period == "5" ? focusDir : mtf5Dir
mtf5LvlUi = runtime.syminfo.period == "5" ? focusLevel : mtf5Lvl
mtf15DirUi = runtime.syminfo.period == "15" ? focusDir : mtf15Dir
mtf15LvlUi = runtime.syminfo.period == "15" ? focusLevel : mtf15Lvl
mtf30DirUi = runtime.syminfo.period == "30" ? focusDir : mtf30Dir
mtf30LvlUi = runtime.syminfo.period == "30" ? focusLevel : mtf30Lvl
mtf1hDirUi = runtime.syminfo.period == "60" ? focusDir : mtf1hDir
mtf1hLvlUi = runtime.syminfo.period == "60" ? focusLevel : mtf1hLvl
mtf4hDirUi = runtime.syminfo.period == "240" ? focusDir : mtf4hDir
mtf4hLvlUi = runtime.syminfo.period == "240" ? focusLevel : mtf4hLvl
mtfD1DirUi = runtime.syminfo.period == "D" ? focusDir : mtfD1Dir
mtfD1LvlUi = runtime.syminfo.period == "D" ? focusLevel : mtfD1Lvl

f_sessionText() =>
h = hour(timenow, "Etc/UTC")
    h >= 12 and h < 21 ? "NEW YORK" :
     h >= 7 and h < 16 ? "LONDON" :
     h >= 0 and h < 8 ? "ASIA" : "OFF"

f_yesNo(bool v) =>
    v ? "YES" : "NO"

f_checkMark(bool v) =>
    v ? "✓" : "○"


//=============================================================================
// SFA CLOSEPROOF — TINY LIVE-STEPS DASHBOARD
//
// Member-facing progression:
//   STEP 1  ZONE FOUND
//   STEP 2  REJECTION CLOSED
//   STEP 3  NEXT-CANDLE L2 CONFIRMED
//   STEP 4  RR / SPACE PASSED
//
// Zone Strength is a SCORE, not a win-rate prediction:
//   70% weight = Quality Score / 8
//   30% weight = Confirmation Level / 4
//=============================================================================
focusRejClose = focusDir == 1 ? rejBuyClose : focusDir == -1 ? rejSellClose : runtime.na
focusRejHigh = focusDir == 1 ? rejBuyHigh : focusDir == -1 ? rejSellHigh : runtime.na
focusRejLow = focusDir == 1 ? rejBuyLow : focusDir == -1 ? rejSellLow : runtime.na
focusRejVol = focusDir == 1 ? rejBuyVol : focusDir == -1 ? rejSellVol : runtime.na
focusAvgVol = focusDir == 1 ? rejBuyAvgVol : focusDir == -1 ? rejSellAvgVol : runtime.na
focusClosePos = focusDir == 1 ? rejBuyClosePos : focusDir == -1 ? rejSellClosePos : runtime.na
focusSwept = focusDir == 1 ? rejBuySwept : focusDir == -1 ? rejSellSwept : false

focusInvalid =
     rejTradeDir != 0 and not runtime.na(rejTradeZoneInvalid) ? rejTradeZoneInvalid :
     focusDir == 1 ? marketBuyVisualBot :
     focusDir == -1 ? marketSellVisualTop : runtime.na

focusNextLevel =
     rejTradeDir == 1 and not runtime.na(decisionTargetBot) ? decisionTargetBot :
     rejTradeDir == -1 and not runtime.na(decisionTargetTop) ? decisionTargetTop :
     focusDir == 1 ? mapSellBot : focusDir == -1 ? mapBuyTop : runtime.na

focusCandidateEntry =
     rejTradeDir == focusDir and not runtime.na(rejTradeEntry) ? rejTradeEntry :
     focusDir == 1 and not runtime.na(rejBuyClose) ? rejBuyClose :
     focusDir == -1 and not runtime.na(rejSellClose) ? rejSellClose : runtime.close

focusRisk =
     runtime.na(focusInvalid) ? runtime.na :
     runtime.math_abs(focusCandidateEntry - focusInvalid)

focusReward =
     focusDir == 1 ?
         (runtime.na(focusNextLevel) or focusNextLevel <= focusCandidateEntry ? runtime.na : focusNextLevel - focusCandidateEntry) :
     focusDir == -1 ?
         (runtime.na(focusNextLevel) or focusNextLevel >= focusCandidateEntry ? runtime.na : focusCandidateEntry - focusNextLevel) :
     runtime.na

focusRR =
     runtime.na(focusRisk) or focusRisk <= 0 or runtime.na(focusReward) ? runtime.na :
     focusReward / focusRisk

focusSpaceOk = not runtime.na(focusRR) and focusRR >= minRoomRR

focusEffortRatio =
     runtime.na(focusRejVol) or runtime.na(focusAvgVol) or focusAvgVol == 0 ? runtime.na :
     focusRejVol / focusAvgVol

effortText =
     runtime.na(focusEffortRatio) ? "--" :
     focusEffortRatio >= 1.5 ? "HIGH" :
     focusEffortRatio >= 0.85 ? "AVG" : "LOW"

// Quality Score / 8.
q1Location = not runtime.na(focusInvalid)
q2Sweep = focusSwept
q3Closed = focusLevel >= 1
q4CloseBack = focusLevel >= 1
q5AwayExtreme =
     runtime.na(focusClosePos) ? false :
     focusDir == 1 ? focusClosePos >= 35.0 :
     focusDir == -1 ? focusClosePos <= 65.0 : false
q6Follow = focusLevel >= 2
q7Structure = focusLevel >= 3
q8Space = focusSpaceOk

qualityScore =
     (q1Location ? 1 : 0) +
     (q2Sweep ? 1 : 0) +
     (q3Closed ? 1 : 0) +
     (q4CloseBack ? 1 : 0) +
     (q5AwayExtreme ? 1 : 0) +
     (q6Follow ? 1 : 0) +
     (q7Structure ? 1 : 0) +
     (q8Space ? 1 : 0)

// LIVE 4-step progress.
liveStep1 = q1Location
liveStep2 = focusLevel >= 1
liveStep3 = focusLevel >= 2
liveStep4 = focusLevel >= 2 and focusSpaceOk

liveStepsClear =
     (liveStep1 ? 1 : 0) +
     (liveStep2 ? 1 : 0) +
     (liveStep3 ? 1 : 0) +
     (liveStep4 ? 1 : 0)

step1State = liveStep1 ? "✓" : "○"
step2State = liveStep2 ? "✓" : "○"
step3State = liveStep3 ? "✓" : "○"
step4State =
     focusLevel < 2 ? "WAIT" :
     liveStep4 ? "✓" : "✕"

// Zone Strength Score.
// This is intentionally named SCORE, not probability/win-rate.
zoneStrengthRaw =
     (qualityScore / 8.0) * 70.0 +
     (focusLevel / 4.0) * 30.0
zoneStrengthPct = int(runtime.math_round(runtime.math_min(100.0, runtime.math_max(0.0, zoneStrengthRaw))))
zoneStarCount =
     zoneStrengthPct >= 90 ? 5 :
     zoneStrengthPct >= 75 ? 4 :
     zoneStrengthPct >= 60 ? 3 :
     zoneStrengthPct >= 40 ? 2 :
     zoneStrengthPct > 0 ? 1 : 0

zoneStars =
     zoneStarCount == 5 ? "★★★★★" :
     zoneStarCount == 4 ? "★★★★☆" :
     zoneStarCount == 3 ? "★★★☆☆" :
     zoneStarCount == 2 ? "★★☆☆☆" :
     zoneStarCount == 1 ? "★☆☆☆☆" : "☆☆☆☆☆"

zoneGrade =
     zoneStrengthPct >= 90 ? "VERY STRONG" :
     zoneStrengthPct >= 75 ? "STRONG" :
     zoneStrengthPct >= 60 ? "GOOD" :
     zoneStrengthPct >= 40 ? "MEDIUM" : "WEAK"

decisionText = masterDecisionText
decisionColor = masterDecisionColor

mtfRow1 =
     "1M " + f_mtfTxt(mtf1DirUi, mtf1LvlUi) +
     "  •  5M " + f_mtfTxt(mtf5DirUi, mtf5LvlUi) +
     "  •  15M " + f_mtfTxt(mtf15DirUi, mtf15LvlUi)

mtfRow2 =
     "30M " + f_mtfTxt(mtf30DirUi, mtf30LvlUi) +
     "  •  H1 " + f_mtfTxt(mtf1hDirUi, mtf1hLvlUi) +
     "  •  H4 " + f_mtfTxt(mtf4hDirUi, mtf4hLvlUi) +
     "  •  D1 " + f_mtfTxt(mtfD1DirUi, mtfD1LvlUi)

latestEvent = "NO REJECTION EVENT"
if len(recentEvtTime) > 0:
eDir = recentEvtDir[int(0)]
eSide = eDir == 1 ? "BULL" : "BEAR"
eTime = str.format_time(recentEvtTime[int(0)], "HH:mm", "Europe/London")
eLvl = recentEvtLevel[int(0)]
ePos = recentEvtClosePos[int(0)]
eEff = recentEvtEffort[int(0)]
    latestEvent = eTime + " " + eSide + " @" + runtime.str_tostring(eLvl, format.mintick) +
         " • " + runtime.str_tostring(ePos, "#") + "% • " + runtime.str_tostring(eEff, "#.00") + "×"

//=============================================================================
// SFA 🐋 WHALE ZONES STIKE — V7 SIGNAL-SYNC DASHBOARD
//
// The member can now read four independent states with no contradiction:
// 1. FLIGHT SIGNAL
// 2. TRADE STATUS
// 3. LAST REAL SIGNAL
// 4. CURRENT SETUP
//=============================================================================
dashMobile = dashboardLayoutOpt == "Mobile" and showMobileDashboard
dashFull = dashboardLayoutOpt == "Full" or (dashboardLayoutOpt == "Mobile" and not showMobileDashboard)

mobileBuyMain =
     runtime.na(mapBuyTop) ? "BUY • --" :
     buyConfluence ?
         "BUY CONFLUENCE • " + buyDisplayTF + " • " +
         runtime.str_tostring(buyDisplayStrength) + "% " + buyDisplayStars :
         "BUY 1 • " + mapBuyTF + " • " +
         runtime.str_tostring(mapBuyStrength) + "% " + mapBuyStars

mobileBuyNext =
     buyConfluence ? "BUY 2 • MERGED" :
     runtime.na(mapBuy2Top) ? "NEXT BUY • --" :
     "NEXT BUY • " + mapBuy2TF + " • " +
     runtime.str_tostring(mapBuy2Strength) + "% " + mapBuy2Stars

mobileSellMain =
     runtime.na(mapSellTop) ? "SELL • --" :
     sellConfluence ?
         "SELL CONFLUENCE • " + sellDisplayTF + " • " +
         runtime.str_tostring(sellDisplayStrength) + "% " + sellDisplayStars :
         "SELL 1 • " + mapSellTF + " • " +
         runtime.str_tostring(mapSellStrength) + "% " + mapSellStars

mobileSellNext =
     sellConfluence ? "SELL 2 • MERGED" :
     runtime.na(mapSell2Top) ? "NEXT SELL • --" :
     "NEXT SELL • " + mapSell2TF + " • " +
     runtime.str_tostring(mapSell2Strength) + "% " + mapSell2Stars

mobileSteps =
     "1 ZONE " + step1State +
     "  •  2 REJ " + step2State +
     "  •  3 L2 " + step3State +
     "  •  4 RR " + step4State

mobileTradeLine =
     "ENTRY " + (runtime.na(rejTradeEntry) ? "--" : runtime.str_tostring(rejTradeEntry, format.mintick)) +
     "  •  INVALID " + (runtime.na(focusInvalid) ? "--" : runtime.str_tostring(focusInvalid, format.mintick))

mobileTargetLine =
     (focusDir == -1 ? "TARGET S1 " : "TARGET R1 ") +
     (runtime.na(focusNextLevel) ? "--" : runtime.str_tostring(focusNextLevel, format.mintick)) +
     "  •  RR " + (runtime.na(focusRR) ? "--" : runtime.str_tostring(focusRR, "#.##")) +
     (runtime.na(focusRR) ? "" : focusSpaceOk ? " ✓" : " POOR")

mobileManageLine =
     "P/L " + rejPlText +
     "  •  BE " + rejBeText +
     "  •  " + (persistentAlerts ? "PERMANENT ALERTS ON 🔔" : "ALERTS OFF")

mobileMtf1 =
     "1M " + f_mtfTxt(mtf1DirUi, mtf1LvlUi) +
     "  •  5M " + f_mtfTxt(mtf5DirUi, mtf5LvlUi) +
     "  •  15M " + f_mtfTxt(mtf15DirUi, mtf15LvlUi)

mobileMtf2 =
     "30M " + f_mtfTxt(mtf30DirUi, mtf30LvlUi) +
     "  •  H1 " + f_mtfTxt(mtf1hDirUi, mtf1hLvlUi) +
     "  •  H4 " + f_mtfTxt(mtf4hDirUi, mtf4hLvlUi) +
     "  •  D1 " + f_mtfTxt(mtfD1DirUi, mtfD1LvlUi)

fullStrengthLine =
     zoneStars + "  " + runtime.str_tostring(zoneStrengthPct) + "% • " + zoneGrade +
     "  |  QUALITY " + runtime.str_tostring(qualityScore) + "/8" +
     "  |  VSA " + effortText

// V15 compact Mobile-only display strings.
mobileFlightShort =
     radarDir == 1 ?
         "✈ FLIGHT BUY • " + runtime.str_tostring(radarConfidence, "#") + "% • " + runningAge :
     radarDir == -1 ?
         "✈ FLIGHT SELL • " + runtime.str_tostring(radarConfidence, "#") + "% • " + runningAge :
     "✈ FLIGHT WAIT"

mobileSetupShort =
     rejTradeDir != 0 and decisionTargetIsConflict and decisionTargetFresh ? "CONFLICT • WAIT OUTSIDE" :
     rejTradeDir == -1 and decisionTargetFresh ? "SELL • BUY ZONE • DECIDE" :
     rejTradeDir == 1 and decisionTargetFresh ? "BUY • SELL ZONE • DECIDE" :
     rejTradeDir == -1 ? "SELL ACTIVE • HOLD" :
     rejTradeDir == 1 ? "BUY ACTIVE • HOLD" :
     idleBuyArmed ? "BUY ZONE LOCKED" :
     idleSellArmed ? "SELL ZONE LOCKED" :
     "SETUP • WAIT FOR ZONE"

mobileConfirmShort =
     rejTradeDir != 0 and decisionTargetIsConflict and decisionTargetFresh ?
          "CONFLICT • EXIT CLUSTER FIRST" :
     rejTradeDir != 0 and decisionTargetFresh ? "TARGET • REJECT = REVERSE • BREAK = CONTINUE" :
     rejTradeDir != 0 ? rejTradeDir == -1 ? "WAIT • CURRENT BUY BOX" : "WAIT • CURRENT SELL BOX" :
     idleBuyArmed ? "ENTRY • BODY 100% ABOVE BUY BOX" :
     idleSellArmed ? "ENTRY • BODY 100% BELOW SELL BOX" :
     "ENTRY • FIRST 100% OUTSIDE CANDLE"

mobileStrengthShort =
     "ZONE " + runtime.str_tostring(zoneStrengthPct) + "% " + zoneStars +
     " • Q " + runtime.str_tostring(qualityScore) + "/8"

mobileAdxShort =
     "ADX 5M " + runtime.str_tostring(adx5, "#.0") +
     " • " + adxStatus +
     " • " + adxTradeIdea

mobileEntryShort =
     "ENTRY " + (runtime.na(rejTradeEntry) ? "--" : runtime.str_tostring(rejTradeEntry, format.mintick)) +
     " • " + decisionEntryTimeText +
     " • AGE " + decisionTradeAgeText

mobileExitWatchShort =
     decisionExitWatchText

mobileTargetShort =
     (focusDir == -1 ? "NEXT S1 " : "NEXT R1 ") +
     (runtime.na(focusNextLevel) ? "--" : runtime.str_tostring(focusNextLevel, format.mintick)) +
     " • INV " + (runtime.na(decisionInvalidDisplay) ? "--" : runtime.str_tostring(decisionInvalidDisplay, format.mintick)) +
     " • RR " + (runtime.na(focusRR) ? "--" : runtime.str_tostring(focusRR, "#.##"))

mobileManageShort =
     "P/L " + rejPlText +
     " • " + (rejTradeDir != 0 ? "ZONE HOLD ACTIVE" : "WAIT") +
     " • " + (persistentAlerts ? "ALERTS ON 🔔" : "ALERTS OFF")

//=============================================================================
// V20.2 FIXED MAJOR TARGET REACH — CARD DISPLAY ONLY
//=============================================================================
if not decisionContinueEvent and not rejBuyEntryEvent and not rejSellEntryEvent:
    if rejTradeDir == 1 and cardLockedDir == 1 and not cardTargetReached and not runtime.na(cardTargetBot):
        if runtime.high >= cardTargetBot:
            cardTargetReached = true
            cardTargetReachedBar = runtime.bar_index
    if rejTradeDir == -1 and cardLockedDir == -1 and not cardTargetReached and not runtime.na(cardTargetTop):
        if runtime.low <= cardTargetTop:
            cardTargetReached = true
            cardTargetReachedBar = runtime.bar_index

//=============================================================================
// V20 PREMIUM TRADE CARD — DISPLAY ONLY
//=============================================================================
f_cardRange(float bot, float top) =>
    runtime.na(bot) or runtime.na(top) ? "--" :
     runtime.str_tostring(bot, format.mintick) + " — " + runtime.str_tostring(top, format.mintick)

f_cardProgress(float r) =>
safe = runtime.na(r) ? 0.0 : runtime.math_max(0.0, runtime.math_min(5.0, r))
filled = int(runtime.math_round(safe / 5.0 * 10.0))
s = ""
    for i = 0 to 9
        s += i < filled ? "█" : "░"
    s

cardRisk =
     rejTradeDir == 0 or runtime.na(rejTradeEntry) ? runtime.na :
     not runtime.na(rejTradeStop) ? runtime.math_abs(rejTradeEntry - rejTradeStop) :
     not runtime.na(rejTradeZoneInvalid) ? runtime.math_abs(rejTradeEntry - rejTradeZoneInvalid) :
     runtime.na

cardLiveR =
     rejTradeDir == 0 or runtime.na(cardRisk) or cardRisk <= 0 ? runtime.na :
     (runtime.close - rejTradeEntry) * rejTradeDir / cardRisk

cardTarget1 =
     rejTradeDir == 1 and cardLockedDir == 1 ? cardTargetBot :
     rejTradeDir == -1 and cardLockedDir == -1 ? cardTargetTop : runtime.na

cardTarget2 =
     rejTradeDir == 1 and cardLockedDir == 1 ? cardTargetTop :
     rejTradeDir == -1 and cardLockedDir == -1 ? cardTargetBot : runtime.na

cardTarget1R =
     rejTradeDir == 0 or runtime.na(cardTarget1) or runtime.na(cardRisk) or cardRisk <= 0 ? runtime.na :
     (cardTarget1 - rejTradeEntry) * rejTradeDir / cardRisk

//=============================================================================
// V20.6 PRE-ENTRY ZONE READY
//=============================================================================
f_zoneDistance(float bot, float top) =>
    runtime.na(bot) or runtime.na(top) ? runtime.na :
     runtime.close > top ? runtime.close - top :
     runtime.close < bot ? bot - runtime.close :
     0.0

readyBuyAvailable =
     rejTradeDir == 0 and
     not runtime.na(marketBuyVisualTop) and not runtime.na(marketBuyVisualBot)

readySellAvailable =
     rejTradeDir == 0 and
     not runtime.na(marketSellVisualTop) and not runtime.na(marketSellVisualBot)

readyBuyDistance =
     readyBuyAvailable ? f_zoneDistance(marketBuyVisualBot, marketBuyVisualTop) : runtime.na

readySellDistance =
     readySellAvailable ? f_zoneDistance(marketSellVisualBot, marketSellVisualTop) : runtime.na

readyZoneSide =
     idleBuyArmed ? 1 :
     idleSellArmed ? -1 :
     radarDir == 1 and readyBuyAvailable ? 1 :
     radarDir == -1 and readySellAvailable ? -1 :
     readyBuyAvailable and readySellAvailable ?
          (readyBuyDistance <= readySellDistance ? 1 : -1) :
     readyBuyAvailable ? 1 :
     readySellAvailable ? -1 : 0

readyZoneTouched =
     readyZoneSide == 1 ? idleBuyArmed :
     readyZoneSide == -1 ? idleSellArmed :
     false

readyZoneTop =
     readyZoneSide == 1 ?
          (idleBuyArmed ? decisionBuyTouchTop : marketBuyVisualTop) :
     readyZoneSide == -1 ?
          (idleSellArmed ? decisionSellTouchTop : marketSellVisualTop) :
     runtime.na

readyZoneBot =
     readyZoneSide == 1 ?
          (idleBuyArmed ? decisionBuyTouchBot : marketBuyVisualBot) :
     readyZoneSide == -1 ?
          (idleSellArmed ? decisionSellTouchBot : marketSellVisualBot) :
     runtime.na

readyZoneTf =
     readyZoneSide == 1 ? buyDisplayTF :
     readyZoneSide == -1 ? sellDisplayTF :
     "--"

readyDistance = f_zoneDistance(readyZoneBot, readyZoneTop)

readyDistanceAtr =
     runtime.na(readyDistance) or runtime.na(mapAtrNow) or mapAtrNow <= 0 ? runtime.na :
     readyDistance / mapAtrNow

readyTrigger =
     readyZoneSide == 1 ? readyZoneTop :
     readyZoneSide == -1 ? readyZoneBot :
     runtime.na

readyInvalid =
     readyZoneSide == 1 ? readyZoneBot :
     readyZoneSide == -1 ? readyZoneTop :
     runtime.na

[readyBuyMajorTop, readyBuyMajorBot, readyBuyMajorTf] =
     f_cardMajorSellTarget(readyZoneSide == 1 ? readyTrigger : runtime.na)

[readySellMajorTop, readySellMajorBot, readySellMajorTf] =
     f_cardMajorBuyTarget(readyZoneSide == -1 ? readyTrigger : runtime.na)

readyMajorTop =
     readyZoneSide == 1 ? readyBuyMajorTop :
     readyZoneSide == -1 ? readySellMajorTop :
     runtime.na

readyMajorBot =
     readyZoneSide == 1 ? readyBuyMajorBot :
     readyZoneSide == -1 ? readySellMajorBot :
     runtime.na

readyMajorTf =
     readyZoneSide == 1 ? readyBuyMajorTf :
     readyZoneSide == -1 ? readySellMajorTf :
     "--"

[readyBuyStepTop, readyBuyStepBot, readyBuyStepTf] =
     f_cardStepSellTarget(
          readyZoneSide == 1 ? readyTrigger : runtime.na,
          readyZoneSide == 1 ? readyMajorBot : runtime.na)

[readySellStepTop, readySellStepBot, readySellStepTf] =
     f_cardStepBuyTarget(
          readyZoneSide == -1 ? readyTrigger : runtime.na,
          readyZoneSide == -1 ? readyMajorTop : runtime.na)

readyStepTop =
     readyZoneSide == 1 ? readyBuyStepTop :
     readyZoneSide == -1 ? readySellStepTop :
     runtime.na

readyStepBot =
     readyZoneSide == 1 ? readyBuyStepBot :
     readyZoneSide == -1 ? readySellStepBot :
     runtime.na

readyStepTf =
     readyZoneSide == 1 ? readyBuyStepTf :
     readyZoneSide == -1 ? readySellStepTf :
     "--"

cardAtRisk =
     rejTradeDir == 1 ? buyTradeAtRisk :
     rejTradeDir == -1 ? sellTradeAtRisk :
     false

cardDistanceText =
     runtime.na(readyDistance) ? "--" :
     readyZoneTouched ? "0.0 ATR • TOUCHED" :
     showDistanceAtr and not runtime.na(readyDistanceAtr) ?
          runtime.str_tostring(readyDistanceAtr, "#.##") + "x ATR • " +
          runtime.str_tostring(readyDistance, format.mintick) :
     runtime.str_tostring(readyDistance, format.mintick)

cardDirection =
     rejTradeDir == 1 ? "BUY" :
     rejTradeDir == -1 ? "SELL" :
     readyZoneSide == 1 ? (readyZoneTouched ? "BUY TOUCH" : "BUY ZONE") :
     readyZoneSide == -1 ? (readyZoneTouched ? "SELL TOUCH" : "SELL ZONE") :
     "WAIT"

cardTf =
     rejTradeDir != 0 ? cardOriginTf :
     readyZoneSide != 0 ? readyZoneTf :
     f_chartTfText()

cardTargetTfText =
     rejTradeDir != 0 and cardLockedDir == rejTradeDir ? cardTargetTf : "--"

cardStepRange =
     rejTradeDir != 0 and cardStepDir == rejTradeDir and not runtime.na(cardStepTop) ?
          f_cardRange(cardStepBot, cardStepTop) : "--"

cardStepText =
     cardStepReached ? "STEP " + cardStepTf + " REACHED" :
     rejTradeDir != 0 and cardStepDir == rejTradeDir and not runtime.na(cardStepTop) ?
          "STEP " + cardStepTf + " 🔒" :
     rejTradeDir != 0 ? "NO SMALL STEP" :
     "WAIT"

cardZoneLockText =
     cardTargetReached ? "MAJOR " + cardTargetTf + " REACHED 🎯" :
     rejTradeDir != 0 and cardLockedDir == rejTradeDir and not runtime.na(cardTargetTop) ?
          "MAJOR " + cardTargetTf + " 🔒" :
     rejTradeDir != 0 ? "NO VALID MAJOR TARGET" :
     "LIVE WATCH"

cardHeat = zoneStrengthPct >= 75 ? " 🔥" : zoneStrengthPct >= 60 ? " ⚡" : ""

cardTradeBar =
     rejTradeDir != 0 ?
          (cardAtRisk ? "⚠ ACTIVE • AT RISK" : "● TRADE ACTIVE") :
     readyZoneTouched ? "● TOUCHED • WAIT CLOSE" :
     showZoneReadyCard and readyZoneSide != 0 ? "● ZONE READY" :
     sfaInLiveRebuildWindow ? "● WAIT LIVE SETUP" :
     "● HISTORY"

cardZoneRange =
     rejTradeDir != 0 ? f_cardRange(cardOriginBot, cardOriginTop) :
     readyZoneSide != 0 ? f_cardRange(readyZoneBot, readyZoneTop) :
     "--"

cardStop =
     slDisplayMode == "Off" ?
          (runtime.na(rejTradeZoneInvalid) ? "--" : runtime.str_tostring(rejTradeZoneInvalid, format.mintick) + " INV") :
     runtime.na(rejTradeStop) ? "--" : runtime.str_tostring(rejTradeStop, format.mintick)

cardRR = runtime.na(cardTarget1R) ? "--" : "1 : " + runtime.str_tostring(cardTarget1R, "#.##")

cardConfirm =
     rejTradeDir == 1 ?
          (cardAtRisk ?
               "AT RISK • price crossed BUY invalidation • WAIT CURRENT CANDLE CLOSE" :
               "CONFIRMED • closed 100% above BUY box • entry valid") :
     rejTradeDir == -1 ?
          (cardAtRisk ?
               "AT RISK • price crossed SELL invalidation • WAIT CURRENT CANDLE CLOSE" :
               "CONFIRMED • closed 100% below SELL box • entry valid") :
     readyZoneSide == 1 and readyZoneTouched ?
          "TOUCHED • candle must CLOSE 100% above BUY box • otherwise NO ENTRY" :
     readyZoneSide == -1 and readyZoneTouched ?
          "TOUCHED • candle must CLOSE 100% below SELL box • otherwise NO ENTRY" :
     readyZoneSide == 1 ?
          "ZONE READY • wait for BUY-zone touch • then wait CLOSED confirmation" :
     readyZoneSide == -1 ?
          "ZONE READY • wait for SELL-zone touch • then wait CLOSED confirmation" :
     "WAIT • no valid current zone ready"

cardAction =
     rejTradeDir == 1 ?
          (cardAtRisk ? "BUY • WAIT CLOSE" :
           cardStepReached ? "BUY • DECIDE STEP" :
           cardTargetReached ? "BUY • DECIDE MAJOR" : "BUY • HOLD") :
     rejTradeDir == -1 ?
          (cardAtRisk ? "SELL • WAIT CLOSE" :
           cardStepReached ? "SELL • DECIDE STEP" :
           cardTargetReached ? "SELL • DECIDE MAJOR" : "SELL • HOLD") :
     readyZoneSide == 1 ?
          (readyZoneTouched ? "BUY • CONFIRM?" : "BUY • READY") :
     readyZoneSide == -1 ?
          (readyZoneTouched ? "SELL • CONFIRM?" : "SELL • READY") :
     "WAIT"

cardManage =
     rejTradeDir == 0 ?
          (readyZoneSide == 0 ?
               (sfaInLiveRebuildWindow ? "WAIT • no current zone ready" : "HISTORY • rebuilding live state") :
           readyZoneTouched ?
               "WAIT CONFIRMATION • touch alone is NOT an entry" :
               "ZONE DETECTED • wait for touch • no active trade yet") :
     cardAtRisk ?
          "AT RISK • do not flip intrabar • WAIT CLOSED CANDLE" :
     cardStepReached ?
          "STEP DECISION • REJECT = reverse • BREAK = next step" :
     cardTargetReached ?
          "MAJOR DECISION • REJECT = reverse • BREAK = next major" :
     not runtime.na(cardStepTop) ?
          "STEP-BY-STEP • next " + cardStepTf + " checkpoint • major " + cardTargetTf :
     not runtime.na(cardTargetTop) ?
          "NO SMALL STEP • hold directly to major " + cardTargetTf :
     "WAIT • no valid opposite zone ahead"

cardPL = runtime.na(rejTradePl) ? "--" : "$" + runtime.str_tostring(rejTradePl, "#.00")
cardRText = runtime.na(cardLiveR) ? "--" : runtime.str_tostring(cardLiveR, "#.##") + "R"
cardBar = f_cardProgress(cardLiveR)

//=============================================================================
// V20 ELITE PRO DASHBOARD
// Premium spacing + clean hierarchy.
// Trading logic is intentionally untouched.
//=============================================================================

// -----------------------------------------------------------------------------
// PREMIUM PALETTE
// -----------------------------------------------------------------------------
// V20.8 DIGITAL TERMINAL PALETTE
proBg = runtime.color_rgb(3, 8, 14)
proHeader = runtime.color_rgb(5, 15, 25)
proLabelBg = runtime.color_rgb(8, 20, 31)
proValueBg = runtime.color_rgb(4, 12, 20)
proSection = runtime.color_rgb(4, 11, 18)
proBlueBg = runtime.color_rgb(7, 30, 45)

proGold = runtime.color_rgb(255, 193, 47)
proWhite = runtime.color_rgb(238, 244, 248)
proMuted = runtime.color_rgb(112, 139, 157)

proBuyBg = runtime.color_rgb(4, 58, 43)
proSellBg = runtime.color_rgb(71, 17, 28)
proWarnBg = runtime.color_rgb(76, 48, 8)

// -----------------------------------------------------------------------------
// SHORT DISPLAY HELPERS
// -----------------------------------------------------------------------------
f_proRange(float bot, float top) =>
    runtime.na(bot) or runtime.na(top) ? "--" :
     runtime.str_tostring(bot, format.mintick) + " – " + runtime.str_tostring(top, format.mintick)

f_proStrength(int pct) =>
    pct >= 80 ? runtime.str_tostring(pct) + "% • ELITE" :
     pct >= 65 ? runtime.str_tostring(pct) + "% • STRONG" :
     pct >= 45 ? runtime.str_tostring(pct) + "% • GOOD" :
     runtime.str_tostring(pct) + "% • WEAK"

f_proMtf(string tf, int dir, int lvl) =>
    tf + " " +
     (lvl >= 2 ? (dir == 1 ? "BUY" : dir == -1 ? "SELL" : "WAIT") :
      lvl == 1 ? (dir == 1 ? "B-WATCH" : dir == -1 ? "S-WATCH" : "WAIT") :
      "WAIT")

proAction =
     decisionTargetIsConflict and decisionTargetFresh ? "WAIT OUTSIDE" :
     rejTradeDir == 1 and decisionTargetFresh ? "BUY • DECIDE" :
     rejTradeDir == -1 and decisionTargetFresh ? "SELL • DECIDE" :
     rejTradeDir == 1 ? "BUY • HOLD" :
     rejTradeDir == -1 ? "SELL • HOLD" :
     idleBuyArmed ? "WATCH BUY" :
     idleSellArmed ? "WATCH SELL" :
     "WAIT"

proState =
     rejTradeDir == 1 ? "BUY ACTIVE" :
     rejTradeDir == -1 ? "SELL ACTIVE" :
     "NO TRADE"

proDecision =
     decisionTargetIsConflict and decisionTargetFresh ? "CONFLICT • WAIT" :
     rejTradeDir == -1 and decisionTargetFresh ? "BUY BOX • REJECT / BREAK" :
     rejTradeDir == 1 and decisionTargetFresh ? "SELL BOX • REJECT / BREAK" :
     rejTradeDir == -1 ? "NEXT BUY BOX" :
     rejTradeDir == 1 ? "NEXT SELL BOX" :
     idleBuyArmed ? "WAIT 100% ABOVE" :
     idleSellArmed ? "WAIT 100% BELOW" :
     "WAIT ZONE"

proAdx =
     runtime.str_tostring(adx5, "#.0") + " • " +
     (adx5 >= adxReadyLevel ? "STRONG" :
      adx5 >= adxCautionLevel ? "BUILDING" : "SIDEWAY")

proBuyBox =
     f_proRange(marketBuyVisualBot, marketBuyVisualTop) + " • " + buyDisplayTF

proSellBox =
     f_proRange(marketSellVisualBot, marketSellVisualTop) + " • " + sellDisplayTF

proEntry =
     runtime.na(rejTradeEntry) ? "--" : runtime.str_tostring(rejTradeEntry, format.mintick)

proAge =
     rejTradeDir == 0 ? "--" : decisionTradeAgeText

proNext =
     decisionTargetFresh ? f_proRange(decisionTargetBot, decisionTargetTop) :
     rejTradeDir == -1 ? f_proRange(marketBuyVisualBot, marketBuyVisualTop) :
     rejTradeDir == 1 ? f_proRange(marketSellVisualBot, marketSellVisualTop) :
     "--"

proNextName =
     decisionTargetIsConflict and decisionTargetFresh ? "CONFLICT" :
     "NEXT"

proFresh =
     decisionTargetFresh ?
          runtime.str_tostring(decisionTargetAge) + "/" + runtime.str_tostring(targetDecisionBars) :
     "--"

proConflict =
     decisionTargetIsConflict and decisionTargetFresh ? "ACTIVE • WAIT" :
     decisionZoneConflict ? "NEAR" :
     "CLEAR"

proRR =
     runtime.na(focusRR) ? "--" : runtime.str_tostring(focusRR, "#.##")

proPL = rejPlText

proQuality =
     runtime.str_tostring(zoneStrengthPct) + "% • Q" + runtime.str_tostring(qualityScore)

proFlight =
     radarDir == 1 ? "BUY " + runtime.str_tostring(radarConfidence, "#") + "%" :
     radarDir == -1 ? "SELL " + runtime.str_tostring(radarConfidence, "#") + "%" :
     "WAIT"

proAlert =
     persistentAlerts ? "ON 🔔" : "OFF"

proCandle =
     barstate.isconfirmed ? "CLOSED ✓" : "LIVE"

proMtf1 = f_proMtf("1M",  mtf1DirUi,  mtf1LvlUi)
proMtf5 = f_proMtf("5M",  mtf5DirUi,  mtf5LvlUi)
proMtf15 = f_proMtf("15M", mtf15DirUi, mtf15LvlUi)
proMtf30 = f_proMtf("30M", mtf30DirUi, mtf30LvlUi)
proMtfH1 = f_proMtf("H1",  mtf1hDirUi, mtf1hLvlUi)
proMtfH4 = f_proMtf("H4",  mtf4hDirUi, mtf4hLvlUi)
proMtfD1 = f_proMtf("D1",  mtfD1DirUi,  mtfD1LvlUi)

// Phone-specific ultra-short strings for the auto-sized card.
mobileAction =
     decisionTargetIsConflict and decisionTargetFresh ? "WAIT OUTSIDE" :
     rejTradeDir == 1 and decisionTargetFresh ? "BUY DECIDE" :
     rejTradeDir == -1 and decisionTargetFresh ? "SELL DECIDE" :
     rejTradeDir == 1 ? "BUY HOLD" :
     rejTradeDir == -1 ? "SELL HOLD" :
     idleBuyArmed ? "WATCH BUY" :
     idleSellArmed ? "WATCH SELL" :
     "WAIT"

mobileDecision =
     decisionTargetIsConflict and decisionTargetFresh ? "CONFLICT • WAIT" :
     rejTradeDir == -1 and decisionTargetFresh ? "BUY BOX • R/B" :
     rejTradeDir == 1 and decisionTargetFresh ? "SELL BOX • R/B" :
     rejTradeDir == -1 ? "NEXT BUY BOX" :
     rejTradeDir == 1 ? "NEXT SELL BOX" :
     idleBuyArmed ? "100% ABOVE BUY" :
     idleSellArmed ? "100% BELOW SELL" :
     "WAIT ZONE"

mobileAdx =
     runtime.str_tostring(adx5, "#.0") + " " +
     (adx5 >= adxReadyLevel ? "STRONG" :
      adx5 >= adxCautionLevel ? "BUILD" : "SIDEWAY")

mobileEntry =
     proEntry + (rejTradeDir == 0 ? "" : " • " + proAge)

mobileNext = proNext

mobileZone =
     "Q" + runtime.str_tostring(qualityScore) +
     " • " + runtime.str_tostring(zoneStrengthPct) + "%" +
     " • " + (decisionZoneConflict ? "CONFLICT" : "CLEAR")

mobilePL =
     proPL + " • " + (persistentAlerts ? "ALERT ON" : "ALERT OFF")

// -----------------------------------------------------------------------------
// COLOR STATES
// -----------------------------------------------------------------------------
proActionColor =
     decisionTargetIsConflict and decisionTargetFresh ? proGold :
     rejTradeDir == 1 ? bullColor :
     rejTradeDir == -1 ? bearColor :
     neutralColor

proActionBg =
     decisionTargetIsConflict and decisionTargetFresh ? proWarnBg :
     rejTradeDir == 1 ? proBuyBg :
     rejTradeDir == -1 ? proSellBg :
     proValueBg

proDecisionColor =
     decisionTargetFresh ? proGold : proWhite

proAdxColor =
     adx5 >= adxReadyLevel ? bullColor :
     adx5 >= adxCautionLevel ? proGold :
     bearColor

// -----------------------------------------------------------------------------
// SFA 🐋 WHALE ZONES STIKE — PREMIUM DIGITAL DASHBOARD V2.7 BTC ADAPTIVE HOLD
// UI ONLY. The locked Zone engine and locked WHALE signal engine above are untouched.
// P/L is always calculated from WHALE signal ENTRY -> EXIT / LIVE PRICE, never
// zone-to-zone. Fixed SFA money logic remains unchanged (Gold 0.10 basis, etc.).
// Full history stores up to 100 trades and uses 25-trade pages because Pine tables
// do not provide an interactive scrollbar.
// -----------------------------------------------------------------------------
whaleHistoryRows =
     whaleHistoryRowsOpt == "25" ? 25 :
     whaleHistoryRowsOpt == "50" ? 50 : 100

whaleHistoryPage =
     whaleHistoryPageOpt == "2" ? 2 :
     whaleHistoryPageOpt == "3" ? 3 :
     whaleHistoryPageOpt == "4" ? 4 : 1

whaleHistoryMaxPage = int(runtime.math_ceil(whaleHistoryRows / 25.0))
whaleHistoryPageSafe = runtime.math_min(whaleHistoryPage, whaleHistoryMaxPage)
whaleHistoryPageStart = (whaleHistoryPageSafe - 1) * 25

if 'whaleMainPanel' not in locals(): whaleMainPanel = table.new(
     f_dashboardPos(desktopPosOpt), 6, 17,
     bgcolor=proBg,
     frame_color=proGold,
     frame_width=1,
     border_color=runtime.color_new(infoBlue, 82),
     border_width=1)

if 'whaleHistoryPanel' not in locals(): whaleHistoryPanel = table.new(
     f_dashboardPos(flightMonthPanelPosOpt), 7, 28,
     bgcolor=proBg,
     frame_color=proGold,
     frame_width=1,
     border_color=runtime.color_new(infoBlue, 84),
     border_width=1)

// Separate compact DIGITAL signal strip. V2.7 keeps ADX / MARKET and makes all DIGITAL text true bold.
if 'whaleDigitalStrip' not in locals(): whaleDigitalStrip = table.new(
     f_dashboardPos(digitalStripPosOpt), 6, 3,
     bgcolor=runtime.color_rgb(5, 17, 24),
     frame_color=proGold,
     frame_width=2,
     border_color=runtime.color_new(infoBlue, 72),
     border_width=1)

f_digitalStripTextSize() =>
    digitalStripSizeOpt == "Tiny" ? "tiny" :
     digitalStripSizeOpt == "Small" ? "small" :
     digitalStripSizeOpt == "Normal" ? "normal" : "large"

f_digitalStripCell(int col, int row, string txt, color txtColor, color bgColor) =>
    table.cell(
         whaleDigitalStrip, col, row, txt,
         text_color=txtColor,
         bgcolor=bgColor,
         text_size=f_digitalStripTextSize(),
         text_formatting=text.format_bold,
         text_halign=text.align_center,
         text_valign=text.align_center)

f_renderDigitalSignalStrip() =>
    table.set_position(whaleDigitalStrip, f_dashboardPos(digitalStripPosOpt))
    table.clear(whaleDigitalStrip, 0, 0, 5, 2)

stripTradeOpen = flightLedgerTradeDir != 0 and not runtime.na(flightLedgerTradeEntry)
stripHeldTrade = flightLedgerUseHold and stripTradeOpen
stripDir = stripHeldTrade ? flightLedgerTradeDir : radarDir
stripEntry = stripHeldTrade ? flightLedgerTradeEntry : radarEntry
stripLot = stripHeldTrade ?
         (runtime.na(flightLedgerTradeLot) ? dashboardLotSize : flightLedgerTradeLot) :
         (runtime.na(radarEntryLot) ? dashboardLotSize : radarEntryLot)

stripLivePl = stripDir != 0 and not runtime.na(stripEntry) ?
         f_dashboardPlLot(stripEntry, runtime.close, stripDir, stripLot) : runtime.na
stripLivePct = stripDir != 0 and not runtime.na(stripEntry) and stripEntry != 0 ?
         (runtime.close - stripEntry) * stripDir / stripEntry * 100.0 : runtime.na

stripAge = stripHeldTrade and not runtime.na(flightLedgerTradeEntryTime) ?
         f_ageText(flightLedgerTradeEntryTime) : radarDir == 0 ? "--" : runningAge
stripSide = stripDir == 1 ? "🐋 WHALE BUY" : stripDir == -1 ? "🐋 WHALE SELL" : "🐋 WHALE WAIT"
stripRun = stripDir == 0 ? "WAIT" : "⚡ RUNNING"
stripSignalBg = stripDir == 1 ? runtime.color_rgb(0, 82, 54) : stripDir == -1 ? runtime.color_rgb(104, 38, 47) : runtime.color_rgb(19, 36, 46)
stripLiveColor = runtime.na(stripLivePl) ? proMuted : stripLivePl >= 0 ? bullColor : bearColor
stripPl = runtime.na(stripLivePl) ? "--" : f_moneyText(stripLivePl)
stripPct = runtime.na(stripLivePct) ? "--" : (stripLivePct >= 0 ? "+" : "") + runtime.str_tostring(stripLivePct, "#.00") + "%"

    // Header row — intentionally clean and runtime.high contrast.
    f_digitalStripCell(0, 0, "SFA 🐋", proGold, runtime.color_rgb(5, 17, 24))
    f_digitalStripCell(1, 0, "WHALE ZONES", proWhite, runtime.color_rgb(5, 17, 24))
    f_digitalStripCell(2, 0, runtime.syminfo.ticker, infoBlue, runtime.color_rgb(5, 17, 24))
    f_digitalStripCell(3, 0, f_chartTfText(), proWhite, runtime.color_rgb(5, 17, 24))
    f_digitalStripCell(4, 0, "PREMIUM", proGold, runtime.color_rgb(5, 17, 24))
    f_digitalStripCell(5, 0, "V2.7", bullColor, runtime.color_rgb(5, 17, 24))

    // Main signal row — larger DIGITAL writing.
    f_digitalStripCell(0, 1, stripRun, "#ffffff", stripSignalBg)
    f_digitalStripCell(1, 1, stripSide, "#ffffff", stripSignalBg)
    f_digitalStripCell(2, 1, "LIVE P/L\n" + stripPl + "\n" + stripPct, stripLiveColor, runtime.color_rgb(5, 28, 27))
    f_digitalStripCell(3, 1, "CONF\n" + runtime.str_tostring(radarConfidence, "#") + "%", proWhite, runtime.color_rgb(5, 17, 24))
    f_digitalStripCell(4, 1, "AGE\n" + stripAge, proGold, runtime.color_rgb(5, 17, 24))
    f_digitalStripCell(5, 1, "ALERT\n" + (persistentAlerts ? "ON" : "OFF"), persistentAlerts ? bullColor : bearColor, runtime.color_rgb(5, 17, 24))

    // V2.7 DIGITAL row — ADX + MARKET retained; all DIGITAL cells are bold. Logic is untouched.
stripMarketText =
         marketSideways or adx5 < adxCautionLevel ? "SIDEWAY" :
         stripDir == 1 ? "TREND UP" :
         stripDir == -1 ? "TREND DOWN" : "WAIT"
stripMarketColor =
         stripMarketText == "SIDEWAY" ? proGold :
         stripMarketText == "TREND UP" ? bullColor :
         stripMarketText == "TREND DOWN" ? bearColor : proMuted

    f_digitalStripCell(0, 2, "ADX 5M", proMuted, runtime.color_rgb(8, 24, 31))
    f_digitalStripCell(1, 2, runtime.str_tostring(adx5, "#.0"), proAdxColor, runtime.color_rgb(8, 24, 31))
    f_digitalStripCell(2, 2, adxStatus, proAdxColor, runtime.color_rgb(8, 24, 31))
    f_digitalStripCell(3, 2, "MARKET", proMuted, runtime.color_rgb(8, 24, 31))
    f_digitalStripCell(4, 2, stripMarketText, stripMarketColor, runtime.color_rgb(8, 24, 31))
    f_digitalStripCell(5, 2, adxTradeIdea, adxTradeIdeaColor, runtime.color_rgb(8, 24, 31))

// V2.7: DIGITAL text-formatting update only. GOLD/SILVER keep V2.4 hold + protected-profit ladder.
// BTC: HOLD through neutral/same-side continuation + adaptive closed-candle protection.
// BTC: +$500→+$100, +$1,000→+$500, +$1,500→+$750, +$2,000→+$1,000, then 60% of peak.
// ETH / FOREX remain V2.1.
// No merged cells are used. Every visible dashboard cell contains useful information.
// Zone engine, WHALE signal engine, entries, confirmations, EMA200, ADX and history logic remain unchanged.
// IMPORTANT: no artificial hard stop is added before the instrument-specific protection trigger.

f_whaleBodySize() =>
    desktopSizeOpt == "Tiny" ? "tiny" :
     desktopSizeOpt == "Small" ? "tiny" :
     desktopSizeOpt == "Normal" ? "small" : "normal"

f_whaleHeaderSize() =>
    desktopSizeOpt == "Tiny" ? "tiny" :
     desktopSizeOpt == "Small" ? "small" :
     desktopSizeOpt == "Normal" ? "normal" : "large"

f_whaleHistoryBodySize() =>
    flightMonthPanelSizeOpt == "Normal" ? "small" : "tiny"

f_whaleHistoryHeaderSize() =>
    flightMonthPanelSizeOpt == "Tiny" ? "tiny" :
     flightMonthPanelSizeOpt == "Small" ? "small" : "normal"

f_whaleCell(int col, int row, string txt, color txtColor, color bgColor, bool header) =>
    table.cell(
         whaleMainPanel, col, row, txt,
         text_color=txtColor,
         bgcolor=bgColor,
         text_size=header ? f_whaleHeaderSize() : f_whaleBodySize(),
         text_halign=text.align_center,
         text_valign=text.align_center)

f_whaleHistoryCell(int col, int row, string txt, color txtColor, color bgColor, bool header) =>
    table.cell(
         whaleHistoryPanel, col, row, txt,
         text_color=txtColor,
         bgcolor=bgColor,
         text_size=header ? f_whaleHistoryHeaderSize() : f_whaleHistoryBodySize(),
         text_halign=text.align_center,
         text_valign=text.align_center)

f_renderWhaleMain() =>
    table.set_position(whaleMainPanel, f_dashboardPos(desktopPosOpt))
    table.clear(whaleMainPanel, 0, 0, 5, 16)

whaleTradeOpen = flightLedgerTradeDir != 0 and not runtime.na(flightLedgerTradeEntry)

    // V2.5 dashboard: Gold/Silver + BTC display the HELD ledger direction and
    // original ledger entry through a neutral radar phase. Signal engine is untouched.
heldTrade = flightLedgerUseHold and whaleTradeOpen
whaleDisplayDir = heldTrade ? flightLedgerTradeDir : radarDir
whaleDisplayEntry = heldTrade ? flightLedgerTradeEntry : radarEntry
signalLot = heldTrade ?
         (runtime.na(flightLedgerTradeLot) ? dashboardLotSize : flightLedgerTradeLot) :
         (runtime.na(radarEntryLot) ? dashboardLotSize : radarEntryLot)

livePl = whaleDisplayDir != 0 and not runtime.na(whaleDisplayEntry) ?
         f_dashboardPlLot(whaleDisplayEntry, runtime.close, whaleDisplayDir, signalLot) : runtime.na
livePlColor = runtime.na(livePl) ? proMuted : livePl >= 0 ? bullColor : bearColor

livePlPct = runtime.na
    if whaleDisplayDir != 0 and not runtime.na(whaleDisplayEntry) and whaleDisplayEntry != 0:
        livePlPct = (runtime.close - whaleDisplayEntry) * whaleDisplayDir / whaleDisplayEntry * 100.0

livePlText = f_moneyText(livePl)
livePlPctText = runtime.na(livePlPct) ? "--" : (livePlPct >= 0 ? "+" : "") + runtime.str_tostring(livePlPct, "#.00") + "%"

whaleSignalActive = whaleDisplayDir != 0
whaleFlashOn = whaleSignalActive and (int(timenow / 650) % 2 == 0)

whaleFlashBg =
         not whaleSignalActive ? proValueBg :
         whaleDisplayDir == 1 ? (whaleFlashOn ? runtime.color_new("#00ff00", 68) : runtime.color_new("#00ff00", 86)) :
         whaleDisplayDir == -1 ? (whaleFlashOn ? runtime.color_new("#f23645", 66) : runtime.color_new("#f23645", 86)) :
         proValueBg

whaleFlashText = whaleSignalActive ? "#ffffff" : proGold
whaleSideText = whaleDisplayDir == 1 ? "🐋 WHALE BUY" : whaleDisplayDir == -1 ? "🐋 WHALE SELL" : "🐋 WHALE WAIT"
runningText = whaleDisplayDir == 0 ? "WAIT" : "⚡ RUNNING"

entryText = whaleTradeOpen ? runtime.str_tostring(flightLedgerTradeEntry, format.mintick) : whaleDisplayDir == 0 or runtime.na(whaleDisplayEntry) ? "--" : runtime.str_tostring(whaleDisplayEntry, format.mintick)
currentText = runtime.str_tostring(runtime.close, format.mintick)
ageText = heldTrade and not runtime.na(flightLedgerTradeEntryTime) ? f_ageText(flightLedgerTradeEntryTime) : radarDir == 0 ? "--" : runningAge

marketText =
         marketSideways or adx5 < adxCautionLevel ? "SIDEWAY" :
         whaleDisplayDir == 1 ? "TREND UP" :
         whaleDisplayDir == -1 ? "TREND DOWN" : "WAIT"

marketColor =
         marketText == "SIDEWAY" ? proGold :
         marketText == "TREND UP" ? bullColor :
         marketText == "TREND DOWN" ? bearColor : proMuted

emaDist = runtime.close - ema200
emaDistPct = not runtime.na(ema200) and ema200 != 0 ? emaDist / ema200 * 100.0 : runtime.na
emaPosText = runtime.close >= ema200 ? "ABOVE ↑" : "BELOW ↓"
emaPosColor = runtime.close >= ema200 ? bullColor : bearColor

lockedText =
         not whaleTradeOpen ? (radarDir != 0 ? "TRADE CLOSED" : "WAIT") :
         flightLedgerUseBtcAdaptiveHold ?
              (flightLedgerTrailSteps <= 0 ? "BTC HOLD" :
               "PROTECT " + f_moneyText(flightLedgerLockedUsd)) :
         flightLedgerUseMetalProfitLock ?
              (flightLedgerTrailSteps <= 0 ? "WAIT +$100" :
               "+$" + runtime.str_tostring(flightLedgerLockedUsd, "#.0")) :
         flightLedgerTrailSteps <= 0 ? "WAIT +$100 BE" :
         flightLedgerTrailSteps == 1 ? "BE LOCK" :
         "+$" + runtime.str_tostring(flightLedgerLockedUsd, "#.0")

nextMetalLockTriggerUsd =
         flightLedgerTrailSteps <= 0 ? flightMetalProtectTrigger1Usd :
         flightLedgerTrailSteps == 1 ? flightMetalProtectTrigger2Usd :
         flightLedgerTrailSteps == 2 ? flightMetalProtectTrigger3Usd :
         flightLedgerTrailSteps == 3 ? flightMetalProtectTrigger4Usd :
         flightMetalProtectTrigger5Usd + runtime.math_max(0, flightLedgerTrailSteps - 4) * flightMetalProtectStepUsd

nextStandardLockTriggerUsd =
         flightLedgerTrailSteps <= 0 ? flightLedgerBeTriggerUsd :
         flightLedgerTrailSteps == 1 ? flightLedgerFirstProfitLockTriggerUsd :
         flightLedgerFirstProfitLockTriggerUsd + (flightLedgerTrailSteps - 1) * flightLedgerLockStepUsd

btcPeakForDash = runtime.na(flightLedgerPeakUsd) ? 0.0 : flightLedgerPeakUsd
nextBtcProtectTriggerUsd =
         btcPeakForDash < flightBtcProtectTrigger1Usd ? flightBtcProtectTrigger1Usd :
         btcPeakForDash < flightBtcProtectTrigger2Usd ? flightBtcProtectTrigger2Usd :
         btcPeakForDash < flightBtcProtectTrigger3Usd ? flightBtcProtectTrigger3Usd :
         btcPeakForDash < flightBtcProtectTrigger4Usd ? flightBtcProtectTrigger4Usd : runtime.na

nextLockTriggerUsd =
         flightLedgerUseBtcAdaptiveHold ? nextBtcProtectTriggerUsd :
         flightLedgerUseMetalProfitLock ? nextMetalLockTriggerUsd : nextStandardLockTriggerUsd

nextLockText =
         not whaleTradeOpen ? "--" :
         flightLedgerUseBtcAdaptiveHold and btcPeakForDash >= flightBtcProtectTrigger4Usd ? "60% PEAK" :
         runtime.na(nextLockTriggerUsd) ? "--" : "+$" + runtime.str_tostring(nextLockTriggerUsd, "#.0")
trailStopText = whaleTradeOpen and not runtime.na(flightLedgerTrailStopPrice) ? runtime.str_tostring(flightLedgerTrailStopPrice, format.mintick) : "--"
bePriceText = whaleTradeOpen ? runtime.str_tostring(flightLedgerTradeEntry, format.mintick) : entryText
managementRefText =
         flightLedgerUseBtcAdaptiveHold ?
              (whaleTradeOpen ? f_moneyText(btcPeakForDash) : "--") : bePriceText

winRate = flightMonthTradeCount > 0 ? flightMonthWinCount * 100.0 / flightMonthTradeCount : runtime.na
lossRate = flightMonthTradeCount > 0 ? flightMonthLossCount * 100.0 / flightMonthTradeCount : runtime.na
beRate = flightMonthTradeCount > 0 ? flightMonthBeCount * 100.0 / flightMonthTradeCount : runtime.na
safeRate = flightMonthTradeCount > 0 ? (flightMonthWinCount + flightMonthBeCount) * 100.0 / flightMonthTradeCount : runtime.na

    // Row 0 — brand/header. Every box is used.
    f_whaleCell(0, 0, "SFA 🐋", proGold, proHeader, true)
    f_whaleCell(1, 0, "WHALE ZONES", proWhite, proHeader, true)
    f_whaleCell(2, 0, runtime.syminfo.ticker, infoBlue, proHeader, true)
    f_whaleCell(3, 0, f_chartTfText(), proWhite, proHeader, true)
    f_whaleCell(4, 0, "PREMIUM", proGold, proHeader, true)
    f_whaleCell(5, 0, "V2.5", bullColor, proHeader, true)

    // Row 1 — running signal + live P/L + confidence + age + alert. No empty space.
    f_whaleCell(0, 1, runningText, whaleFlashText, whaleFlashBg, true)
    f_whaleCell(1, 1, whaleSideText, whaleFlashText, whaleFlashBg, true)
    f_whaleCell(2, 1, "LIVE P/L\n" + livePlText + "\n" + livePlPctText, livePlColor, proValueBg, true)
    f_whaleCell(3, 1, "CONF\n" + runtime.str_tostring(radarConfidence, "#") + "%", proWhite, proValueBg, true)
    f_whaleCell(4, 1, "AGE\n" + ageText, proGold, proValueBg, true)
    f_whaleCell(5, 1, "ALERT\n" + (persistentAlerts ? "ON" : "OFF"), persistentAlerts ? bullColor : bearColor, proValueBg, true)

    // Rows 2-3 — live trade data.
    f_whaleCell(0, 2, "ENTRY", proMuted, proLabelBg, false)
    f_whaleCell(1, 2, "LIVE", proMuted, proLabelBg, false)
    f_whaleCell(2, 2, "LOCK", proMuted, proLabelBg, false)
    f_whaleCell(3, 2, "TRAIL SL", proMuted, proLabelBg, false)
    f_whaleCell(4, 2, "ADX 5M", proMuted, proLabelBg, false)
    f_whaleCell(5, 2, "MARKET", proMuted, proLabelBg, false)

    f_whaleCell(0, 3, entryText, proWhite, proValueBg, true)
    f_whaleCell(1, 3, currentText, proWhite, proValueBg, true)
    f_whaleCell(2, 3, lockedText, flightLedgerTrailSteps > 0 ? bullColor : proGold, proValueBg, true)
    f_whaleCell(3, 3, trailStopText, flightLedgerTrailSteps > 0 ? bullColor : proMuted, proValueBg, true)
    f_whaleCell(4, 3, runtime.str_tostring(adx5, "#.0"), proAdxColor, proValueBg, true)
    f_whaleCell(5, 3, marketText, marketColor, proValueBg, true)

    // Rows 4-5 — EMA200 / lock management.
    f_whaleCell(0, 4, "EMA200", proMuted, proLabelBg, false)
    f_whaleCell(1, 4, "DIST", proMuted, proLabelBg, false)
    f_whaleCell(2, 4, "DIST %", proMuted, proLabelBg, false)
    f_whaleCell(3, 4, flightLedgerUseBtcAdaptiveHold ? "PEAK P/L" : flightLedgerUseMetalProfitLock ? "ENTRY REF" : "BE PRICE", proMuted, proLabelBg, false)
    f_whaleCell(4, 4, "NEXT LOCK", proMuted, proLabelBg, false)
    f_whaleCell(5, 4, "POSITION", proMuted, proLabelBg, false)

    f_whaleCell(0, 5, runtime.str_tostring(ema200, format.mintick), infoBlue, proValueBg, true)
    f_whaleCell(1, 5, (emaDist >= 0 ? "+" : "") + runtime.str_tostring(emaDist, format.mintick), emaPosColor, proValueBg, true)
    f_whaleCell(2, 5, runtime.na(emaDistPct) ? "--" : (emaDistPct >= 0 ? "+" : "") + runtime.str_tostring(emaDistPct, "#.00") + "%", emaPosColor, proValueBg, true)
    f_whaleCell(3, 5, managementRefText, flightLedgerUseBtcAdaptiveHold ? bullColor : proWhite, proValueBg, true)
    f_whaleCell(4, 5, nextLockText, proGold, proValueBg, true)
    f_whaleCell(5, 5, emaPosText, emaPosColor, proValueBg, true)

    // Rows 6-7 — monthly performance.
    f_whaleCell(0, 6, "MONTH", proGold, proSection, true)
    f_whaleCell(1, 6, "WIN", proGold, proSection, true)
    f_whaleCell(2, 6, "LOSS", proGold, proSection, true)
    f_whaleCell(3, 6, "BE", proGold, proSection, true)
    f_whaleCell(4, 6, "SAFE %", proGold, proSection, true)
    f_whaleCell(5, 6, "NET P/L", proGold, proSection, true)

    f_whaleCell(0, 7, runtime.str_tostring(flightMonthSignalCount), proWhite, proValueBg, true)
    f_whaleCell(1, 7, runtime.str_tostring(flightMonthWinCount) + (runtime.na(winRate) ? "" : " • " + runtime.str_tostring(winRate, "0.0") + "%"), bullColor, proValueBg, true)
    f_whaleCell(2, 7, runtime.str_tostring(flightMonthLossCount) + (runtime.na(lossRate) ? "" : " • " + runtime.str_tostring(lossRate, "0.0") + "%"), bearColor, proValueBg, true)
    f_whaleCell(3, 7, runtime.str_tostring(flightMonthBeCount) + (runtime.na(beRate) ? "" : " • " + runtime.str_tostring(beRate, "0.0") + "%"), proGold, proValueBg, true)
    f_whaleCell(4, 7, runtime.na(safeRate) ? "--" : runtime.str_tostring(safeRate, "0.0") + "%", runtime.na(safeRate) ? proMuted : safeRate >= 80 ? bullColor : safeRate >= 60 ? proGold : bearColor, proValueBg, true)
    f_whaleCell(5, 7, f_moneyText(flightMonthNetPl), flightMonthNetPl > 0 ? bullColor : flightMonthNetPl < 0 ? bearColor : proWhite, proValueBg, true)

    // Row 8 — section bar split into useful boxes, no blanks.
    f_whaleCell(0, 8, "LAST 5", proGold, proSection, true)
    f_whaleCell(1, 8, "WHALE", proWhite, proSection, true)
    f_whaleCell(2, 8, "TRADE", proWhite, proSection, true)
    f_whaleCell(3, 8, "HISTORY", proWhite, proSection, true)
    f_whaleCell(4, 8, "ENTRY→EXIT", infoBlue, proSection, true)
    f_whaleCell(5, 8, showFlightMonthPanel ? "FULL ON" : "FULL OFF", showFlightMonthPanel ? bullColor : proMuted, proSection, true)

    // Row 9 — history headings.
    f_whaleCell(0, 9, "DATE/TIME", proGold, proLabelBg, true)
    f_whaleCell(1, 9, "SIDE", proGold, proLabelBg, true)
    f_whaleCell(2, 9, "ENTRY", proGold, proLabelBg, true)
    f_whaleCell(3, 9, "EXIT", proGold, proLabelBg, true)
    f_whaleCell(4, 9, "P/L", proGold, proLabelBg, true)
    f_whaleCell(5, 9, "RESULT", proGold, proLabelBg, true)

ledgerSize = len(flightLedgerPls)
    for rowOffset = 0 to 4
row = 10 + rowOffset
idx = ledgerSize - 1 - rowOffset
        if idx >= 0:
closeTime = flightLedgerCloseTimes[int(idx)]
closeDir = flightLedgerDirs[int(idx)]
closePl = flightLedgerPls[int(idx)]
closeEntry = flightLedgerEntries[int(idx)]
closeExit = flightLedgerExits[int(idx)]
resultText = closePl > 0 ? "WIN" : closePl < 0 ? "LOSS" : "BE"
resultColor = closePl > 0 ? bullColor : closePl < 0 ? bearColor : proGold

            f_whaleCell(0, row, str.format_time(closeTime, "dd MMM HH:mm", flightLedgerTimezone), proWhite, proValueBg, false)
            f_whaleCell(1, row, closeDir == 1 ? "BUY" : "SELL", closeDir == 1 ? bullColor : bearColor, proValueBg, false)
            f_whaleCell(2, row, runtime.str_tostring(closeEntry, format.mintick), proWhite, proValueBg, false)
            f_whaleCell(3, row, runtime.str_tostring(closeExit, format.mintick), proWhite, proValueBg, false)
            f_whaleCell(4, row, f_moneyText(closePl), resultColor, proValueBg, true)
            f_whaleCell(5, row, resultText, resultColor, proValueBg, true)
        else:
            for col = 0 to 5
                f_whaleCell(col, row, "--", proMuted, proValueBg, false)

    // Rows 15-16 — compact footer, all cells used.
    f_whaleCell(0, 15, "FULL HIST", proGold, proSection, true)
    f_whaleCell(1, 15, showFlightMonthPanel ? "ON" : "OFF", showFlightMonthPanel ? bullColor : proMuted, proSection, true)
    f_whaleCell(2, 15, "MAX 100", proWhite, proSection, true)
    f_whaleCell(3, 15, flightLedgerUseBtcAdaptiveHold ? "BTC HOLD +$500" : flightLedgerUseMetalProfitLock ? "PROTECT +$100" : "BE +$100", proGold, proSection, true)
    f_whaleCell(4, 15, flightLedgerUseBtcAdaptiveHold ? "TRAIL 60% PEAK" : flightLedgerUseMetalProfitLock ? "LOCK +$25" : "LOCK +$250", proGold, proSection, true)
    f_whaleCell(5, 15, "ONE ALERT", persistentAlerts ? bullColor : proMuted, proSection, true)

    f_whaleCell(0, 16, "SFA 🐋", proGold, proValueBg, false)
    f_whaleCell(1, 16, "WHALE", proWhite, proValueBg, false)
    f_whaleCell(2, 16, "PREMIUM", proGold, proValueBg, false)
    f_whaleCell(3, 16, "EMA200", infoBlue, proValueBg, false)
    f_whaleCell(4, 16, "ADX 5M", proAdxColor, proValueBg, false)
    f_whaleCell(5, 16, "ENGINE LOCKED", bullColor, proValueBg, false)

f_renderWhaleHistory() =>
    table.set_position(whaleHistoryPanel, f_dashboardPos(flightMonthPanelPosOpt))
    table.clear(whaleHistoryPanel, 0, 0, 6, 27)

ledgerSize = len(flightLedgerPls)
availableRequested = runtime.math_min(ledgerSize, whaleHistoryRows)
firstNumber = whaleHistoryPageStart + 1
lastNumber = runtime.math_min(whaleHistoryPageStart + 25, availableRequested)

    f_whaleHistoryCell(0, 0, "🐋", proGold, proHeader, true)
    f_whaleHistoryCell(1, 0, "WHALE HISTORY", proWhite, proHeader, true)
    f_whaleHistoryCell(2, 0, runtime.syminfo.ticker, infoBlue, proHeader, true)
    f_whaleHistoryCell(3, 0, "PAGE " + runtime.str_tostring(whaleHistoryPageSafe) + "/" + runtime.str_tostring(whaleHistoryMaxPage), proGold, proHeader, true)
    f_whaleHistoryCell(4, 0, "25 / PAGE", proWhite, proHeader, false)
    f_whaleHistoryCell(5, 0, "MAX " + runtime.str_tostring(whaleHistoryRows), proMuted, proHeader, false)
    f_whaleHistoryCell(6, 0, "NEWEST FIRST", infoBlue, proHeader, false)

    f_whaleHistoryCell(0, 1, "#", proGold, proLabelBg, true)
    f_whaleHistoryCell(1, 1, "DATE/TIME", proGold, proLabelBg, true)
    f_whaleHistoryCell(2, 1, "SIDE", proGold, proLabelBg, true)
    f_whaleHistoryCell(3, 1, "ENTRY", proGold, proLabelBg, true)
    f_whaleHistoryCell(4, 1, "EXIT", proGold, proLabelBg, true)
    f_whaleHistoryCell(5, 1, "P/L", proGold, proLabelBg, true)
    f_whaleHistoryCell(6, 1, "RESULT", proGold, proLabelBg, true)

    for rowOffset = 0 to 24
row = 2 + rowOffset
historyNumber = whaleHistoryPageStart + rowOffset + 1
idx = ledgerSize - 1 - (whaleHistoryPageStart + rowOffset)
allowedRow = historyNumber <= whaleHistoryRows and idx >= 0
        if allowedRow:
closeTime = flightLedgerCloseTimes[int(idx)]
closeDir = flightLedgerDirs[int(idx)]
closePl = flightLedgerPls[int(idx)]
closeEntry = flightLedgerEntries[int(idx)]
closeExit = flightLedgerExits[int(idx)]
resultText = closePl > 0 ? "WIN" : closePl < 0 ? "LOSS" : "BE"
resultColor = closePl > 0 ? bullColor : closePl < 0 ? bearColor : proGold

            f_whaleHistoryCell(0, row, runtime.str_tostring(historyNumber), proMuted, proValueBg, false)
            f_whaleHistoryCell(1, row, str.format_time(closeTime, "dd MMM HH:mm", flightLedgerTimezone), proWhite, proValueBg, false)
            f_whaleHistoryCell(2, row, closeDir == 1 ? "BUY" : "SELL", closeDir == 1 ? bullColor : bearColor, proValueBg, false)
            f_whaleHistoryCell(3, row, runtime.str_tostring(closeEntry, format.mintick), proWhite, proValueBg, false)
            f_whaleHistoryCell(4, row, runtime.str_tostring(closeExit, format.mintick), proWhite, proValueBg, false)
            f_whaleHistoryCell(5, row, f_moneyText(closePl), resultColor, proValueBg, true)
            f_whaleHistoryCell(6, row, resultText, resultColor, proValueBg, true)
        else:
            for col = 0 to 6
                f_whaleHistoryCell(col, row, "--", proMuted, proValueBg, false)

rangeText = availableRequested <= 0 ? "NO CLOSED TRADES" : lastNumber < firstNumber ? "NO TRADES ON PAGE" : "SHOWING " + runtime.str_tostring(firstNumber) + "-" + runtime.str_tostring(lastNumber) + " OF " + runtime.str_tostring(availableRequested)
    f_whaleHistoryCell(0, 27, "SFA 🐋", proGold, proHeader, true)
    f_whaleHistoryCell(1, 27, rangeText, proWhite, proHeader, true)
    f_whaleHistoryCell(2, 27, "", proWhite, proHeader, false)
    f_whaleHistoryCell(3, 27, "PAGE IN SETTINGS", infoBlue, proHeader, false)
    f_whaleHistoryCell(4, 27, "", proWhite, proHeader, false)
    f_whaleHistoryCell(5, 27, "ENTRY→EXIT", infoBlue, proHeader, false)
    f_whaleHistoryCell(6, 27, "NOT ZONE→ZONE", proGold, proHeader, false)

f_renderDashboards() =>
    table.clear(whaleMainPanel, 0, 0, 5, 16)
    table.clear(whaleDigitalStrip, 0, 0, 5, 2)

    if showDesktopDashboard:
        f_renderWhaleMain()

    if showDigitalSignalStrip:
        f_renderDigitalSignalStrip()

    if showFlightMonthPanel:
        f_renderWhaleHistory()
    else:
        table.clear(whaleHistoryPanel, 0, 0, 6, 27)

if runtime.barstate_islast:
    f_renderDashboards()

//=============================================================================
// SFA 🐋 WHALE — ONE ALERT / ONE NOTIFICATION PER NEW SIGNAL
//=============================================================================
// TradingView setup:
// Create ONE alert using "Any alert() function call".
// That single TradingView alert remains active until the member stops/deletes it.
// Each NEW WHALE BUY sends ONE notification. Each NEW WHALE SELL sends ONE notification.
// No repeated candle reminders. No Zone-engine alerts. No BE/lock-step alert spam.

if persistentAlerts and flightBuySignalEvent:
    alert("SFA 🐋 WHALE ZONES STIKE\n" + runtime.syminfo.ticker + " • " + f_chartTfText() +
         "\n🐋 WHALE BUY" +
         "\nENTRY: " + runtime.str_tostring(radarEntry, format.mintick) +
         "\nCONFIDENCE: " + runtime.str_tostring(radarConfidence, "#") + "%" +
         "\nTIME: " + str.format_time(runtime.time, "dd MMM yyyy HH:mm", "Europe/London"),
         alert.freq_once_per_bar_close)

if persistentAlerts and flightSellSignalEvent:
    alert("SFA 🐋 WHALE ZONES STIKE\n" + runtime.syminfo.ticker + " • " + f_chartTfText() +
         "\n🐋 WHALE SELL" +
         "\nENTRY: " + runtime.str_tostring(radarEntry, format.mintick) +
         "\nCONFIDENCE: " + runtime.str_tostring(radarConfidence, "#") + "%" +
         "\nTIME: " + str.format_time(runtime.time, "dd MMM yyyy HH:mm", "Europe/London"),
         alert.freq_once_per_bar_close)

alertcondition(flightBuySignalEvent, "SFA 🐋 WHALE BUY",
     "SFA WHALE ZONES STIKE: WHALE BUY on {{ticker}} / {{interval}}")
alertcondition(flightSellSignalEvent, "SFA 🐋 WHALE SELL",
     "SFA WHALE ZONES STIKE: WHALE SELL on {{ticker}} / {{interval}}")

//-----------------------------------------------------------------------------
// ALERTS — LEVELS ONLY, NO TRADE SIGNALS
//-----------------------------------------------------------------------------
alertcondition(showPDH and runtime.ta_crossover(runtime.close, pdh), "SFA PDH Break", "XAUUSD crossed above Previous Day High")
alertcondition(showPDL and runtime.ta_crossunder(runtime.close, pdl), "SFA PDL Break", "XAUUSD crossed below Previous Day Low")
alertcondition(showSessionHL and not runtime.na(activeSessionHigh) and runtime.ta_crossover(runtime.close, activeSessionHigh), "SFA Active Session High Break", "XAUUSD crossed active session runtime.high")
alertcondition(showSessionHL and not runtime.na(activeSessionLow) and runtime.ta_crossunder(runtime.close, activeSessionLow), "SFA Active Session Low Break", "XAUUSD crossed active session runtime.low")


//-----------------------------------------------------------------------------