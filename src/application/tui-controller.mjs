function createTuiControllerState({ snapshot, motion = "low" }) {
  return {
    snapshot,
    activeIndex: 0,
    overviewMode: "briefing",
    showHelp: false,
    motion,
    frame: 0,
    observationIndex: null,
    replayStartFrame: null,
    actionMode: null,
    actionIndex: 0,
    actionPreview: null,
    actionChoiceIndex: 0,
    actionResult: null,
    actionError: null,
    actionOrigin: "menu",
    shareMode: null,
    sharePreview: null,
    shareResult: null,
    shareError: null,
    codexMode: "categories",
    codexCategoryIndex: 0,
    codexEntryIndex: 0,
    codexArchiveSpan: 7,
    codexArchiveIndex: 0,
    laboratoryFocus: snapshot.laboratory.proposals.length > 0
      ? "formulas"
      : "shelf",
    laboratoryProposalIndex: 0,
    laboratoryCultureIndex: 0,
    expeditionDestinationIndex: 0,
    expeditionChoiceIndex: 0,
    inspectingCulture: false,
    visitorMode: null,
    visitorInput: "",
    visitorPreview: null,
    visitorResult: null,
    visitorError: null,
    visitorIndex: 0,
  };
}

function tuiControllerReducer(state, action) {
  if (action.type === "set") {
    const previous = state[action.field];
    const value = typeof action.value === "function"
      ? action.value(previous)
      : action.value;
    if (Object.is(previous, value)) return state;
    return { ...state, [action.field]: value };
  }
  if (action.type === "patch") return { ...state, ...action.value };
  return state;
}

function bindTuiControllerField(dispatch, field) {
  return (value) => dispatch({ type: "set", field, value });
}

function shouldRunTuiMotion({
  activeId,
  motion,
  showHelp,
  actionMode,
  shareMode,
  visitorMode,
}) {
  return (
    motion !== "off" &&
    !showHelp &&
    actionMode === null &&
    shareMode === null &&
    visitorMode == null &&
    ["overview", "habitat", "expedition"].includes(activeId)
  );
}

export {
  bindTuiControllerField,
  createTuiControllerState,
  shouldRunTuiMotion,
  tuiControllerReducer,
};
