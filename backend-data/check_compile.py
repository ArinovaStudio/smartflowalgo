import pine_runner
import traceback
import sys

with open("WHALE_ZONES_STIKE.pine", "r", encoding="utf-8") as f:
    script = f.read()

print("Preprocessing script...")
processed = pine_runner._preprocess(script)
lines = processed.split("\n")
print(f"Preprocessed {len(lines)} lines.")

# Write preprocessed script to debug file
with open("debug_preprocessed.py", "w", encoding="utf-8") as f:
    f.write(processed)

print("Attempting compilation...")
try:
    code_obj = compile(processed, "<pine_whale>", "exec")
    print("Compilation SUCCESSFUL!")
except Exception as e:
    print(f"Compilation ERROR: {e}")
    # Print lines around the error
    if hasattr(e, "lineno") and e.lineno:
        start = max(0, e.lineno - 5)
        end = min(len(lines), e.lineno + 5)
        for i in range(start, end):
            prefix = "-> " if i + 1 == e.lineno else "   "
            safe_l = lines[i].encode("ascii", "replace").decode("ascii")
            print(f"{prefix}{i+1}: {safe_l}")
