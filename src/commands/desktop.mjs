import { fileURLToPath } from "node:url";

import {
  desktopStatus,
  linkDesktopBridge,
  refreshDesktopSnapshot,
} from "../application/desktop.mjs";
import { DesktopStoreError } from "../infrastructure/desktop-store.mjs";
import { localized } from "../shared.mjs";

const CLI_ENTRY_PATH = fileURLToPath(
  new URL("../../bin/anti-ai.mjs", import.meta.url),
);

function renderDesktopStatus(status, lang) {
  const bridge = {
    linked: localized(lang, "已关联", "LINKED"),
    missing: localized(lang, "未关联", "NOT LINKED"),
    invalid: localized(lang, "关联失效", "BROKEN LINK"),
  }[status.bridge.status];
  const snapshot = {
    ready: localized(lang, "已同步", "READY"),
    stale: localized(lang, "已过期", "STALE"),
    missing: localized(lang, "尚未生成", "MISSING"),
    invalid: localized(lang, "无法读取", "INVALID"),
    incompatible: localized(lang, "版本不兼容", "INCOMPATIBLE"),
  }[status.snapshot.status];
  return [
    localized(lang, "桌面伴生体", "DESKTOP COMPANION"),
    "",
    `${localized(lang, "CLI 关联", "CLI BRIDGE")}  ${bridge}`,
    `${localized(lang, "桌面快照", "SNAPSHOT")}  ${snapshot}`,
    ...(status.snapshot.generatedAt
      ? [
          `${localized(lang, "最后同步", "LAST SYNC")}  ${status.snapshot.generatedAt}`,
          `${localized(lang, "标本编号", "SPECIMEN ID")}  ${status.snapshot.specimenId}`,
        ]
      : []),
    "",
    ...(status.bridge.status === "linked"
      ? []
      : [
          localized(
            lang,
            "运行 anti-ai desktop link 重新关联当前 CLI。",
            "Run anti-ai desktop link to connect the current CLI.",
          ),
          "",
        ]),
  ].join("\n");
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function runDesktop(options) {
  const action = options.action ?? "status";
  try {
    if (action === "link") {
      await linkDesktopBridge({
        nodePath: process.execPath,
        cliEntryPath: CLI_ENTRY_PATH,
        lang: options.lang,
      });
      const status = await desktopStatus();
      if (options.json) writeJson(status);
      else {
        process.stdout.write(
          `${localized(options.lang, "桌面伴生体已关联，并生成第一份快照。", "Desktop companion linked and its first snapshot was written.")}\n\n${renderDesktopStatus(status, options.lang)}`,
        );
      }
      return;
    }
    if (action === "refresh") {
      await refreshDesktopSnapshot({ lang: options.lang });
      const status = await desktopStatus();
      if (options.json) writeJson(status);
      else {
        process.stdout.write(
          `${localized(options.lang, "桌面快照已刷新。", "Desktop snapshot refreshed.")}\n\n${renderDesktopStatus(status, options.lang)}`,
        );
      }
      return;
    }

    const status = await desktopStatus();
    if (options.json) writeJson(status);
    else process.stdout.write(renderDesktopStatus(status, options.lang));
    if (
      status.bridge.status !== "linked" ||
      !["ready", "stale"].includes(status.snapshot.status)
    ) {
      process.exitCode = 1;
    }
  } catch (error) {
    if (!(error instanceof DesktopStoreError)) throw error;
    if (options.json) {
      writeJson({ version: 1, error: error.code });
    } else {
      process.stderr.write(
        `${localized(
          options.lang,
          error.code === "bridge_missing"
            ? "桌面 CLI 尚未关联。请先运行 anti-ai desktop link。"
            : "桌面 CLI 关联已失效。请运行 anti-ai desktop link 修复。",
          error.code === "bridge_missing"
            ? "The desktop CLI is not linked. Run anti-ai desktop link first."
            : "The desktop CLI link is invalid. Run anti-ai desktop link to repair it.",
        )}\n`,
      );
    }
    process.exitCode = 1;
  }
}

export { runDesktop };
