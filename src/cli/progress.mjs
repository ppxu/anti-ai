const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function createScanProgress({
  stream = process.stderr,
  lang = "zh",
  enabled = Boolean(stream.isTTY),
  delayMs = 120,
  intervalMs = 120,
} = {}) {
  let delayTimer = null;
  let frameTimer = null;
  let frameIndex = 0;
  let visible = false;
  let message = "";

  const clearLine = () => {
    if (!visible) return;
    stream.write("\r\u001B[2K");
    visible = false;
  };

  const stopTimers = () => {
    if (delayTimer !== null) clearTimeout(delayTimer);
    if (frameTimer !== null) clearInterval(frameTimer);
    delayTimer = null;
    frameTimer = null;
  };

  const render = () => {
    stream.write(`\r\u001B[2K${SPINNER_FRAMES[frameIndex]} ${message}`);
    frameIndex = (frameIndex + 1) % SPINNER_FRAMES.length;
    visible = true;
  };

  const stop = () => {
    stopTimers();
    clearLine();
  };

  const handle = (event) => {
    if (!enabled) return;
    if (event?.type === "scan:finish") {
      stop();
      return;
    }
    if (event?.type !== "scan:start") return;

    stop();
    const count = event.sourceIds?.length ?? 0;
    message =
      lang === "en"
        ? `Scanning ${count} local Agent source${count === 1 ? "" : "s"}`
        : `正在扫描 ${count} 个本地 Agent 数据源`;
    frameIndex = 0;
    delayTimer = setTimeout(() => {
      delayTimer = null;
      render();
      frameTimer = setInterval(render, intervalMs);
      frameTimer.unref?.();
    }, delayMs);
    delayTimer.unref?.();
  };

  return { handle, stop };
}

export { createScanProgress };
