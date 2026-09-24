"""
Fix the double-replacement bug in pine_runner.py _preprocess():
1. Remove the duplicated request.security / syminfo block
2. Move syminfo mappings BEFORE request.security to avoid double-prefixing
"""
import re

with open('pine_runner.py', 'r', encoding='utf-8') as f:
    src = f.read()

# The duplicated block that was inserted twice — find and remove the 2nd copy
# The block starts right after barstate.isrealtime in both copies
DUPE_BLOCK = """
        # request.security / syminfo
        line = re.sub(r'\\\\brequest\\\\.security_lower_tf\\\\b', 'runtime.request_security_lower_tf', line)
        line = re.sub(r'\\\\brequest\\\\.security\\\\b', 'runtime.request_security', line)"""

# Count occurrences
count = src.count("request\\.security_lower_tf\\b', 'runtime.request_security_lower_tf', line)")
print(f"Found {count} occurrences of the block")

# Simple approach: rewrite the entire _preprocess function with the correct ordering
# Find the section with barstate and the duplicated block
# We'll just remove one copy of the duplicated block

# Find both occurrences of barstate.isrealtime substitution
positions = [m.start() for m in re.finditer(r"barstate\.isrealtime.*?runtime\.barstate_isrealtime", src)]
print(f"barstate.isrealtime at positions: {positions}")

# The second block starts after the second barstate.isrealtime
# It is followed by "# request.security / syminfo" comment twice
# Remove the SECOND full request.security/syminfo block

# Strategy: find ALL occurrences and keep only the first
MARK_START = "        # request.security / syminfo\n"
MARK_END   = "        line = re.sub(r'\\btimeframe\\.multiplier\\b', '1', line)\n"

first_pos  = src.find(MARK_START)
second_pos = src.find(MARK_START, first_pos + 1)

print(f"First block at {first_pos}, second at {second_pos}")

if second_pos > 0:
    # Find end of second block
    end_pos = src.find(MARK_END, second_pos)
    if end_pos > 0:
        end_pos += len(MARK_END)
        # Remove the second block
        src = src[:second_pos] + src[end_pos:]
        print("Removed duplicate block")
    else:
        print("Could not find end of second block")
else:
    print("No duplicate found, good")

# Now verify the remaining block has syminfo BEFORE request.security to avoid double-prefix
# Actually the issue is: request.security maps first creating runtime.request_security(syminfo.tickerid,...)
# then syminfo.tickerid -> runtime.syminfo.tickerid (word boundary \bsyminfo\b still works here)
# BUT then on the second pass through (if SECOND block exists), runtime.syminfo is untouched
# The real double-prefix was from the SECOND run of the same line.
# Since we removed the second block, let's test.

# Also fix: move syminfo subs BEFORE request.security sub so that inside the args
# syminfo is already replaced when request.security runs (doesn't actually matter since it's line-by-line)
# The problem was purely the duplicate block. Let's verify by checking what the preprocess now does.

with open('pine_runner.py', 'w', encoding='utf-8') as f:
    f.write(src)

print("Fixed pine_runner.py")

# Verify
count_after = src.count("request_security_lower_tf', line)")
print(f"After fix: {count_after} occurrences of block")
