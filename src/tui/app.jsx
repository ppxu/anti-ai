import React, { useEffect, useReducer, useRef } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";

import {
  deriveEventReplay,
  deriveObservationTargets,
  isGlitchFrame,
  motionInterval,
  nextMotionLevel,
} from "../application/tui-motion.mjs";
import {
  bindTuiControllerField,
  createTuiControllerState,
  shouldRunTuiMotion,
  tuiControllerReducer,
} from "../application/tui-controller.mjs";
import {
  ActionMenu,
  ActionPreview,
  ActionResult,
  ActionStatus,
} from "./action-views.jsx";
import {
  Header,
  Navigation,
  OverviewScreen,
  HabitatScreen,
  ExpeditionScreen,
  LaboratoryScreen,
  CodexScreen,
  HelpOverlay,
  ShareOverlay,
} from "./screens.jsx";

const SCREEN_IDS = [
  "overview",
  "habitat",
  "expedition",
  "laboratory",
  "codex",
];

function TuiApp({
  snapshot: initialSnapshot,
  lang = "zh",
  initialMotion = "low",
  actionController = null,
  shareController = null,
  terminalColumns = undefined,
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const columns = terminalColumns ?? stdout?.columns ?? 80;
  const compact = columns <= 80;
  const [controller, dispatchController] = useReducer(
    tuiControllerReducer,
    { snapshot: initialSnapshot, motion: initialMotion },
    createTuiControllerState,
  );
  const {
    snapshot,
    activeIndex,
    overviewMode,
    showHelp,
    motion,
    frame,
    observationIndex,
    replayStartFrame,
    actionMode,
    actionIndex,
    actionPreview,
    actionChoiceIndex,
    actionResult,
    actionError,
    actionOrigin,
    shareMode,
    sharePreview,
    shareResult,
    shareError,
    codexMode,
    codexCategoryIndex,
    codexEntryIndex,
    codexArchiveSpan,
    codexArchiveIndex,
    laboratoryFocus,
    laboratoryProposalIndex,
    laboratoryCultureIndex,
    expeditionDestinationIndex,
    expeditionChoiceIndex,
    inspectingCulture,
  } = controller;
  const setSnapshot = bindTuiControllerField(dispatchController, "snapshot");
  const setActiveIndex = bindTuiControllerField(dispatchController, "activeIndex");
  const setOverviewMode = bindTuiControllerField(dispatchController, "overviewMode");
  const setShowHelp = bindTuiControllerField(dispatchController, "showHelp");
  const setMotion = bindTuiControllerField(dispatchController, "motion");
  const setFrame = bindTuiControllerField(dispatchController, "frame");
  const setObservationIndex = bindTuiControllerField(dispatchController, "observationIndex");
  const setReplayStartFrame = bindTuiControllerField(dispatchController, "replayStartFrame");
  const setActionMode = bindTuiControllerField(dispatchController, "actionMode");
  const setActionIndex = bindTuiControllerField(dispatchController, "actionIndex");
  const setActionPreview = bindTuiControllerField(dispatchController, "actionPreview");
  const setActionChoiceIndex = bindTuiControllerField(dispatchController, "actionChoiceIndex");
  const setActionResult = bindTuiControllerField(dispatchController, "actionResult");
  const setActionError = bindTuiControllerField(dispatchController, "actionError");
  const setActionOrigin = bindTuiControllerField(dispatchController, "actionOrigin");
  const setShareMode = bindTuiControllerField(dispatchController, "shareMode");
  const setSharePreview = bindTuiControllerField(dispatchController, "sharePreview");
  const setShareResult = bindTuiControllerField(dispatchController, "shareResult");
  const setShareError = bindTuiControllerField(dispatchController, "shareError");
  const setCodexMode = bindTuiControllerField(dispatchController, "codexMode");
  const setCodexCategoryIndex = bindTuiControllerField(dispatchController, "codexCategoryIndex");
  const setCodexEntryIndex = bindTuiControllerField(dispatchController, "codexEntryIndex");
  const setCodexArchiveSpan = bindTuiControllerField(dispatchController, "codexArchiveSpan");
  const setCodexArchiveIndex = bindTuiControllerField(dispatchController, "codexArchiveIndex");
  const setLaboratoryFocus = bindTuiControllerField(dispatchController, "laboratoryFocus");
  const setLaboratoryProposalIndex = bindTuiControllerField(dispatchController, "laboratoryProposalIndex");
  const setLaboratoryCultureIndex = bindTuiControllerField(dispatchController, "laboratoryCultureIndex");
  const setExpeditionDestinationIndex = bindTuiControllerField(dispatchController, "expeditionDestinationIndex");
  const setExpeditionChoiceIndex = bindTuiControllerField(dispatchController, "expeditionChoiceIndex");
  const setInspectingCulture = bindTuiControllerField(dispatchController, "inspectingCulture");
  const inlineActionLock = useRef(false);

  const activeId = SCREEN_IDS[activeIndex];
  const observationTargets = deriveObservationTargets(snapshot, lang);
  const glitch = isGlitchFrame(snapshot, frame, motion);
  const replay = replayStartFrame === null
    ? null
    : deriveEventReplay(
        snapshot,
        Math.floor((frame - replayStartFrame) / 3),
        lang,
      );
  const actions = snapshot.actions ?? [];
  const menuActions = actions.filter(({ available }) => available);
  const activeCodexCategory = snapshot.codex.categories[codexCategoryIndex];
  const activeCodexEntry = activeCodexCategory?.entries[codexEntryIndex] ?? null;
  const activeArchiveDay = snapshot.codex.archive.days
    .slice(0, codexArchiveSpan)[codexArchiveIndex] ?? null;

  const currentShareContext = () => {
    const settledDate = snapshot.lastSettledDate;
    if (activeId === "overview") {
      return settledDate ? { screen: "overview", date: settledDate } : null;
    }
    if (activeId === "habitat") {
      return settledDate ? { screen: "habitat", date: settledDate } : null;
    }
    if (activeId === "expedition") {
      const record = snapshot.expedition.active ?? snapshot.expedition.latest;
      return record
        ? {
            screen: "expedition",
            date: record.completedAt ?? record.abandonedAt ?? record.startedAt,
          }
        : null;
    }
    if (activeId === "codex" && codexMode === "archive_detail" && activeArchiveDay) {
      return { screen: "archive", date: activeArchiveDay.date };
    }
    if (activeId === "codex" && codexMode === "detail" && activeCodexEntry) {
      return {
        screen: "codex",
        date: activeCodexEntry.discoveredAt ?? settledDate,
        entry: activeCodexEntry,
      };
    }
    return null;
  };

  const openSharePreview = async () => {
    const context = currentShareContext();
    if (!context || !shareController?.preview) return;
    setShareMode("loading");
    setShareError(null);
    setShareResult(null);
    try {
      const preview = await shareController.preview(context);
      if (!preview.available) {
        setShareError(preview.reasonLabel ?? preview.reason);
        setShareMode("error");
        return;
      }
      setSharePreview(preview);
      setShareMode("preview");
    } catch (error) {
      setShareError(error?.message ?? String(error));
      setShareMode("error");
    }
  };

  const executeShare = async () => {
    if (!sharePreview || !shareController?.execute) return;
    setShareMode("loading");
    try {
      const result = await shareController.execute(sharePreview);
      if (result.status !== "completed") {
        setShareError(result.reasonLabel ?? result.reason);
        setShareMode("error");
        return;
      }
      setShareResult(result);
      setShareMode("result");
    } catch (error) {
      setShareError(error?.message ?? String(error));
      setShareMode("error");
    }
  };

  const openActionMenu = () => {
    const primaryIndex = snapshot.primaryAction
      ? menuActions.findIndex(({ id }) => id === snapshot.primaryAction.id)
      : 0;
    setActionIndex(Math.max(0, primaryIndex));
    setActionPreview(null);
    setActionResult(null);
    setActionError(null);
    setActionOrigin("menu");
    setActionMode("menu");
  };

  const openActionPreview = async (action, target = undefined, origin = "screen") => {
    if (!action?.available) return;
    if (!actionController?.preview) {
      setActionError(
        lang === "zh" ? "当前控制台没有行动执行器。" : "No action executor is attached.",
      );
      setActionMode("error");
      return;
    }
    setActionMode("loading");
    setActionOrigin(origin);
    try {
      const preview = await actionController.preview(action.id, target);
      if (!preview.available) {
        setActionError(preview.reasonLabel ?? preview.reason);
        setActionMode("error");
        return;
      }
      setActionPreview(preview);
      const preferredChoice = target
        ? preview.choices.findIndex(({ id }) => id === target)
        : 0;
      setActionChoiceIndex(Math.max(0, preferredChoice));
      setActionMode("preview");
    } catch (error) {
      setActionError(error?.message ?? String(error));
      setActionMode("error");
    }
  };

  const executeAction = async () => {
    if (!actionPreview || !actionController?.execute) return;
    const choice = actionPreview.choices[actionChoiceIndex]?.id;
    setActionMode("loading");
    try {
      const result = await actionController.execute(actionPreview.id, choice);
      if (result.status !== "completed") {
        if (result.snapshot) setSnapshot(result.snapshot);
        setActionError(result.reasonLabel ?? result.reason);
        setActionMode("error");
        return;
      }
      if (result.snapshot) setSnapshot(result.snapshot);
      setActionResult(result);
      setActionMode("result");
    } catch (error) {
      setActionError(error?.message ?? String(error));
      setActionMode("error");
    }
  };

  const executeInlineAction = async (action, choice = undefined) => {
    if (
      !action?.available
      || !actionController?.execute
      || inlineActionLock.current
    ) {
      return;
    }
    inlineActionLock.current = true;
    try {
      const result = await actionController.execute(action.id, choice);
      if (result.snapshot) setSnapshot(result.snapshot);
      if (result.status !== "completed") {
        setActionOrigin("screen");
        setActionError(result.reasonLabel ?? result.reason);
        setActionMode("error");
      }
    } catch (error) {
      setActionOrigin("screen");
      setActionError(error?.message ?? String(error));
      setActionMode("error");
    } finally {
      inlineActionLock.current = false;
    }
  };
  useEffect(() => {
    const interval = motionInterval(motion);
    if (
      interval === null ||
      !shouldRunTuiMotion({
        activeId,
        motion,
        showHelp,
        actionMode,
        shareMode,
      })
    ) {
      return undefined;
    }
    const timer = setInterval(() => {
      setFrame((value) => value + 1);
    }, interval);
    return () => clearInterval(timer);
  }, [activeId, motion, showHelp, actionMode, shareMode]);

  useInput((input, key) => {
    if (shareMode !== null) {
      if (shareMode === "loading") return;
      if (
        key.escape ||
        input === "q" ||
        (shareMode === "preview" && input === "n")
      ) {
        setShareMode(null);
        return;
      }
      if (shareMode === "preview" && (key.return || input === "y")) {
        void executeShare();
        return;
      }
      if (shareMode === "result" && key.return) {
        setShareMode(null);
        setSharePreview(null);
        setShareResult(null);
      }
      return;
    }
    if (actionMode !== null) {
      if (actionMode === "loading") return;
      if (
        key.escape ||
        input === "q" ||
        (actionMode === "preview" && input === "n")
      ) {
        if (["preview", "result", "error"].includes(actionMode)) {
          setActionMode(actionOrigin === "menu" ? "menu" : null);
        } else {
          setActionMode(null);
        }
        return;
      }
      if (actionMode === "menu") {
        if (input === "a") {
          setActionMode(null);
          return;
        }
        if (key.upArrow) {
          if (menuActions.length > 0) {
            setActionIndex(
              (value) => (value + menuActions.length - 1) % menuActions.length,
            );
          }
          return;
        }
        if (key.downArrow || key.tab) {
          if (menuActions.length > 0) {
            setActionIndex((value) => (value + 1) % menuActions.length);
          }
          return;
        }
        if (key.return) {
          const selectedAction = menuActions[actionIndex];
          if (
            selectedAction?.target === "expedition"
            && selectedAction.execution !== "confirm"
          ) {
            setActionMode(null);
            setActiveIndex(SCREEN_IDS.indexOf("expedition"));
          } else {
            void openActionPreview(selectedAction, undefined, "menu");
          }
          return;
        }
      }
      if (actionMode === "preview") {
        const choiceCount = actionPreview?.choices.length ?? 0;
        if (choiceCount > 0 && (key.upArrow || key.leftArrow)) {
          setActionChoiceIndex((value) => (value + choiceCount - 1) % choiceCount);
          return;
        }
        if (
          choiceCount > 0 &&
          (key.downArrow || key.rightArrow || key.tab)
        ) {
          setActionChoiceIndex((value) => (value + 1) % choiceCount);
          return;
        }
        if (key.return || input === "y") {
          void executeAction();
          return;
        }
      }
      if (actionMode === "result" && key.return) {
        const completedActionId = actionPreview?.id;
        setActionMode(null);
        setActionPreview(null);
        setActionResult(null);
        if (completedActionId === "bond") {
          setObservationIndex(null);
          setReplayStartFrame(null);
          setActiveIndex(SCREEN_IDS.indexOf("habitat"));
        }
        return;
      }
      return;
    }
    if (input === "q" && activeId === "expedition") {
      setActiveIndex(SCREEN_IDS.indexOf("overview"));
      return;
    }
    if (input === "q") {
      exit();
      return;
    }
    if (key.escape) {
      if (showHelp) {
        setShowHelp(false);
        return;
      }
      if (observationIndex !== null) {
        setObservationIndex(null);
        return;
      }
      if (replayStartFrame !== null) {
        setReplayStartFrame(null);
        return;
      }
      if (activeId === "codex" && codexMode !== "categories") {
        if (codexMode === "detail") setCodexMode("entries");
        else if (codexMode === "archive_detail") setCodexMode("archive");
        else setCodexMode("categories");
        return;
      }
      if (activeId === "laboratory" && inspectingCulture) {
        setInspectingCulture(false);
        return;
      }
      exit();
      return;
    }
    if (activeId === "habitat" && observationIndex !== null) {
      if (key.return) {
        setObservationIndex(null);
        return;
      }
      if (key.upArrow || key.leftArrow) {
        setObservationIndex(
          (value) =>
            (value + observationTargets.length - 1) %
            observationTargets.length,
        );
        return;
      }
      if (key.downArrow || key.rightArrow || key.tab) {
        setObservationIndex(
          (value) => (value + 1) % observationTargets.length,
        );
        return;
      }
    }
    if (input === "?") {
      setShowHelp((value) => !value);
      return;
    }
    if (input === "m") {
      setMotion((value) => nextMotionLevel(value));
      return;
    }
    if (input === "s" && currentShareContext()) {
      void openSharePreview();
      return;
    }
    if (input === "a") {
      openActionMenu();
      return;
    }
    if (activeId === "overview" && input === "e") {
      setOverviewMode((value) => value === "briefing" ? "details" : "briefing");
      return;
    }
    if (activeId === "habitat" && input === "l") {
      setObservationIndex(null);
      setReplayStartFrame(null);
      setLaboratoryFocus(
        snapshot.laboratory.proposals.length > 0 ? "formulas" : "shelf",
      );
      setActiveIndex(SCREEN_IDS.indexOf("laboratory"));
      return;
    }
    if (activeId === "habitat" && input === "b") {
      const bondAction = actions.find(({ id }) => id === "bond");
      const cultureId = snapshot.laboratory.shelf[0]?.id;
      if (bondAction?.available && cultureId) {
        void openActionPreview(bondAction, cultureId, "screen");
      }
      return;
    }
    if (activeId === "laboratory" && input === "b") {
      const bondAction = actions.find(({ id }) => id === "bond");
      const culture = snapshot.laboratory.shelf[laboratoryCultureIndex];
      if (bondAction?.available && culture && !culture.active) {
        void openActionPreview(bondAction, culture.id, "screen");
      }
      return;
    }
    if (activeId === "codex") {
      const categories = snapshot.codex.categories;
      const category = categories[codexCategoryIndex];
      const entries = category?.entries ?? [];
      if (codexMode === "categories") {
        if (input === "h") {
          setCodexArchiveIndex(0);
          setCodexMode("archive");
          return;
        }
        if (key.upArrow) {
          setCodexCategoryIndex(
            (value) => (value + categories.length - 1) % categories.length,
          );
          setCodexEntryIndex(0);
          return;
        }
        if (key.downArrow) {
          setCodexCategoryIndex((value) => (value + 1) % categories.length);
          setCodexEntryIndex(0);
          return;
        }
        if (key.return) {
          setCodexEntryIndex(0);
          setCodexMode("entries");
          return;
        }
      } else if (codexMode === "archive") {
        const archiveCount = Math.min(
          codexArchiveSpan,
          snapshot.codex.archive.days.length,
        );
        if (input === "t") {
          setCodexArchiveSpan((value) => (value === 7 ? 30 : 7));
          setCodexArchiveIndex(0);
          return;
        }
        if (archiveCount > 0 && key.upArrow) {
          setCodexArchiveIndex(
            (value) => (value + archiveCount - 1) % archiveCount,
          );
          return;
        }
        if (archiveCount > 0 && (key.downArrow || key.tab)) {
          setCodexArchiveIndex((value) => (value + 1) % archiveCount);
          return;
        }
        if (archiveCount > 0 && key.return) {
          setCodexMode("archive_detail");
          return;
        }
      } else if (codexMode === "entries") {
        if (entries.length > 0 && key.upArrow) {
          setCodexEntryIndex(
            (value) => (value + entries.length - 1) % entries.length,
          );
          return;
        }
        if (entries.length > 0 && (key.downArrow || key.tab)) {
          setCodexEntryIndex((value) => (value + 1) % entries.length);
          return;
        }
        if (entries.length > 0 && key.return) {
          setCodexMode("detail");
          return;
        }
      } else if (codexMode === "detail" && input === "d") {
        const entry = entries[codexEntryIndex];
        const displayAction = actions.find(({ id }) => id === "curate_display");
        if (
          entry?.discovered &&
          entry.canDisplay !== false &&
          displayAction?.available
        ) {
          void openActionPreview(displayAction, entry.key, "screen");
        }
        return;
      }
    }
    if (activeId === "expedition") {
      const expedition = snapshot.expedition;
      if (!expedition.active && expedition.eligibility.available) {
        if (key.upArrow) {
          setExpeditionDestinationIndex(
            (value) =>
              (value + expedition.destinations.length - 1) %
              expedition.destinations.length,
          );
          return;
        }
        if (key.downArrow || key.tab) {
          setExpeditionDestinationIndex(
            (value) => (value + 1) % expedition.destinations.length,
          );
          return;
        }
        if (key.return) {
          const action = actions.find(({ id }) => id === "start_expedition");
          const destination = expedition.destinations[expeditionDestinationIndex];
          if (action?.available && destination) {
            void executeInlineAction(action, destination.id);
          }
          return;
        }
      }
      if (expedition.active && input === "x") {
        const action = actions.find(({ id }) => id === "abandon_expedition");
        if (action?.available) void openActionPreview(action, undefined, "screen");
        return;
      }
      if (expedition.active?.pendingChoice) {
        const optionCount = expedition.active.events.at(-1)?.options?.length ?? 0;
        const directChoice = Number(input) - 1;
        if (
          Number.isInteger(directChoice)
          && directChoice >= 0
          && directChoice < optionCount
        ) {
          setExpeditionChoiceIndex(directChoice);
          return;
        }
        if (optionCount > 0 && key.upArrow) {
          setExpeditionChoiceIndex(
            (value) => (value + optionCount - 1) % optionCount,
          );
          return;
        }
        if (optionCount > 0 && (key.downArrow || key.tab)) {
          setExpeditionChoiceIndex((value) => (value + 1) % optionCount);
          return;
        }
      }
      if (expedition.active && key.return) {
        const pendingChoice = expedition.active.pendingChoice;
        const actionId = pendingChoice
          ? "choose_expedition"
          : "advance_expedition";
        const action = actions.find(({ id }) => id === actionId);
        const choice = pendingChoice
          ? expedition.active.events.at(-1)?.options?.[expeditionChoiceIndex]?.slot
          : undefined;
        if (action?.available) {
          void executeInlineAction(action, choice);
          if (pendingChoice) setExpeditionChoiceIndex(0);
        }
        return;
      }
    }
    if (
      activeId === "overview" &&
      key.return &&
      snapshot.primaryAction?.available
    ) {
      if (snapshot.primaryAction.target === "expedition") {
        setActiveIndex(SCREEN_IDS.indexOf("expedition"));
      } else {
        void openActionPreview(snapshot.primaryAction);
      }
      return;
    }
    if (activeId === "laboratory" && key.return) {
      if (inspectingCulture) {
        setInspectingCulture(false);
        return;
      }
      if (laboratoryFocus === "shelf") {
        if (snapshot.laboratory.shelf[laboratoryCultureIndex]) {
          setInspectingCulture(true);
        }
        return;
      }
      const incubationAction = actions.find(
        ({ id, available }) => id === "incubate" && available,
      );
      if (incubationAction) {
        const target = String(
          snapshot.laboratory.proposals[laboratoryProposalIndex]?.slot ?? "1",
        );
        void openActionPreview(incubationAction, target, "screen");
        return;
      }
    }
    if (
      activeId === "laboratory" &&
      !inspectingCulture &&
      key.tab
    ) {
      const hasProposals = snapshot.laboratory.proposals.length > 0;
      const hasCultures = snapshot.laboratory.shelf.length > 0;
      if (hasProposals && hasCultures) {
        setLaboratoryFocus((value) =>
          value === "formulas" ? "shelf" : "formulas",
        );
      } else if (hasCultures) {
        setLaboratoryFocus("shelf");
      } else if (hasProposals) {
        setLaboratoryFocus("formulas");
      }
      return;
    }
    if (
      activeId === "laboratory" &&
      !inspectingCulture &&
      (key.upArrow || key.downArrow)
    ) {
      const count = laboratoryFocus === "shelf"
        ? snapshot.laboratory.shelf.length
        : snapshot.laboratory.proposals.length;
      if (count > 0) {
        const update = key.upArrow
          ? (value) => (value + count - 1) % count
          : (value) => (value + 1) % count;
        if (laboratoryFocus === "shelf") setLaboratoryCultureIndex(update);
        else setLaboratoryProposalIndex(update);
      }
      return;
    }
    if (activeId === "habitat" && ["o", "c"].includes(input)) {
      const actionId = input === "o" ? "observe_specimen" : "contact_specimen";
      const action = actions.find(({ id }) => id === actionId);
      if (action?.available) void openActionPreview(action, undefined, "screen");
      return;
    }
    if (
      activeId === "habitat" &&
      input === "r" &&
      snapshot.habitat.events.length > 0
    ) {
      setObservationIndex(null);
      setReplayStartFrame((value) => (value === null ? frame : null));
      return;
    }
    if (
      activeId === "habitat" &&
      key.return &&
      observationTargets.length > 0
    ) {
      setReplayStartFrame(null);
      setObservationIndex(0);
      return;
    }
    const directIndex = Number(input) - 1;
    if (
      Number.isInteger(directIndex) &&
      directIndex >= 0 &&
      directIndex < SCREEN_IDS.length
    ) {
      setShowHelp(false);
      setObservationIndex(null);
      setReplayStartFrame(null);
      setInspectingCulture(false);
      if (SCREEN_IDS[directIndex] === "laboratory") {
        setLaboratoryFocus(
          snapshot.laboratory.proposals.length > 0 ? "formulas" : "shelf",
        );
      }
      setActiveIndex(directIndex);
      return;
    }
    if (key.leftArrow) {
      setReplayStartFrame(null);
      setActiveIndex((value) => (value + SCREEN_IDS.length - 1) % SCREEN_IDS.length);
    } else if (key.rightArrow || key.tab) {
      setReplayStartFrame(null);
      setActiveIndex((value) => (value + 1) % SCREEN_IDS.length);
    }
  });

  const screen = {
    overview: (
      <OverviewScreen
        snapshot={snapshot}
        lang={lang}
        mode={overviewMode}
        frame={frame}
        motion={motion}
        glitch={glitch}
        compact={compact}
      />
    ),
    habitat: (
      <HabitatScreen
        snapshot={snapshot}
        lang={lang}
        frame={frame}
        motion={motion}
        observationTargets={observationTargets}
        observationIndex={observationIndex}
        glitch={glitch}
        replay={replay}
        compact={compact}
      />
    ),
    expedition: (
      <ExpeditionScreen
        snapshot={snapshot}
        lang={lang}
        selectedDestinationIndex={expeditionDestinationIndex}
        selectedChoiceIndex={expeditionChoiceIndex}
        frame={frame}
        motion={motion}
        compact={compact}
      />
    ),
    laboratory: (
      <LaboratoryScreen
        snapshot={snapshot}
        lang={lang}
        focus={laboratoryFocus}
        selectedProposalIndex={laboratoryProposalIndex}
        selectedCultureIndex={laboratoryCultureIndex}
        inspectingCulture={inspectingCulture}
        compact={compact}
      />
    ),
    codex: (
      <CodexScreen
        snapshot={snapshot}
        lang={lang}
        mode={codexMode}
        categoryIndex={codexCategoryIndex}
        entryIndex={codexEntryIndex}
        archiveSpan={codexArchiveSpan}
        archiveIndex={codexArchiveIndex}
        compact={compact}
      />
    ),
  }[activeId];
  const zh = lang === "zh";
  const motionLabel = {
    off: zh ? "关闭" : "OFF",
    low: zh ? "低频" : "LOW",
    full: zh ? "完整" : "FULL",
  }[motion];
  const contextualFooter = activeId === "habitat"
    ? ` · Enter ${zh ? "观察" : "inspect"}${
        snapshot.habitat.events.length > 0
          ? ` · r ${zh ? "回放" : "replay"}`
          : ""
      } · s ${zh ? "分享" : "share"}`
    : activeId === "expedition" && snapshot.expedition.active
      ? ` · Enter ${zh ? "推进" : "advance"} · x ${zh ? "放弃" : "abandon"} · s ${zh ? "分享" : "share"}`
    : activeId === "expedition" && snapshot.expedition.eligibility.available
        ? ` · ↑↓ ${zh ? "目的地" : "destination"} · Enter ${zh ? "开始" : "start"}`
      : activeId === "expedition" && snapshot.expedition.latest
        ? ` · s ${zh ? "分享返航总结" : "share return summary"}`
    : activeId === "overview" && snapshot.primaryAction
      ? compact
        ? ` · e ${zh ? "档案" : "file"} · Enter ${snapshot.primaryAction.target === "expedition" ? (zh ? "远征" : "expedition") : (zh ? "处理" : "act")} · s ${zh ? "分享" : "share"}`
        : ` · e ${overviewMode === "briefing" ? (zh ? "完整档案" : "full file") : (zh ? "收起档案" : "collapse")} · Enter ${snapshot.primaryAction.target === "expedition" ? (zh ? "前往远征" : "open expedition") : (zh ? "处理" : "act")} · s ${zh ? "分享播报" : "share broadcast"}`
      : activeId === "overview"
        ? compact
          ? ` · e ${zh ? "档案" : "file"} · s ${zh ? "分享" : "share"}`
          : ` · e ${overviewMode === "briefing" ? (zh ? "完整档案" : "full file") : (zh ? "收起档案" : "collapse")} · s ${zh ? "分享播报" : "share broadcast"}`
        : activeId === "codex" && ["detail", "archive_detail"].includes(codexMode)
          ? ` · s ${zh ? "分享" : "share"}`
      : activeId === "laboratory" && inspectingCulture
        ? ` · b ${zh ? "绑定" : "bond"} · Esc ${zh ? "返回" : "back"}`
        : activeId === "laboratory" && laboratoryFocus === "shelf"
          ? ` · Enter ${zh ? "查看" : "inspect"} · b ${zh ? "绑定" : "bond"}`
          : activeId === "laboratory" &&
              actions.some(({ id, available }) => id === "incubate" && available)
            ? ` · Enter ${zh ? "培养" : "incubate"}`
        : "";
  const navigationFooter = compact
    ? `1–5 ${zh ? "区域" : "areas"} · a ${zh ? "行动" : "actions"} · ? ${zh ? "帮助" : "help"} · m ${motionLabel}`
    : `1–5 ${zh ? "区域" : "areas"} · ← → ${zh ? "切换" : "switch"} · a ${zh ? "行动" : "actions"} · ? ${zh ? "帮助" : "help"} · m ${zh ? "动态" : "motion"} ${motionLabel}`;
  const actionOverlay = {
    menu: (
      <ActionMenu
        actions={menuActions}
        unavailableCount={actions.length - menuActions.length}
        selectedIndex={actionIndex}
        lang={lang}
      />
    ),
    preview: actionPreview ? (
      <ActionPreview
        preview={actionPreview}
        selectedChoiceIndex={actionChoiceIndex}
        lang={lang}
      />
    ) : null,
    result: actionResult ? <ActionResult result={actionResult} lang={lang} /> : null,
    loading: <ActionStatus mode="loading" lang={lang} />,
    error: <ActionStatus mode="error" error={actionError} lang={lang} />,
  }[actionMode];
  const shareOverlay = shareMode === null ? null : (
    <ShareOverlay
      mode={shareMode}
      preview={sharePreview}
      result={shareResult}
      error={shareError}
      lang={lang}
    />
  );

  return (
    <Box flexDirection="column" paddingX={1} width={columns}>
      <Header snapshot={snapshot} lang={lang} />
      <Navigation
        navigation={snapshot.navigation}
        activeId={showHelp || actionMode !== null || shareMode !== null ? null : activeId}
      />
      {showHelp ? (
        <HelpOverlay lang={lang} activeId={activeId} codexMode={codexMode} />
      ) : shareOverlay ?? actionOverlay ?? screen}
      <Box marginTop={1} justifyContent="space-between">
        <Text dimColor>
          {shareMode !== null
            ? zh
              ? "本地分享 · 预览不会写入，确认后才创建 SVG"
              : "Local sharing · preview is read-only; confirmation creates the SVG"
            : actionMode !== null
            ? zh
              ? "收容协议 · 所有写入都需要明确确认"
              : "Containment protocol · every write requires confirmation"
            : `${navigationFooter}${contextualFooter}`}
        </Text>
        <Text dimColor>
          {actionMode !== null || shareMode !== null
            ? `Esc ${zh ? "返回" : "back"}`
            : `q ${zh ? "退出" : "quit"}`}
        </Text>
      </Box>
    </Box>
  );
}

export { TuiApp };
