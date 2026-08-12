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

function assertStringArray(value, field) {
  assertArray(value, field);
  if (value !== undefined && value.some((entry) => typeof entry !== "string")) {
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

  assertPlainObject(state.clinic, "clinic");
  assertArray(state.clinic?.studies, "clinic.studies");
  if (state.clinic && state.clinic.version !== 1) {
    throw new Error("Invalid creature state field: clinic.version");
  }
  for (const [index, study] of (state.clinic?.studies ?? []).entries()) {
    if (
      !isPlainObject(study) ||
      typeof study.id !== "string" || study.id.length === 0 ||
      typeof study.protocolId !== "string" || study.protocolId.length === 0 ||
      !DATE_PATTERN.test(study.startedAt ?? "") ||
      !DATE_PATTERN.test(study.endsAt ?? "") ||
      study.startedAt > study.endsAt ||
      study.contentVersion !== 1
    ) {
      throw new Error(`Invalid creature state field: clinic.studies.${index}`);
    }
  }

  assertPlainObject(state.visitation, "visitation");
  assertArray(state.visitation?.stays, "visitation.stays");
  if (state.visitation && state.visitation.version !== 1) {
    throw new Error("Invalid creature state field: visitation.version");
  }
  if (
    state.visitation?.activeStayId !== undefined &&
    state.visitation.activeStayId !== null &&
    typeof state.visitation.activeStayId !== "string"
  ) {
    throw new Error("Invalid creature state field: visitation.activeStayId");
  }
  for (const [index, stay] of (state.visitation?.stays ?? []).entries()) {
    if (
      !isPlainObject(stay) ||
      typeof stay.id !== "string" || stay.id.length === 0 ||
      typeof stay.foreignSpecimenId !== "string" ||
      stay.foreignSpecimenId.length === 0 ||
      !DATE_PATTERN.test(stay.admittedAt ?? "") ||
      (stay.releasedAt !== null && !DATE_PATTERN.test(stay.releasedAt ?? "")) ||
      (stay.releasedAt !== null && stay.releasedAt < stay.admittedAt)
    ) {
      throw new Error(`Invalid creature state field: visitation.stays.${index}`);
    }
  }
  if (state.visitation) {
    const openStayIds = state.visitation.stays
      .filter(({ releasedAt }) => releasedAt === null)
      .map(({ id }) => id);
    if (
      openStayIds.length > 1 ||
      (openStayIds.length === 1 &&
        state.visitation.activeStayId !== openStayIds[0]) ||
      (openStayIds.length === 0 && state.visitation.activeStayId !== null)
    ) {
      throw new Error("Invalid creature state field: visitation.activeStayId");
    }
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
    assertPlainObject(day.metabolism, `days.${date}.metabolism`);
    if (day.metabolism) {
      const metabolism = day.metabolism;
      if (
        metabolism.version !== 1 ||
        typeof metabolism.mainDiagnosisId !== "string" ||
        !Number.isInteger(metabolism.baselineActiveDays) ||
        metabolism.baselineActiveDays < 0 ||
        typeof metabolism.provisional !== "boolean"
      ) {
        throw new Error(`Invalid creature state field: days.${date}.metabolism`);
      }
      assertArray(metabolism.signals, `days.${date}.metabolism.signals`);
      for (const [index, signal] of metabolism.signals.entries()) {
        if (
          !isPlainObject(signal) ||
          typeof signal.id !== "string" ||
          typeof signal.severityBand !== "string"
        ) {
          throw new Error(
            `Invalid creature state field: days.${date}.metabolism.signals.${index}`,
          );
        }
      }
      for (const field of ["fieldsUsed", "sourceIds", "excludedSourceIds"]) {
        assertStringArray(
          metabolism[field],
          `days.${date}.metabolism.${field}`,
        );
      }
    }
  }

  validateNestedCollections(state);
  return state;
}

export { isPlainObject, validateCreatureStateEnvelope };
