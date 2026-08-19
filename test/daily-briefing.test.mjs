import {
  assert,
  mkdirSync,
  mkdtempSync,
  path,
  readFileSync,
  rmSync,
  runCli,
  test,
  tmpdir,
} from "./helpers.mjs";

import { deriveTuiSnapshot } from "../src/application/tui.mjs";
import { deriveDailyBriefing } from "../src/application/daily-briefing.mjs";

test("the key change never repeats the dedicated collection update", () => {
  const briefing = deriveDailyBriefing({
    date: "2026-08-19",
    status: "active",
    statusLabel: "今日已进食",
    day: {
      usageBandLabel: "校准污染",
      summary: "污染 +1 · 清醒 +0",
      pathologyChanges: [],
      discoveries: [{ id: "fixture", label: "分裂影子换班" }],
      activities: [],
      ecologyGains: { pollution: 0, clarity: 0 },
    },
    diagnosis: "代谢暂稳",
    habitat: {
      name: "递归不在场",
      bulletin: "镜像值班员已经代签。",
    },
    recommendation: null,
    lang: "zh",
  });
  const change = briefing.sections.find(({ id }) => id === "change");
  const collection = briefing.sections.find(({ id }) => id === "collection");

  assert.equal(change.kind, "quiet");
  assert.equal(change.label, "无其他显著变化");
  assert.equal(collection.count, 1);
  assert.match(collection.detail, /分裂影子换班/u);
});

test("the daily briefing is a deterministic bilingual read-only projection", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-briefing-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const environment = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "daily-briefing-seed",
  };
  const settled = runCli(
    ["creature", "--date", "2026-07-23", "--json"],
    environment,
  );
  assert.equal(settled.status, 0, settled.stderr);
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const original = readFileSync(statePath, "utf8");
  const state = JSON.parse(original);

  const chinese = deriveTuiSnapshot(state, "2026-07-23", "zh");
  const english = deriveTuiSnapshot(state, "2026-07-23", "en");

  assert.equal(chinese.version, 3);
  assert.equal(chinese.dailyBriefing.version, 1);
  assert.equal(chinese.dailyBriefing.status, "settled");
  assert.equal(chinese.dailyBriefing.date, "2026-07-23");
  assert.deepEqual(
    chinese.dailyBriefing.sections.map(({ id }) => id),
    ["system", "diagnosis", "change", "collection", "habitat"],
  );
  assert.ok(chinese.dailyBriefing.sections.every(({ label, detail }) =>
    label.length > 0 && detail.length > 0
  ));
  assert.equal(
    chinese.dailyBriefing.recommendation?.id,
    chinese.primaryAction?.id,
  );
  assert.ok(chinese.dailyBriefing.recommendation?.label.length > 0);
  assert.equal(chinese.dailyBriefing.links.details.key, "e");
  assert.equal(chinese.dailyBriefing.links.habitat.key, "2");
  assert.equal(chinese.dailyBriefing.links.codex.key, "5");
  assert.doesNotMatch(JSON.stringify(english.dailyBriefing), /[\p{Script=Han}]/u);
  assert.equal(readFileSync(statePath, "utf8"), original);

  const unsettled = deriveTuiSnapshot(state, "2026-07-24", "zh");
  assert.equal(unsettled.dailyBriefing.status, "unsettled");
  assert.equal(unsettled.dailyBriefing.sections[0].id, "system");
  assert.equal(unsettled.dailyBriefing.recommendation.id, "settle_today");
  assert.equal(readFileSync(statePath, "utf8"), original);
});

test("briefing share cards expose the daily story without private usage details", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-briefing-card-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const home = path.join(workspace, "home");
  mkdirSync(home, { recursive: true });
  const environment = {
    HOME: home,
    ANTI_AI_CREATURE_SEED: "daily-briefing-card-seed",
  };

  const chinese = runCli(
    ["share", "--card", "briefing", "--date", "2026-07-23"],
    environment,
  );
  const english = runCli(
    ["share", "--card", "briefing", "--date", "2026-07-23", "--lang", "en"],
    environment,
  );

  assert.equal(chinese.status, 0, chinese.stderr);
  assert.equal(english.status, 0, english.stderr);
  assert.match(chinese.stdout, /每日收容播报/u);
  assert.match(english.stdout, /DAILY CONTAINMENT BROADCAST/u);
  assert.match(english.stdout, /SYSTEM STATUS/u);
  assert.match(english.stdout, /CURRENT DIAGNOSIS/u);
  assert.match(english.stdout, /HABITAT REACTION/u);
  assert.match(english.stdout, /RECOMMENDED RESPONSE/u);
  assert.doesNotMatch(english.stdout, /[\p{Script=Han}]/u);
  for (const secret of [
    "2200",
    "2,200",
    "mutation-test",
    "input_tokens",
    "output_tokens",
  ]) {
    assert.doesNotMatch(chinese.stdout, new RegExp(secret, "iu"));
    assert.doesNotMatch(english.stdout, new RegExp(secret, "iu"));
  }
});
