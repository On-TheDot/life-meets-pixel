---
name: browser-automation
description: How to drive a browser on this machine with chrome-devtools-axi, including the attached Chrome it needs. Use for screenshots, DOM and accessibility checks, console, network, Lighthouse or any other browser task.
---

# Browser automation

Use **`npx -y chrome-devtools-axi`** ([axi.md](https://axi.md), MIT) for every browser task: screenshots, DOM and a11y inspection, console, network, Lighthouse, perf traces. It wraps `chrome-devtools-mcp` but returns an accessibility tree with `uid` handles rather than an image, so structure and interaction work costs a fraction of the tokens, and a screenshot through a warm bridge is ~0.9s against ~5s for a cold headless launch.

**Chrome will not launch itself on this machine.** The MCP tools and a bare `axi open` both die with `Protocol error (Target.setDiscoverTargets): Target closed`. Run Chrome yourself and attach:

```bash
CH=~/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome
nohup "$CH" --headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage \
  --remote-debugging-port=9222 --user-data-dir=/tmp/axi-profile about:blank &
export CHROME_DEVTOOLS_AXI_BROWSER_URL="http://127.0.0.1:9222"
npx -y chrome-devtools-axi stop && npx -y chrome-devtools-axi start
npx -y chrome-devtools-axi open http://localhost:3000/
```

A **stale bridge fails fast**: a `Target closed` error returning in ~2s means the bridge is holding a dead connection, so `stop` then `start` before concluding anything is actually broken. Never put `pkill` in the same compound command as the relaunch; it kills the calling shell.
