import { emptyUsage } from "../shared.mjs";

function addUsage(target, usage) {
  for (const key of Object.keys(target)) {
    target[key] += usage[key] ?? 0;
  }
}

function addModelUsage(target, model, usage) {
  const name = String(model ?? "").trim() || "unknown";
  target[name] ??= emptyUsage();
  addUsage(target[name], usage);
}

export { addModelUsage, addUsage };
