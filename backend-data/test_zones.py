import pine_runner, math, random, importlib
importlib.reload(pine_runner)

random.seed(42)
candles_1m = []
price = 1.13
for i in range(500):
    o = price
    h = o + random.uniform(0, 0.0005)
    l = o - random.uniform(0, 0.0005)
    c = l + random.uniform(0, h-l)
    candles_1m.append({'time': 1700000000 + i*60, 'open': o, 'high': h, 'low': l, 'close': c, 'volume': 100})
    price = c

# 1H candles
candles_1h = []
price2 = 1.13
for i in range(20):
    o = price2
    h = o + random.uniform(0, 0.002)
    l = o - random.uniform(0, 0.002)
    c = l + random.uniform(0, h-l)
    candles_1h.append({'time': 1700000000 + i*3600, 'open': o, 'high': h, 'low': l, 'close': c, 'volume': 5000})
    price2 = c

# 4H candles
candles_4h = []
price3 = 1.13
for i in range(10):
    o = price3
    h = o + random.uniform(0, 0.004)
    l = o - random.uniform(0, 0.004)
    c = l + random.uniform(0, h-l)
    candles_4h.append({'time': 1700000000 + i*14400, 'open': o, 'high': h, 'low': l, 'close': c, 'volume': 20000})
    price3 = c

extra = {
    'EURUSD_60': candles_1h,
    'EURUSD_240': candles_4h,
}

# Simplified zone-creation script like Whale Zones STIKE
script = """
//@version=5
indicator("Zone Test", overlay=true)

htf_close = request.security(syminfo.tickerid, "60", close)
htf_high  = request.security(syminfo.tickerid, "60", high)
htf_low   = request.security(syminfo.tickerid, "60", low)

h4_close = request.security(syminfo.tickerid, "240", close)
h4_high  = request.security(syminfo.tickerid, "240", high)
h4_low   = request.security(syminfo.tickerid, "240", low)

plot(htf_close, title="1H Close", color=color.blue)
plot(h4_close,  title="4H Close", color=color.red)

is_1h_bull = htf_close > htf_low
if is_1h_bull and barstate.islast:
    box.new(bar_index - 20, htf_high, bar_index, htf_low, bgcolor=color.new(color.green, 80), border_color=color.green, text="1H ZONE")
    label.new(bar_index, htf_high, text="HTF Signal", color=color.green, textcolor=color.white)
"""

result = pine_runner.run(script, candles_1m, 'EURUSD', '1m', 'zone_test', extra)
print('Error:', result.get('error'))
print('Plots:', len(result['plots']))
for p in result['plots']:
    non_nan = [d for d in p['data'] if not math.isnan(d['value'])]
    print(f"  Plot '{p['title']}': {len(non_nan)} data points, sample={round(non_nan[0]['value'],5) if non_nan else 'none'}")
print('VisualEvents:', len(result['visualEvents']))
for ev in result['visualEvents']:
    print(f"  {ev['call']} @ bar {ev['barIndex']} args={ev['args'][:4]}")
