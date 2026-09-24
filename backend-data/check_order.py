with open('pine_runner.py', 'r', encoding='utf-8') as f:
    src = f.read()
for i, line in enumerate(src.split('\n'), 1):
    if ('syminfo' in line and 'sub' in line) or ('request.security' in line and 'sub' in line) or ('request_security' in line and 'sub' in line):
        print(i, line.strip())
