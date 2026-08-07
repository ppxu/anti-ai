import { constants as fsConstants } from "node:fs";
import { access, mkdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  companionLabel,
  companionView,
  laboratoryCompanion,
} from "../companion.mjs";
import {
  creatureArt,
  creatureLabel,
  creatureTitle,
  deriveCreature,
  loadCreatureState,
} from "../creature.mjs";
import { deriveHabitat } from "../habitat.mjs";
import {
  laboratoryCulture,
  laboratoryLabel,
  laboratoryShelf,
} from "../laboratory.mjs";
import {
  renderCompanionShareSvg,
  renderCultureShareSvg,
  renderCreatureCollectionShareSvg,
  renderHabitatShareSvg,
  renderExpeditionShareSvg,
  renderPathologyShareSvg,
} from "../renderers/svg.mjs";
import { expeditionStatus } from "../expedition.mjs";
import { expeditionShareView } from "../expedition/presentation.mjs";
import { localized } from "../shared.mjs";

function shareCardForContext(context) {
  if (context.screen === "expedition") return { card: "expedition", id: null };
  if (context.screen === "habitat") return { card: "habitat", id: null };
  if (context.screen !== "codex" || !context.entry) {
    return { card: "pathology", id: null };
  }
  const cardByType = {
    culture: "culture",
    companion: "companion",
    fossil: "fossil",
    foreignSpecimen: "wanted",
  };
  return {
    card: cardByType[context.entry.type] ?? "specimen",
    id: context.entry.id ?? null,
  };
}

async function availableShareTarget(outputDirectory, card, date) {
  const stem = `anti-ai-${card}-${date}`;
  for (let suffix = 1; suffix < 10_000; suffix += 1) {
    const filename = `${stem}${suffix === 1 ? "" : `-${suffix}`}.svg`;
    const targetPath = path.join(outputDirectory, filename);
    try {
      await access(targetPath, fsConstants.F_OK);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      return { filename, targetPath };
    }
  }
  throw new Error("share_target_exhausted");
}

function unavailable(reason, reasonLabel) {
  return { available: false, reason, reasonLabel };
}

async function directoryCanAcceptFiles(directory) {
  let candidate = directory;
  while (true) {
    try {
      const metadata = await stat(candidate);
      if (!metadata.isDirectory()) return false;
      await access(candidate, fsConstants.W_OK | fsConstants.X_OK);
      return true;
    } catch (error) {
      if (error?.code !== "ENOENT") return false;
      const parent = path.dirname(candidate);
      if (parent === candidate) return false;
      candidate = parent;
    }
  }
}

async function shareOutputDirectory(preferred, fallback) {
  if (await directoryCanAcceptFiles(preferred)) {
    return { available: true, directory: preferred, fallback: false };
  }
  if (await directoryCanAcceptFiles(fallback)) {
    return { available: true, directory: fallback, fallback: true };
  }
  return { available: false, directory: fallback, fallback: true };
}

function shareExportFailure(error, targetPath, lang) {
  const directory = path.dirname(targetPath);
  const reason = error?.code === "EEXIST"
    ? "share_target_exists"
    : ["EACCES", "EPERM", "EROFS"].includes(error?.code)
      ? "share_directory_not_writable"
      : error?.code === "ENOSPC"
        ? "share_storage_full"
        : ["ENOENT", "ENOTDIR"].includes(error?.code)
          ? "share_directory_unavailable"
          : "share_export_failed";
  const reasonLabel = {
    share_target_exists: localized(
      lang,
      `目标文件已存在：${targetPath}`,
      `The target file already exists: ${targetPath}`,
    ),
    share_directory_not_writable: localized(
      lang,
      `目标目录不可写：${directory}。请检查目录权限后重试。`,
      `The target directory is not writable: ${directory}. Check its permissions and try again.`,
    ),
    share_storage_full: localized(
      lang,
      `存储空间不足，无法写入：${targetPath}`,
      `Storage is full; the card cannot be written to: ${targetPath}`,
    ),
    share_directory_unavailable: localized(
      lang,
      `目标目录不可用：${directory}。请检查路径后重试。`,
      `The target directory is unavailable: ${directory}. Check the path and try again.`,
    ),
    share_export_failed: localized(
      lang,
      `分享卡写入失败（${error?.code ?? "UNKNOWN"}）：${targetPath}`,
      `Share card write failed (${error?.code ?? "UNKNOWN"}): ${targetPath}`,
    ),
  }[reason];
  return { status: "failed", reason, reasonLabel, targetPath };
}

function creatureShareView(state, date, lang) {
  const creature = deriveCreature(state, date);
  const today = state.days[date];
  const ecologyGain = [
    today.ecologyGains?.pollution > 0
      ? localized(
          lang,
          `污染 +${today.ecologyGains.pollution}`,
          `pollution +${today.ecologyGains.pollution}`,
        )
      : null,
    today.ecologyGains?.clarity > 0
      ? localized(
          lang,
          `清醒 +${today.ecologyGains.clarity}`,
          `clarity +${today.ecologyGains.clarity}`,
        )
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    creature,
    view: {
      date,
      specimenId: creature.appearance.specimenId,
      art: creatureArt(creature),
      ecology: creatureLabel("ecologies", creature.ecology.type, lang),
      pathology: creatureLabel("branches", creature.branch, lang),
      form: creatureLabel("ecologyForms", creature.ecologyForm, lang),
      stage: creatureLabel("stages", creature.stage, lang),
      experience: localized(
        lang,
        `阅历 ${creature.experienceDays} 天`,
        `${creature.experienceDays} experience days`,
      ),
      epithet: creatureTitle(creature, lang),
      ecologyGain:
        ecologyGain || localized(lang, "惯常波动", "habitual drift"),
    },
  };
}

function renderCultureCard(state, date, id, lang) {
  const culture = id
    ? laboratoryCulture(state, date, id)
    : laboratoryShelf(state, date).cultures.at(-1);
  if (!culture) {
    return unavailable(
      "culture_not_found",
      localized(
        lang,
        "当前没有可分享的污染培养物。",
        "No pollution culture is available to share.",
      ),
    );
  }
  return {
    available: true,
    svg: renderCultureShareSvg(
      {
        date: culture.createdAt,
        batch: culture.batch,
        cultureId: culture.id,
        art: culture.appearance.lines,
        type: laboratoryLabel("types", culture.typeId, lang),
        rarity: culture.rarity.toUpperCase(),
        materials: culture.ingredients
          .map(
            ({ type, id: ingredientId }) =>
              `${laboratoryLabel("ingredients", type, lang)} #${ingredientId}`,
          )
          .join(" × "),
        ecology: creatureLabel("ecologies", culture.ecologyId, lang),
        pathology: creatureLabel("branches", culture.pathologyId, lang),
        complication: laboratoryLabel(
          "complications",
          culture.complicationId,
          lang,
        ),
        sideEffect: laboratoryLabel(
          "sideEffects",
          culture.sideEffectId,
          lang,
        ),
      },
      lang,
    ),
  };
}

function renderCompanionCard(state, date, id, lang) {
  const active = laboratoryCompanion(state, date).companion;
  const culture = id ? laboratoryCulture(state, date, id) : null;
  const companion = culture?.companion?.bondedAt <= date
    ? companionView(culture, date)
    : active;
  if (!companion) {
    return unavailable(
      "companion_not_found",
      localized(
        lang,
        "当前没有可分享的伴生异物。",
        "No symbiotic companion is available to share.",
      ),
    );
  }
  return {
    available: true,
    svg: renderCompanionShareSvg(
      {
        date,
        cultureId: companion.cultureId,
        art: companion.appearance.lines,
        type: laboratoryLabel("types", companion.typeId, lang),
        rarity: companion.rarity.toUpperCase(),
        stage: companionLabel("stages", companion.stageId, lang),
        route: companionLabel("routes", companion.routeId, lang),
        imprints: localized(
          lang,
          `污染 ${companion.imprintCounts.pollution} · 清醒 ${companion.imprintCounts.clarity} · 常态 ${companion.imprintCounts.neutral}`,
          `pollution ${companion.imprintCounts.pollution} · clarity ${companion.imprintCounts.clarity} · neutral ${companion.imprintCounts.neutral}`,
        ),
        anomalies:
          companion.anomalyIds
            .map((anomalyId) => companionLabel("anomalies", anomalyId, lang))
            .join(" · ") || localized(lang, "尚无", "NONE"),
      },
      lang,
    ),
  };
}

function renderCreatureCard(state, date, card, id, lang) {
  const { creature, view } = creatureShareView(state, date, lang);
  if (card === "pathology") {
    return { available: true, svg: renderPathologyShareSvg(view, lang) };
  }
  if (card === "habitat") {
    const companion = laboratoryCompanion(state, date).companion;
    const habitat = deriveHabitat(
      state,
      { ...creature, companion },
      date,
      creatureArt(creature),
    );
    return {
      available: true,
      svg: renderHabitatShareSvg(
        habitat,
        {
          specimenStage: creatureLabel(
            "stages",
            habitat.specimen.stageId,
            lang,
          ),
          companionStage: habitat.companion
            ? companionLabel("stages", habitat.companion.stageId, lang)
            : localized(lang, "未绑定", "UNBONDED BAY"),
        },
        lang,
      ),
    };
  }
  if (card === "fossil") {
    const fossil = id
      ? creature.fossils.find((entry) => entry.id === id)
      : creature.fossils.at(-1);
    if (!fossil) {
      return unavailable(
        "fossil_not_found",
        localized(
          lang,
          "当前没有永久化石可生成证书。第 90 个阅历日后再来。",
          "No permanent fossil is available for certification. Return after experience day 90.",
        ),
      );
    }
    view.fossil = { ...fossil, discoveredAt: fossil.sealedAt };
    view.ecology = creatureLabel("ecologies", fossil.ecologyId, lang);
    view.pathology = creatureLabel("branches", fossil.pathologyId, lang);
    view.inheritance = creatureLabel(
      "abilities",
      fossil.inheritanceAbilityId,
      lang,
    );
    view.scar = creatureLabel("scars", fossil.scarId, lang);
    delete view.art;
  }
  return {
    available: true,
    svg: renderCreatureCollectionShareSvg(view, card, lang),
  };
}

async function prepareTuiShareCard(card, id, date, lang) {
  let state;
  try {
    state = await loadCreatureState();
  } catch {
    return unavailable(
      "creature_state_unreadable",
      localized(
        lang,
        "异变体档案无法读取。",
        "The mutation file cannot be read.",
      ),
    );
  }
  if (card === "expedition") {
    const status = expeditionStatus(state, deriveCreature(state, date), date);
    const record = status.active ?? status.latest;
    if (!record) {
      return unavailable(
        "expedition_not_found",
        localized(
          lang,
          "当前没有可分享的远征记录。",
          "No expedition record is available to share.",
        ),
      );
    }
    return {
      available: true,
      svg: renderExpeditionShareSvg(
        expeditionShareView(record, lang),
        lang,
      ),
    };
  }
  if (!state.days?.[date]) {
    return unavailable(
      "date_not_settled",
      localized(
        lang,
        "这一天尚未结算，暂时没有可导出的收容切片。",
        "This date is not settled, so there is no containment slice to export yet.",
      ),
    );
  }
  if (card === "culture") return renderCultureCard(state, date, id, lang);
  if (card === "companion") {
    return renderCompanionCard(state, date, id, lang);
  }
  return renderCreatureCard(state, date, card, id, lang);
}

function createTuiShareController(options = {}, serviceOptions = {}) {
  const lang = options.lang ?? "zh";
  const preferredOutputDirectory = path.resolve(
    serviceOptions.outputDirectory ?? process.cwd(),
  );
  const fallbackOutputDirectory = path.resolve(
    serviceOptions.fallbackDirectory
      ?? path.join(os.homedir(), ".anti-ai", "exports"),
  );
  const preparedPreviews = new WeakMap();
  return {
    preview: async (context) => {
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(context?.date ?? "")) {
        return unavailable(
          "invalid_share_date",
          localized(lang, "分享日期无效。", "The share date is invalid."),
        );
      }
      if (context.entry && !context.entry.discovered) {
        return unavailable(
          "locked_collection",
          localized(lang, "未发现的收藏不能提前导出。", "Locked collections cannot be exported."),
        );
      }
      const { card, id } = shareCardForContext(context);
      const prepared = await prepareTuiShareCard(card, id, context.date, lang);
      if (!prepared.available) return prepared;
      const output = await shareOutputDirectory(
        preferredOutputDirectory,
        fallbackOutputDirectory,
      );
      if (!output.available) {
        return unavailable(
          "share_directory_not_writable",
          localized(
            lang,
            `当前目录和备用目录都不可写：${fallbackOutputDirectory}`,
            `Neither the current nor fallback directory is writable: ${fallbackOutputDirectory}`,
          ),
        );
      }
      const target = await availableShareTarget(
        output.directory,
        card,
        context.date,
      );
      const preview = {
        available: true,
        context,
        card,
        id,
        date: context.date,
        ...target,
        privacy: localized(
          lang,
          "仅写入本地 · 不含对话、路径、模型名或精确 Token",
          "LOCAL ONLY · NO CHATS, PATHS, MODELS, OR EXACT TOKENS",
        ),
        title: localized(lang, "导出分享卡", "EXPORT SHARE CARD"),
        warning: localized(
          lang,
          output.fallback
            ? `当前目录不可写；确认后将保存到 ${target.targetPath}，已有文件不会被覆盖。`
            : "确认后会在当前目录新建 SVG；已有文件不会被覆盖。",
          output.fallback
            ? `The current directory is not writable; confirmation saves to ${target.targetPath}. Existing files are never overwritten.`
            : "Confirmation creates a new SVG in the current directory; existing files are never overwritten.",
        ),
      };
      preparedPreviews.set(preview, {
        card,
        filename: target.filename,
        targetPath: target.targetPath,
        outputDirectory: output.directory,
        svg: prepared.svg,
      });
      return preview;
    },
    execute: async (preview) => {
      const prepared = preview && preparedPreviews.get(preview);
      if (!preview?.available || !prepared) {
        return { status: "failed", reason: "invalid_share_preview" };
      }
      preparedPreviews.delete(preview);
      try {
        await mkdir(prepared.outputDirectory, {
          recursive: true,
          mode: 0o700,
        });
        await writeFile(prepared.targetPath, prepared.svg, {
          encoding: "utf8",
          flag: "wx",
        });
        return {
          status: "completed",
          card: prepared.card,
          filename: prepared.filename,
          targetPath: prepared.targetPath,
          message: localized(
            lang,
            `分享卡已保存：${prepared.filename}`,
            `Share card saved: ${prepared.filename}`,
          ),
        };
      } catch (error) {
        return shareExportFailure(error, prepared.targetPath, lang);
      }
    },
  };
}

export { createTuiShareController };
