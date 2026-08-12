const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function assertPlainObject(value, field) {
  if (value !== undefined && !isPlainObject(value)) {
    throw new Error(`Invalid creature state field: ${field}`);
  }
}

function assertArray(value, field) {
  if (value !== undefined && !Array.isArray(value)) {
    throw new Error(`Invalid creature state field: ${field}`);
  }
}

function validateNestedCollections(state) {
  assertPlainObject(state.appearance, "appearance");
  assertPlainObject(state.achievements, "achievements");
  assertArray(state.specimens, "specimens");
  assertArray(state.foreignSpecimens, "foreignSpecimens");

  assertPlainObject(state.generations, "generations");
  assertArray(state.generations?.fossils, "generations.fossils");
  assertPlainObject(state.generations?.evolutions, "generations.evolutions");

  assertPlainObject(state.casebook, "casebook");
  assertArray(state.casebook?.cases, "casebook.cases");

  assertPlainObject(state.laboratory, "laboratory");
  assertArray(state.laboratory?.cultures, "laboratory.cultures");
  assertArray(state.laboratory?.bondHistory, "laboratory.bondHistory");
  assertPlainObject(
    state.laboratory?.imprintAssignments,
    "laboratory.imprintAssignments",
  );

  assertPlainObject(state.incidents, "incidents");
  assertArray(state.incidents?.records, "incidents.records");

  assertPlainObject(state.cabinet, "cabinet");
  assertArray(state.cabinet?.featured, "cabinet.featured");
  assertPlainObject(state.cabinet?.interactions, "cabinet.interactions");

  assertPlainObject(state.expeditions, "expeditions");
  assertArray(state.expeditions?.history, "expeditions.history");
  if (
    state.expeditions?.active !== undefined &&
    state.expeditions.active !== null &&
    !isPlainObject(state.expeditions.active)
  ) {
    throw new Error("Invalid creature state field: expeditions.active");
  }
}

function validateCreatureStateEnvelope(state, currentVersion) {
  if (
    !isPlainObject(state) ||
    !Number.isInteger(state.schemaVersion) ||
    state.schemaVersion < 1 ||
    state.schemaVersion > currentVersion ||
    !isPlainObject(state.days) ||
    (state.seed !== undefined && typeof state.seed !== "string")
  ) {
    throw new Error("Unsupported or invalid creature state");
  }

  for (const [date, day] of Object.entries(state.days)) {
    if (!DATE_PATTERN.test(date) || !isPlainObject(day)) {
      throw new Error(`Invalid creature state day: ${date}`);
    }
    for (const field of [
      "traits",
      "ecologyGains",
      "abilityGains",
      "interactions",
    ]) {
      assertPlainObject(day[field], `days.${date}.${field}`);
    }
    for (const field of ["achievementUnlockIds", "talentUnlockIds"]) {
      assertArray(day[field], `days.${date}.${field}`);
    }
  }

  validateNestedCollections(state);
  return state;
}

export { isPlainObject, validateCreatureStateEnvelope };
