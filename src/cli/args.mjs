import {
  CLINIC_ACTION_IDS,
  CREATURE_ACTION_IDS,
  EXPEDITION_ACTION_IDS,
  EXPLAIN_TOPIC_IDS,
  LAB_ACTION_IDS,
} from "../registry.mjs";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {
    command,
    date: undefined,
    source: "all",
    lang: "zh",
    json: false,
    full: false,
    save: false,
    noMotion: false,
    card: undefined,
    code: undefined,
    with: undefined,
    action: undefined,
    choice: undefined,
    id: undefined,
    topic: undefined,
    destination: undefined,
    set: undefined,
    unknown: [],
    missing: undefined,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--full") {
      options.full = true;
    } else if (arg === "--save") {
      options.save = true;
    } else if (arg === "--no-motion" && command === "tui") {
      options.noMotion = true;
    } else if (arg === "--date") {
      if (rest[index + 1] === undefined || rest[index + 1].startsWith("-")) {
        options.missing ??= arg;
      } else {
        options.date = rest[++index];
      }
    } else if (arg === "--source") {
      if (rest[index + 1] === undefined || rest[index + 1].startsWith("-")) {
        options.missing ??= arg;
      } else {
        options.source = rest[++index];
      }
    } else if (arg === "--lang") {
      if (rest[index + 1] === undefined || rest[index + 1].startsWith("-")) {
        options.missing ??= arg;
      } else {
        options.lang = rest[++index];
      }
    } else if (arg === "--card") {
      if (rest[index + 1] === undefined || rest[index + 1].startsWith("-")) {
        options.missing ??= arg;
      } else {
        options.card = rest[++index];
      }
    } else if (arg === "--id") {
      if (rest[index + 1] === undefined || rest[index + 1].startsWith("-")) {
        options.missing ??= arg;
      } else {
        options.id = rest[++index];
      }
    } else if (arg === "--with") {
      if (rest[index + 1] === undefined || rest[index + 1].startsWith("-")) {
        options.missing ??= arg;
      } else {
        options.with = rest[++index];
      }
    } else if (arg === "--set" && command === "codex") {
      if (rest[index + 1] === undefined || rest[index + 1].startsWith("-")) {
        options.missing ??= arg;
      } else {
        options.set = rest[++index];
      }
    } else if (
      command === "clinic" &&
      CLINIC_ACTION_IDS.includes(arg) &&
      options.action === undefined
    ) {
      options.action = arg;
    } else if (
      command === "clinic" &&
      options.action === "start" &&
      options.choice === undefined &&
      !arg.startsWith("-")
    ) {
      options.choice = arg;
    } else if (
      command === "expedition" &&
      EXPEDITION_ACTION_IDS.includes(arg) &&
      options.action === undefined
    ) {
      options.action = arg;
    } else if (
      command === "expedition" &&
      options.action === "start" &&
      options.destination === undefined &&
      !arg.startsWith("-")
    ) {
      options.destination = arg;
    } else if (
      command === "expedition" &&
      options.action === "choose" &&
      options.choice === undefined &&
      !arg.startsWith("-")
    ) {
      options.choice = arg;
    } else if (
      command === "encounter" &&
      options.code === undefined &&
      !arg.startsWith("-")
    ) {
      options.code = arg;
    } else if (
      command === "creature" &&
      CREATURE_ACTION_IDS.includes(arg) &&
      options.action === undefined
    ) {
      options.action = arg;
    } else if (
      command === "creature" &&
      ["evolve", "incident", "intervene"].includes(options.action) &&
      options.choice === undefined &&
      !arg.startsWith("-")
    ) {
      options.choice = arg;
    } else if (
      command === "lab" &&
      LAB_ACTION_IDS.includes(arg) &&
      options.action === undefined
    ) {
      options.action = arg;
    } else if (
      command === "lab" &&
      options.action === "incubate" &&
      options.choice === undefined &&
      !arg.startsWith("-")
    ) {
      options.choice = arg;
    } else if (
      command === "lab" &&
      options.action === "inspect" &&
      options.id === undefined &&
      !arg.startsWith("-")
    ) {
      options.id = arg;
    } else if (
      command === "lab" &&
      options.action === "bond" &&
      options.id === undefined &&
      !arg.startsWith("-")
    ) {
      options.id = arg;
    } else if (
      command === "explain" &&
      EXPLAIN_TOPIC_IDS.includes(arg) &&
      options.topic === undefined
    ) {
      options.topic = arg;
    } else if (!["--help", "-h", "--version", "-v"].includes(arg)) {
      options.unknown.push(arg);
    }
  }

  return options;
}

export { parseArgs };
