#!/usr/bin/with-contenv bash
# Pin mt5linux to 0.1.9 on both sides to match the -w flag used in start.sh

sed -i 's/mt5linux>=0.1.9/mt5linux==0.1.9/' /Metatrader/start.sh
sed -i 's/pip install --break-system-packages --no-cache-dir --no-deps mt5linux/pip install --break-system-packages --no-cache-dir --no-deps mt5linux==0.1.9/' /Metatrader/start.sh

# Force-remove any wrong-version mt5linux already installed, so the pinned
# version actually gets (re)installed by start.sh's version-check logic
pip uninstall -y --break-system-packages mt5linux 2>/dev/null || true
wine python -m pip uninstall -y mt5linux 2>/dev/null || true