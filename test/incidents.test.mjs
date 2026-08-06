import {
  assert,
  mkdtempSync,
  path,
  readFileSync,
  rmSync,
  runCli,
  shiftTestDate,
  test,
  tmpdir,
  writeCodexUsage,
} from "./helpers.mjs";

import {
  INCIDENT_DEFINITIONS,
  currentCreatureIncident,
  incidentLabel,
  selectCreatureIncident,
  syncCreatureIncidents,
} from "../src/incidents.mjs";
import {
  executeContainmentAction,
  previewContainmentAction,
} from "../src/application/actions.mjs";

function creatureAt(experienceDays, ecologyId = "polluted") {
  return {
    experienceDays,
    branch: ecologyId === "lucid" ? "context" : "nuclear",
    ecology: { type: ecologyId },
  };
}

test("v2.9 expands the incident skeletons without changing cadence", () => {
  assert.equal(INCIDENT_DEFINITIONS.length, 24);
});

test("incidents use lived days, delay consequences, and never build a backlog", () => {
  const polluted = { seed: "incident-polluted", incidents: undefined };
  const lucid = { seed: "incident-lucid", incidents: undefined };

  assert.equal(
    syncCreatureIncidents(
      polluted,
      "2026-01-06",
      creatureAt(6, "polluted"),
    ),
    null,
  );
  assert.equal(
    syncCreatureIncidents(
      lucid,
      "2026-01-06",
      creatureAt(6, "lucid"),
    ),
    null,
  );

  const pollutedIncident = syncCreatureIncidents(
    polluted,
    "2026-01-07",
    creatureAt(7, "polluted"),
  );
  const lucidIncident = syncCreatureIncidents(
    lucid,
    "2026-01-07",
    creatureAt(7, "lucid"),
  );

  for (const incident of [pollutedIncident, lucidIncident]) {
    assert.equal(incident.status, "pending");
    assert.equal(incident.trigger.experienceDays, 7);
    assert.deepEqual(
      incident.options.map(({ stance }) => stance),
      ["quarantine", "observe", "resonate"],
    );
  }

  const stillPending = syncCreatureIncidents(
    polluted,
    "2026-01-21",
    creatureAt(21, "polluted"),
  );
  assert.equal(stillPending.id, pollutedIncident.id);
  assert.equal(polluted.incidents.records.length, 1);

  const selected = selectCreatureIncident(
    polluted,
    "2026-01-21",
    "2",
    21,
  );
  assert.equal(selected.value.status, "awaiting_aftermath");
  assert.equal(selected.value.selected.stance, "observe");
  assert.equal(selected.value.aftermath.dueAtExperience, 24);
  assert.equal(selected.value.aftermath.status, "pending");

  syncCreatureIncidents(
    polluted,
    "2026-01-23",
    creatureAt(23, "polluted"),
  );
  assert.equal(
    currentCreatureIncident(polluted, "2026-01-23").aftermath.status,
    "pending",
  );

  const resolved = syncCreatureIncidents(
    polluted,
    "2026-01-24",
    creatureAt(24, "polluted"),
  );
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.aftermath.status, "resolved");
  assert.equal(resolved.aftermath.resolvedAt, "2026-01-24");
  assert.equal(resolved.chain.parentIncidentId, null);
  assert.equal(resolved.chain.rootIncidentId, resolved.id);
  assert.equal(resolved.chain.chapter, 1);
  assert.deepEqual(polluted.incidents.dispositions, {
    quarantine: 0,
    observe: 1,
    resonate: 0,
  });

  const next = syncCreatureIncidents(
    polluted,
    "2026-01-28",
    creatureAt(28, "polluted"),
  );
  assert.equal(next.status, "pending");
  assert.notEqual(next.id, pollutedIncident.id);
  assert.equal(polluted.incidents.records.length, 2);
});

test("a resolved response opens one deterministic follow-up before a new chain", () => {
  const state = { seed: "incident-chain", incidents: undefined };
  const root = syncCreatureIncidents(
    state,
    "2026-04-07",
    creatureAt(7, "paradox"),
  );
  selectCreatureIncident(state, "2026-04-07", "3", 7);
  syncCreatureIncidents(state, "2026-04-10", creatureAt(10, "paradox"));

  const followUp = syncCreatureIncidents(
    state,
    "2026-04-14",
    creatureAt(14, "paradox"),
  );
  assert.equal(followUp.incidentId, "shared_dream_desync");
  assert.equal(followUp.chain.id, root.chain.id);
  assert.equal(followUp.chain.depth, 2);
  assert.equal(followUp.chain.chapter, 2);
  assert.equal(followUp.chain.parentIncidentId, root.id);
  assert.equal(followUp.chain.rootIncidentId, root.id);
  assert.equal(followUp.trigger.priorMarkId, "resonate");

  selectCreatureIncident(state, "2026-04-14", "1", 14);
  syncCreatureIncidents(state, "2026-04-17", creatureAt(17, "paradox"));
  const nextRoot = syncCreatureIncidents(
    state,
    "2026-04-21",
    creatureAt(21, "paradox"),
  );
  assert.equal(nextRoot.chain.depth, 1);
  assert.equal(nextRoot.chain.parentIncidentId, null);
  assert.notEqual(nextRoot.chain.id, root.chain.id);
});

test("incident roots reflect pathology, ecology, and local collection context", () => {
  const contexts = [
    ["context", "unformed", "context_window_left_ajar"],
    ["cache", "unformed", "cache_molt_blockage"],
    ["frenzy", "unformed", "request_maws_overtime"],
    ["nuclear", "polluted", "reactor_sleepwalking"],
    ["context", "lucid", "silence_autocomplete"],
    ["context", "paradox", "double_shadow_badge"],
  ];
  for (const [branch, ecologyId, expectedId] of contexts) {
    const discovered = new Set();
    for (let index = 0; index < 64; index += 1) {
      const state = { seed: `${branch}-${ecologyId}-${index}` };
      discovered.add(
        syncCreatureIncidents(state, "2026-05-07", {
          ...creatureAt(7, ecologyId),
          branch,
        }).incidentId,
      );
    }
    assert.ok(discovered.has(expectedId), `${expectedId} was never offered`);
    assert.ok(discovered.has("coolant_standup"));
  }

  const enriched = new Set();
  for (let index = 0; index < 128; index += 1) {
    const state = {
      seed: `enriched-${index}`,
      laboratory: { activeCultureId: "culture-1" },
      generations: { fossils: [{ id: "fossil-1" }] },
    };
    enriched.add(
      syncCreatureIncidents(state, "2026-05-07", {
        ...creatureAt(7, "unformed"),
        branch: "context",
      }).incidentId,
    );
  }
  assert.ok(enriched.has("companion_reply_all"));
  assert.ok(enriched.has("fossil_calendar_invite"));

  const first = syncCreatureIncidents(
    { seed: "stable-incident" },
    "2026-05-07",
    creatureAt(7, "lucid"),
  );
  const repeated = syncCreatureIncidents(
    { seed: "stable-incident" },
    "2026-05-07",
    creatureAt(7, "lucid"),
  );
  assert.deepEqual(repeated, first);
});

test("every incident and response has complete bilingual copy", () => {
  const stances = ["quarantine", "observe", "resonate"];
  for (const definition of INCIDENT_DEFINITIONS) {
    for (const lang of ["zh", "en"]) {
      assert.notEqual(
        incidentLabel("incidents", definition.id, lang),
        definition.id,
      );
      assert.notEqual(
        incidentLabel("bodies", definition.id, lang),
        definition.id,
      );
      for (const stance of stances) {
        const outcomeId = `${definition.id}_${stance}`;
        assert.notEqual(
          incidentLabel("aftermaths", outcomeId, lang),
          outcomeId,
        );
      }
    }
  }
  for (const stance of stances) {
    assert.notEqual(incidentLabel("stances", stance, "zh"), stance);
    assert.notEqual(incidentLabel("stances", stance, "en"), stance);
  }
});

test("creature incident seals one local choice and reveals its delayed aftermath", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-incidents-cli-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-02-01";
  const incidentDate = shiftTestDate(startDate, 6);
  const beforeAftermath = shiftTestDate(startDate, 8);
  const aftermathDate = shiftTestDate(startDate, 9);
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 2_000,
        cached_input_tokens: 400,
        output_tokens: 200,
        total_tokens: 2_200,
      },
    ],
    startDate,
  );
  const env = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "incident-cli",
  };

  const pending = runCli(
    ["creature", "incident", "--date", incidentDate, "--json"],
    env,
  );
  const english = runCli(
    ["creature", "incident", "--date", incidentDate, "--lang", "en"],
    env,
  );
  assert.equal(pending.status, 0, pending.stderr);
  assert.equal(english.status, 0, english.stderr);
  const opened = JSON.parse(pending.stdout);
  assert.equal(opened.status, "pending");
  assert.equal(opened.trigger.experienceDays, 7);
  assert.equal(opened.options.length, 3);
  assert.match(english.stdout, /CONTAINMENT INCIDENT/);
  assert.match(english.stdout, /Run anti-ai creature incident <1\|2\|3>/);
  assert.doesNotMatch(english.stdout, /[\p{Script=Han}]/u);

  const creaturePendingJson = runCli(
    ["creature", "--date", incidentDate, "--json"],
    env,
  );
  const creaturePendingHuman = runCli(
    ["creature", "--date", incidentDate],
    env,
  );
  assert.equal(creaturePendingJson.status, 0, creaturePendingJson.stderr);
  assert.equal(creaturePendingHuman.status, 0, creaturePendingHuman.stderr);
  assert.equal(
    JSON.parse(creaturePendingJson.stdout).incident.current.status,
    "pending",
  );
  assert.match(creaturePendingHuman.stdout, /收容事故.*待响应/);
  assert.match(creaturePendingHuman.stdout, /anti-ai creature incident/);

  const selected = runCli(
    ["creature", "incident", "3", "--date", incidentDate, "--json"],
    env,
  );
  assert.equal(selected.status, 0, selected.stderr);
  const awaiting = JSON.parse(selected.stdout);
  assert.equal(awaiting.status, "awaiting_aftermath");
  assert.equal(awaiting.selected.stance, "resonate");
  assert.equal(awaiting.aftermath.dueAtExperience, 10);

  const locked = runCli(
    ["creature", "incident", "1", "--date", incidentDate],
    env,
  );
  assert.equal(locked.status, 2);
  assert.equal(locked.stdout, "");
  assert.match(locked.stderr, /事故响应已经封存/);

  const waiting = runCli(
    ["creature", "incident", "--date", beforeAftermath, "--json"],
    env,
  );
  assert.equal(waiting.status, 0, waiting.stderr);
  assert.equal(JSON.parse(waiting.stdout).aftermath.status, "pending");

  const resolved = runCli(
    ["creature", "incident", "--date", aftermathDate, "--json"],
    env,
  );
  const resolvedHuman = runCli(
    ["creature", "incident", "--date", aftermathDate],
    env,
  );
  assert.equal(resolved.status, 0, resolved.stderr);
  assert.equal(resolvedHuman.status, 0, resolvedHuman.stderr);
  const outcome = JSON.parse(resolved.stdout);
  assert.equal(outcome.status, "resolved");
  assert.equal(outcome.aftermath.resolvedAt, aftermathDate);
  assert.match(resolvedHuman.stdout, /延迟后果/);
  assert.doesNotMatch(
    resolved.stdout,
    /"(?:totalTokens|inputTokens|outputTokens|model|path|prompt|response)"|2,200/,
  );

  const creatureResolved = runCli(
    ["creature", "--date", aftermathDate],
    env,
  );
  assert.equal(creatureResolved.status, 0, creatureResolved.stderr);
  assert.match(creatureResolved.stdout, /事故结论/);

  const history = runCli(
    ["creature", "history", "--date", aftermathDate, "--json"],
    env,
  );
  assert.equal(history.status, 0, history.stderr);
  assert.deepEqual(
    JSON.parse(history.stdout).events
      .filter(({ type }) => type.startsWith("incident_"))
      .map(({ type }) => type),
    ["incident_opened", "incident_selected", "incident_aftermath"],
  );

  const codex = runCli(["codex", "--date", aftermathDate, "--json"], env);
  const codexHuman = runCli(["codex", "--date", aftermathDate], env);
  assert.equal(codex.status, 0, codex.stderr);
  assert.equal(codexHuman.status, 0, codexHuman.stderr);
  const collection = JSON.parse(codex.stdout);
  assert.deepEqual(collection.summary.incidentReports, { discovered: 1 });
  assert.equal(collection.sections.incidentReports[0].incidentId, outcome.incidentId);
  assert.equal(collection.sections.incidentReports[0].stanceId, "resonate");
  assert.equal(collection.sections.incidentReports[0].outcomeId, outcome.aftermath.outcomeId);
  assert.match(codexHuman.stdout, /事故报告/);
  const weekly = runCli(["week", "--date", aftermathDate, "--lang", "en"], env);
  assert.equal(weekly.status, 0, weekly.stderr);
  assert.match(weekly.stdout, /incidents 1/);

  const saved = JSON.parse(
    readFileSync(path.join(home, ".anti-ai", "creature.json"), "utf8"),
  );
  assert.equal(saved.schemaVersion, 14);
  assert.equal(saved.incidents.records.length, 1);
  assert.equal(saved.incidents.dispositions.resonate, 1);
});

test("the containment action previews and confirms one pending incident", async (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-incidents-tui-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, "codex");
  const home = path.join(workspace, "home");
  const startDate = "2026-03-01";
  const incidentDate = shiftTestDate(startDate, 6);
  writeCodexUsage(
    root,
    [
      {
        input_tokens: 900,
        cached_input_tokens: 200,
        output_tokens: 100,
        total_tokens: 1_000,
      },
    ],
    startDate,
  );
  const environment = {
    HOME: home,
    ANTI_AI_CODEX_DIR: root,
    ANTI_AI_CREATURE_SEED: "incident-tui",
  };
  assert.equal(
    runCli(["creature", "--date", incidentDate, "--json"], environment)
      .status,
    0,
  );
  const statePath = path.join(home, ".anti-ai", "creature.json");
  const beforePreview = readFileSync(statePath, "utf8");
  const previousEnvironment = Object.fromEntries(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  t.after(() => {
    for (const [key, value] of Object.entries(previousEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const options = { date: incidentDate, lang: "en", source: "all" };

  const preview = await previewContainmentAction(
    "resolve_incident",
    options,
  );
  assert.equal(preview.available, true);
  assert.match(preview.title, /CONTAINMENT INCIDENT/);
  assert.deepEqual(
    preview.choices.map(({ id, stance }) => ({ id, stance })),
    [
      { id: "1", stance: "quarantine" },
      { id: "2", stance: "observe" },
      { id: "3", stance: "resonate" },
    ],
  );
  assert.equal(preview.impact.delayExperienceDays, 3);
  assert.equal(readFileSync(statePath, "utf8"), beforePreview);

  const completed = await executeContainmentAction("resolve_incident", {
    ...options,
    choice: "1",
  });
  assert.equal(completed.status, "completed");
  assert.equal(completed.result.selected.stance, "quarantine");
  assert.equal(
    completed.snapshot.actions.find(({ id }) => id === "resolve_incident")
      .reason,
    "no_pending_incident",
  );
  assert.notEqual(readFileSync(statePath, "utf8"), beforePreview);
});
