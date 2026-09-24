import pine_runner, math, random, importlib
importlib.reload(pine_runner)

random.seed(42)
candles_1m = []
price = 1.13
for i in range(300):
    o = price
    h = o + random.uniform(0, 0.0005)
    l = o - random.uniform(0, 0.0005)
    c = l + random.uniform(0, h-l)
    candles_1m.append({'time': 1700000000 + i*60, 'open': o, 'high': h, 'low': l, 'close': c, 'volume': 100})
    price = c

candles_1h = []
price2 = 1.13
for i in range(10):
    o = price2
    h = o + random.uniform(0, 0.002)
    l = o - random.uniform(0, 0.002)
    c = l + random.uniform(0, h-l)
    candles_1h.append({'time': 1700000000 + i*3600, 'open': o, 'high': h, 'low': l, 'close': c, 'volume': 1000})
    price2 = c

extra = {'CUSTOM_60': candles_1h}

script = (
    '//@version=5\n'
    'indicator("MTF Test", overlay=true)\n'
    'htf_close = request.security(syminfo.tickerid, "60", close)\n'
    'plot(htf_close, title="HTF Close", color=color.blue)\n'
)

result = pine_runner.run(script, candles_1m, 'CUSTOM', '1m', 'test', extra)
print('Error:', result.get('error'))
print('Plots:', len(result['plots']))
if result['plots']:
    data = result['plots'][0]['data']
    print('Data points:', len(data))
    non_nan = [d for d in data if not math.isnan(d['value'])]
    print('Non-nan:', len(non_nan))
    if non_nan:
        print('Sample HTF values:', [round(d['value'], 5) for d in non_nan[:5]])
