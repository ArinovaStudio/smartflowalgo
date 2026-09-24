import importlib, pine_runner
importlib.reload(pine_runner)
script = (
    "//@version=5\n"
    'indicator("MTF Test", overlay=true)\n'
    'htf_close = request.security(syminfo.tickerid, "60", close)\n'
    'plot(htf_close, title="HTF Close", color=color.blue)\n'
)
processed = pine_runner._preprocess(script)
for line in processed.split('\n'):
    if line.strip():
        print(line)
