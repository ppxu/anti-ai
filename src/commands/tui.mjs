import { localized } from "../shared.mjs";
import { createContainmentSession } from "../application/actions.mjs";
import { createTuiShareController } from "../application/share-export.mjs";

async function runTui(options) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stderr.write(
      `${localized(
        options.lang,
        "交互式收容控制台需要交互式终端。请直接运行 anti-ai tui，或使用 anti-ai today 查看普通终端报告。",
        "The containment console requires an interactive terminal. Run anti-ai tui directly, or use anti-ai today for a regular terminal report.",
      )}\n`,
    );
    process.exitCode = 2;
    return;
  }

  let session;
  try {
    session = await createContainmentSession(options);
  } catch {
    process.stderr.write(
      `${localized(
        options.lang,
        "异变体档案无法读取。运行 anti-ai creature reset 后可重新孵化。",
        "The mutation file cannot be read. Run anti-ai creature reset to hatch again.",
      )}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const { startTui } = await import("../../dist/tui.mjs");
  startTui(session.snapshot, {
    lang: options.lang,
    motion: options.noMotion ? "off" : "low",
    actionController: session.actionController,
    shareController: createTuiShareController(options),
  });
}

export { runTui };
