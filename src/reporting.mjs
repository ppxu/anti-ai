import { emptyUsage, localized } from "./shared.mjs";

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

function estimateResources(usage) {
  const energyCandidates = [
    usage.requests * 0.24,
    usage.requests * 0.34,
  ];
  const waterCandidates = [
    usage.requests * 0.26,
    usage.requests * 0.32176,
    (usage.outputTokens / 400) * 45,
  ];
  const carbonCandidates = [
    usage.requests * 0.03,
    (usage.outputTokens / 400) * 1.14,
  ];

  return {
    energyWh: [
      Math.min(...energyCandidates),
      Math.max(...energyCandidates),
    ],
    waterMl: [
      Math.min(...waterCandidates),
      Math.max(...waterCandidates),
    ],
    carbonGrams: [
      Math.min(...carbonCandidates),
      Math.max(...carbonCandidates),
    ],
  };
}

function formatRange([low, high], unit) {
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatter.format(low)}–${formatter.format(high)} ${unit}`;
}

function formatScaledRange([low, high], scale, unit) {
  return formatRange([low * scale, high * scale], unit);
}

function formatPercentageRange([low, high]) {
  const formatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatter.format(low * 100)}%–${formatter.format(high * 100)}%`;
}

function formatChange(current, baseline, lang = "zh") {
  if (baseline === 0) {
    return current === 0 ? "0.00%" : localized(lang, "首次记录", "first record");
  }
  const change = ((current - baseline) / baseline) * 100;
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${change.toFixed(2)}%`;
}

function formatDurationRange(hours, lang = "zh") {
  const high = hours[1];
  if (high < 1 / 60) {
    return formatScaledRange(hours, 3_600, localized(lang, "秒", "seconds"));
  }
  if (high < 1) {
    return formatScaledRange(hours, 60, localized(lang, "分钟", "minutes"));
  }
  if (high < 48) return formatRange(hours, localized(lang, "小时", "hours"));
  if (high < 24 * 730) {
    return formatScaledRange(hours, 1 / 24, localized(lang, "天", "days"));
  }
  return formatScaledRange(
    hours,
    1 / (24 * 365),
    localized(lang, "年", "years"),
  );
}

function everydayComparisons(resources, lang = "zh") {
  const ledHours = resources.energyWh.map((value) => value / 10);
  const laptopHours = resources.energyWh.map((value) => value / 50);
  const phoneCharges = resources.energyWh.map((value) => value / 15);
  const kettleBoils = resources.energyWh.map((value) => value / 100);
  const cupCounts = resources.waterMl.map((value) => value / 250);
  const bottleCounts = resources.waterMl.map((value) => value / 550);
  const toiletFlushes = resources.waterMl.map((value) => value / 6_000);
  const showerMinutes = resources.waterMl.map((value) => value / 8_000);
  const vehicleGramsPerKm = 400 / 1.609344;
  const drivingKm = resources.carbonGrams.map(
    (value) => value / vehicleGramsPerKm,
  );
  const treeAbsorptionHours = resources.carbonGrams.map(
    (value) => (value / 60_000) * 365 * 24,
  );

  return {
    energy:
      resources.energyWh[1] < 15
        ? {
            icon: "💡",
            label: localized(lang, "10W LED 灯", "10W LED light"),
            value: formatDurationRange(ledHours, lang),
          }
        : resources.energyWh[1] < 1_500
          ? {
              icon: "📱",
              label: localized(lang, "15Wh 手机充电", "15Wh phone charge"),
              value: formatRange(
                phoneCharges,
                localized(lang, "次", "charges"),
              ),
            }
          : {
              icon: "🫖",
              label: localized(lang, "烧开 1L 水", "Boil 1L of water"),
              value: formatRange(kettleBoils, localized(lang, "壶", "times")),
            },
    laptop: {
      icon: "💻",
      label: localized(lang, "50W 笔记本电脑", "50W laptop"),
      value: formatDurationRange(laptopHours, lang),
    },
    water:
      bottleCounts[1] < 1
        ? {
            icon: "🚰",
            label: localized(
              lang,
              "550mL 矿泉水",
              "550mL water bottle",
            ),
            value: localized(
              lang,
              `一瓶的 ${formatPercentageRange(bottleCounts)}`,
              `${formatPercentageRange(bottleCounts)} of one bottle`,
            ),
          }
        : resources.waterMl[1] < 8_000
          ? {
              icon: "🚰",
              label: localized(
                lang,
                "550mL 矿泉水",
                "550mL water bottle",
              ),
              value: formatRange(
                bottleCounts,
                localized(lang, "瓶", "bottles"),
              ),
            }
          : {
              icon: "🚿",
              label: localized(lang, "8L/min 淋浴", "8L/min shower"),
              value: formatRange(
                showerMinutes,
                localized(lang, "分钟", "minutes"),
              ),
            },
    cup: {
      icon: "☕",
      label: localized(lang, "250mL 水杯", "250mL cup of water"),
      value:
        cupCounts[1] < 1
          ? localized(
              lang,
              `一杯的 ${formatPercentageRange(cupCounts)}`,
              `${formatPercentageRange(cupCounts)} of one cup`,
            )
          : formatRange(cupCounts, localized(lang, "杯", "cups")),
    },
    toilet: {
      icon: "🚽",
      label: localized(lang, "6L 节水马桶", "6L toilet flush"),
      value:
        toiletFlushes[1] < 1
          ? localized(
              lang,
              `一次冲水的 ${formatPercentageRange(toiletFlushes)}`,
              `${formatPercentageRange(toiletFlushes)} of one flush`,
            )
          : formatRange(
              toiletFlushes,
              localized(lang, "次冲水", "flushes"),
            ),
    },
    driving: {
      icon: "🚗",
      label: localized(lang, "平均燃油车", "Average gas car"),
      value:
        drivingKm[1] < 1
          ? formatScaledRange(
              drivingKm,
              1_000,
              localized(lang, "米", "meters"),
            )
          : formatRange(drivingKm, localized(lang, "公里", "km")),
    },
    tree: {
      icon: "🌳",
      label: localized(lang, "1 棵城市树", "One urban tree"),
      value: localized(
        lang,
        `加班 ${formatDurationRange(treeAbsorptionHours, lang)}才能吸回来`,
        `needs ${formatDurationRange(treeAbsorptionHours, lang)} to absorb it`,
      ),
    },
  };
}

function terminalWidth(value) {
  return Array.from(value).reduce(
    (total, character) =>
      total + (/\p{Script=Han}/u.test(character) ? 2 : 1),
    0,
  );
}

function padTerminal(value, width) {
  return `${value}${" ".repeat(Math.max(0, width - terminalWidth(value)))}`;
}

function renderComparison(comparison) {
  return `  ${comparison.icon}  ${padTerminal(comparison.label, 18)} ${comparison.value}`;
}

function resourceBreakdownLines(totals, title, lang = "zh") {
  const resources = estimateResources(totals);
  const comparisons = everydayComparisons(resources, lang);
  return [
    `  ${color("33", title)}`,
    `  ⚡  ${formatRange(resources.energyWh, "Wh")}`,
    `  💧  ${formatRange(resources.waterMl, "mL")}`,
    `  ☁️  ${formatRange(resources.carbonGrams, "gCO₂e")}`,
    "",
    `  ${color("33", localized(lang, "生活翻译（终于像人话了）", "Everyday translation"))}`,
    renderComparison(comparisons.energy),
    renderComparison(comparisons.laptop),
    renderComparison(comparisons.water),
    renderComparison(comparisons.cup),
    renderComparison(comparisons.toilet),
    renderComparison(comparisons.driving),
    renderComparison(comparisons.tree),
  ];
}

function sourceLabel(source) {
  return source === "codex" ? "Codex" : "Claude Code";
}

function displayModelName(model) {
  const sanitized = String(model).replace(/[\p{Cc}\p{Cf}]/gu, "�");
  const characters = Array.from(sanitized);
  return characters.length > 48
    ? `${characters.slice(0, 47).join("")}…`
    : sanitized;
}

function modelBreakdownLines(report, limit = 5, lang = "zh") {
  const entries = Object.entries(report.models ?? {})
    .flatMap(([source, models]) =>
      Object.entries(models).map(([model, usage]) => ({
        source,
        model,
        usage,
      })),
    )
    .filter((entry) => entry.usage.requests > 0)
    .sort((left, right) => right.usage.totalTokens - left.usage.totalTokens)
    .slice(0, limit);

  if (entries.length === 0) return [];
  return [
    `  ${color("33", localized(lang, "模型账单", "Model bill"))}`,
    ...entries.map((entry) => {
      const label = `${sourceLabel(entry.source)} · ${displayModelName(entry.model)}`;
      return `  ${padTerminal(label, 32)} ${formatTokens(entry.usage.totalTokens)} tokens · ${entry.usage.requests} ${localized(lang, "次", entry.usage.requests === 1 ? "request" : "requests")}`;
    }),
  ];
}

function combinedModelBreakdownLines(reports, limit = 5, lang = "zh") {
  const models = {};
  for (const report of reports) {
    for (const [source, sourceModels] of Object.entries(report.models ?? {})) {
      models[source] ??= {};
      for (const [model, usage] of Object.entries(sourceModels)) {
        addModelUsage(models[source], model, usage);
      }
    }
  }
  return modelBreakdownLines({ models }, limit, lang);
}

function formatTokens(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function color(code, value) {
  if (process.env.NO_COLOR) return value;
  if (!process.stdout.isTTY && !process.env.FORCE_COLOR) return value;
  return `\u001B[${code}m${value}\u001B[0m`;
}

function averageTotals(reports) {
  const totals = emptyUsage();
  for (const report of reports) addUsage(totals, report.totals);
  for (const key of Object.keys(totals)) totals[key] /= reports.length;
  return totals;
}

function rotatingCopy(date, choices) {
  const day = Number(date.slice(-2));
  return choices[(day - 1) % choices.length];
}

function rotatingLocalizedCopy(date, lang, zhChoices, enChoices) {
  return rotatingCopy(date, lang === "en" ? enChoices : zhChoices);
}

function dailyVerdict(totals, baseline, date, lang = "zh") {
  if (totals.requests === 0) {
    return {
      title: localized(lang, "拒绝营业", "NO SERVICE"),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          "今天没有模型请求。显卡风扇第一次听见了鸟叫。",
          "零 Token，零借口。数据中心暂时把你移出了通讯录。",
          "今天没有模型请求。数据中心暂时失去了你的关心。",
          "硅基同事空等一天，终于体验了一次人类的无效会议。",
          "今日算力消耗为零：不是进步，可能只是忘了上班。",
        ],
        [
          "No model requests today. A GPU fan heard birdsong for the first time.",
          "Zero tokens, zero excuses. The data center removed you from its contacts.",
          "No model requests today. The data center briefly stopped feeling needed.",
          "Your silicon coworker waited all day and finally experienced a human meeting.",
          "Today's compute use is zero. Progress—or perhaps you forgot to work.",
        ],
      ),
    };
  }
  if (baseline.requests === 0 || baseline.totalTokens === 0) {
    return {
      title: localized(lang, "初犯记录", "FIRST OFFENSE"),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          "历史一片空白，今天这张账单算是开业剪彩。",
          "过去七天查无此人，今天突然来给 GPU 冲业绩。",
          "过去 7 天没有可比记录，今天先把小票钉在墙上。",
          "没有基线不代表没有代价，只代表以前没抓到。",
          "第一次留下脚印。放心，数据中心已经替你裱起来了。",
        ],
        [
          "History is blank, so today's receipt gets to cut the opening ribbon.",
          "Missing for seven days, then suddenly back to hit the GPU's quota.",
          "No comparable history. Pin today's receipt to the wall for now.",
          "No baseline does not mean no cost. It means you were not caught before.",
          "Your first footprint. The data center has already framed it.",
        ],
      ),
    };
  }

  const requestRatio = totals.requests / baseline.requests;
  const tokensPerRequest = totals.totalTokens / totals.requests;
  const baselineTokensPerRequest = baseline.totalTokens / baseline.requests;
  const tokensPerRequestRatio = tokensPerRequest / baselineTokensPerRequest;
  const cacheRatio =
    totals.inputTokens === 0
      ? 0
      : totals.cachedInputTokens / totals.inputTokens;
  const baselineCacheRatio =
    baseline.inputTokens === 0
      ? 0
      : baseline.cachedInputTokens / baseline.inputTokens;

  if (requestRatio <= 1.2 && tokensPerRequestRatio >= 1.8) {
    return {
      title: localized(lang, "上下文囤积", "CONTEXT HOARDING"),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          `单次请求是平时的 ${tokensPerRequestRatio.toFixed(2)} 倍。你把上下文窗口当成了储物间。`,
          "请求次数很克制，附件体积很诚实：少问，不代表少塞。",
          `请求没多，单次 Token 用量却膨胀到 ${tokensPerRequestRatio.toFixed(2)} 倍。`,
          "模型没有被频繁打扰，只是每次都收到一整本附件。",
          "今天走的是少量多餐的反面：少问几次，每次喂到撑。",
        ],
        [
          `Each request was ${tokensPerRequestRatio.toFixed(2)}× normal. You used the context window as a storage unit.`,
          "Very restrained request count. Very honest attachment size.",
          `Requests stayed flat while tokens per request inflated to ${tokensPerRequestRatio.toFixed(2)}×.`,
          "The model was not interrupted often. It just received a whole book each time.",
          "The opposite of small frequent meals: ask less, feed until full.",
        ],
      ),
    };
  }
  if (requestRatio >= 2) {
    return {
      title: localized(lang, "请求连发", "REQUEST BARRAGE"),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          `请求量冲到平时的 ${requestRatio.toFixed(2)} 倍，模型的在线状态被你理解成了劳动合同。`,
          "一句话能问完的事，被你拆成了连续剧。",
          `模型被叫了平时的 ${requestRatio.toFixed(2)} 倍，像个没有下班按钮的实习生。`,
          "你没有在提问，你在对数据中心进行消息轰炸。",
          "今日快捷键不是撤销，是再次发送。",
        ],
        [
          `Requests hit ${requestRatio.toFixed(2)}× normal. You mistook “online” for a labor contract.`,
          "A one-line question became a limited series.",
          `You summoned the model ${requestRatio.toFixed(2)}× as often, like an intern without a logout button.`,
          "This was not prompting. It was a denial-of-peace attack on a data center.",
          "Today's favorite shortcut was not undo. It was send again.",
        ],
      ),
    };
  }
  if (cacheRatio >= 0.7 && cacheRatio >= baselineCacheRatio + 0.1) {
    return {
      title: rotatingLocalizedCopy(
        date,
        lang,
        [
          "缓存考古学家",
          "旧 Token 翻炒师",
          "上下文遗址管理员",
          "电子包浆鉴定师",
          "会话回收站站长",
        ],
        [
          "CACHE ARCHAEOLOGIST",
          "TOKEN REHEAT CHEF",
          "CONTEXT RUINS CURATOR",
          "DIGITAL PATINA INSPECTOR",
          "CHAT LANDFILL WARDEN",
        ],
      ),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          `缓存占比 ${(cacheRatio * 100).toFixed(2)}%，新问题没有多少，旧上下文倒是盘得包浆。`,
          "今天的主要工作：把昨天的 Token 再热一遍。",
          `${(cacheRatio * 100).toFixed(2)}% 的输入来自缓存，今天主要在翻旧账。`,
          "模型记性好不好不知道，你是真的舍不得删聊天记录。",
          "上下文没有过期，只是逐渐有了历史文物的气质。",
        ],
        [
          `${(cacheRatio * 100).toFixed(2)}% cache: few new questions, beautifully polished old context.`,
          "Today's main task was reheating yesterday's tokens.",
          `${(cacheRatio * 100).toFixed(2)}% of input came from cache. Mostly digging through old tabs.`,
          "The model's memory is debatable. Your refusal to delete chats is not.",
          "The context is not stale. It is acquiring archaeological value.",
        ],
      ),
    };
  }
  if (totals.totalTokens <= baseline.totalTokens * 0.3) {
    return {
      title: localized(lang, "电子戒断", "DIGITAL DETOX"),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          "今天的 Token 少得像预算审批后的团建。",
          "用量骤降，显卡怀疑自己是不是被优化了。",
          "用量不到平时三成，硅基同事开始担心失业。",
          "你短暂摆脱了补全按钮，生产力是否一同消失仍待观察。",
          "数据中心今天省下的电，够你的自制力亮一会儿。",
        ],
        [
          "Today's token count looks like a team event after budget review.",
          "Usage collapsed. The GPU is wondering whether it was restructured.",
          "Usage fell below 30% of normal. Your silicon coworker fears unemployment.",
          "You escaped autocomplete briefly. Whether productivity escaped too is unclear.",
          "The power saved today could keep your self-control lit for a moment.",
        ],
      ),
    };
  }
  if (totals.totalTokens >= baseline.totalTokens * 1.5) {
    const totalRatio = totals.totalTokens / baseline.totalTokens;
    return {
      title: localized(lang, "算力暴食", "COMPUTE BINGE"),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          `Token 吃到平时的 ${totalRatio.toFixed(2)} 倍，建议账单也开启上下文压缩。`,
          "今天不是在用 AI，是在给数据中心做压力测试。",
          `Token 总量达到平时的 ${totalRatio.toFixed(2)} 倍。`,
          "你负责灵感喷涌，机房负责电表狂奔。",
          "上下文窗口被你当成了自助餐盘，而且拒绝少拿多次。",
        ],
        [
          `Tokens reached ${totalRatio.toFixed(2)}× normal. The receipt may need context compaction.`,
          "You were not using AI today. You were load-testing a data center.",
          `Total tokens reached ${totalRatio.toFixed(2)}× your baseline.`,
          "You supplied the inspiration. The server room supplied the sprinting meter.",
          "You treated the context window like an all-you-can-eat plate.",
        ],
      ),
    };
  }
  return {
    title: localized(lang, "稳定消耗", "STEADY BURN"),
    detail: rotatingLocalizedCopy(
      date,
      lang,
      [
        "用量平稳得像心电图直线——这句是否吉利由你判断。",
        "今天没有异常，只是照常把瓦时兑换成 Markdown。",
        "没有暴走，也没有戒断。只是稳定地把电变成文字。",
        "稳定发挥：你产出代码，数据中心产出热量。",
        "平平无奇的一天，除了又有一批电子经过长途跋涉变成文字。",
      ],
      [
        "Usage was as flat as a heart monitor. You decide whether that sounds healthy.",
        "Nothing unusual today. Just converting watt-hours into Markdown as usual.",
        "No binge, no detox. Just steadily turning electricity into text.",
        "Consistent performance: you produced code; the data center produced heat.",
        "An ordinary day, except more electrons completed a long trip into prose.",
      ],
    ),
  };
}

function renderReceipt(report, historicalReports = [], lang = "zh") {
  const { date, sources, totals } = report;
  const baseline =
    historicalReports.length > 0 ? averageTotals(historicalReports) : undefined;
  const verdict = baseline
    ? dailyVerdict(totals, baseline, date, lang)
    : undefined;
  const modelLines = modelBreakdownLines(report, 5, lang);
  const uncachedInputTokens = Math.max(
    0,
    totals.inputTokens -
      totals.cachedInputTokens -
      totals.cacheWriteInputTokens,
  );
  const lines = [
    color("2", "┌──────────────────────────────────────────────┐"),
    `  ${color("1;31", `YOUR AI RECEIPT · ${date}`)}`,
    color("2", "├──────────────────────────────────────────────┤"),
    "",
    `  ${color("1", `${formatTokens(totals.totalTokens)} tokens`)} · ${totals.requests} ${localized(lang, "次模型请求", totals.requests === 1 ? "model request" : "model requests")}`,
    "",
    `  Codex       ${formatTokens(sources.codex?.totalTokens ?? 0)}`,
    `  Claude Code ${formatTokens(sources.claude?.totalTokens ?? 0)}`,
    ...(modelLines.length > 0 ? ["", ...modelLines] : []),
    "",
    `  ${localized(lang, "新鲜输入   ", "Fresh input  ")} ${formatTokens(uncachedInputTokens)}`,
    `  ${localized(lang, "缓存读取   ", "Cache read   ")} ${formatTokens(totals.cachedInputTokens)}`,
    `  ${localized(lang, "缓存写入   ", "Cache write  ")} ${formatTokens(totals.cacheWriteInputTokens)}`,
    `  ${localized(lang, "模型输出   ", "Model output ")} ${formatTokens(totals.outputTokens)}`,
    "",
    ...resourceBreakdownLines(
      totals,
      localized(
        lang,
        "资源消耗估算（参考公开数据）",
        "Estimated resource use (from public data)",
      ),
      lang,
    ),
    ...(baseline
      ? [
          "",
          `  ${color("33", localized(lang, "个人基线（过去 7 个自然日）", "Personal baseline (prior 7 calendar days)"))}`,
          `  Token     ${formatChange(totals.totalTokens, baseline.totalTokens, lang)}`,
          `  ${localized(lang, "请求      ", "Requests  ")} ${formatChange(totals.requests, baseline.requests, lang)}`,
          "",
          `  ${color("1;31", localized(lang, `今日罪名：${verdict.title}`, `Today's charge: ${verdict.title}`))}`,
          `  ${verdict.detail}`,
        ]
      : []),
    "",
    `  ${localized(lang, `置信度：${color("1;31", "低")} · 运行 anti-ai explain 查看口径`, `Confidence: ${color("1;31", "LOW")} · run anti-ai explain for methodology`)}`,
    "",
    `  ${color("2", localized(lang, `机器开了 ${totals.requests} 张小票，地球只收到一段估算。`, `The machine printed ${totals.requests} ${totals.requests === 1 ? "receipt" : "receipts"}. Earth got an estimate.`))}`,
    color("2", "└──────────────────────────────────────────────┘"),
    "",
  ];
  return lines.join("\n");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function renderShareSvg(report, historicalReports = [], lang = "zh") {
  const { date, totals } = report;
  const resources = estimateResources(totals);
  const comparisons = everydayComparisons(resources, lang);
  const baseline =
    historicalReports.length > 0 ? averageTotals(historicalReports) : emptyUsage();
  const verdict = dailyVerdict(totals, baseline, date, lang);
  const title = localized(
    lang,
    `今日罪名：${verdict.title}`,
    `TODAY'S CHARGE: ${verdict.title}`,
  );
  const privacy = localized(
    lang,
    "隐私模式：未包含对话、路径、模型名和精确 Token",
    "PRIVACY MODE: no chats, paths, model names, or exact tokens",
  );
  const methodology = localized(
    lang,
    "资源消耗估算 · 参考公开数据 · 置信度低",
    "Resource use estimate · public data · low confidence",
  );
  const tokenChange = formatChange(
    totals.totalTokens,
    baseline.totalTokens,
    lang,
  );
  const requestChange = formatChange(
    totals.requests,
    baseline.requests,
    lang,
  );

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(`YOUR AI RECEIPT · ${date}`)}</title>
  <desc id="desc">${escapeXml(privacy)}</desc>
  <rect width="1200" height="630" rx="28" fill="#0b0b0c"/>
  <rect x="24" y="24" width="1152" height="582" rx="20" fill="none" stroke="#343438" stroke-width="2"/>
  <rect x="24" y="24" width="12" height="582" rx="6" fill="#ff4d4f"/>
  <style>
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .muted { fill: #8c8c94; }
    .body { fill: #f4f4f5; }
    .accent { fill: #ff5c5e; }
    .warn { fill: #f5b942; }
  </style>
  <text x="72" y="84" class="mono accent" font-size="34" font-weight="800">YOUR AI RECEIPT</text>
  <text x="1128" y="84" class="mono muted" font-size="22" text-anchor="end">${escapeXml(date)}</text>
  <line x1="72" y1="116" x2="1128" y2="116" stroke="#343438" stroke-width="2"/>

  <text x="72" y="164" class="mono warn" font-size="19">${escapeXml(localized(lang, "资源消耗估算", "RESOURCE USE ESTIMATE"))}</text>
  <text x="72" y="214" class="mono body" font-size="28">⚡ ${escapeXml(formatRange(resources.energyWh, "Wh"))}</text>
  <text x="72" y="264" class="mono body" font-size="28">💧 ${escapeXml(formatRange(resources.waterMl, "mL"))}</text>
  <text x="72" y="314" class="mono body" font-size="28">☁️ ${escapeXml(formatRange(resources.carbonGrams, "gCO₂e"))}</text>

  <text x="620" y="164" class="mono warn" font-size="19">${escapeXml(localized(lang, "生活翻译", "EVERYDAY TRANSLATION"))}</text>
  <text x="620" y="214" class="mono body" font-size="18">${escapeXml(`${comparisons.energy.icon} ${comparisons.energy.label}`)}</text>
  <text x="1128" y="214" class="mono body" font-size="18" text-anchor="end">${escapeXml(comparisons.energy.value)}</text>
  <text x="620" y="264" class="mono body" font-size="18">${escapeXml(`${comparisons.water.icon} ${comparisons.water.label}`)}</text>
  <text x="1128" y="264" class="mono body" font-size="18" text-anchor="end">${escapeXml(comparisons.water.value)}</text>
  <text x="620" y="314" class="mono body" font-size="18">${escapeXml(`${comparisons.driving.icon} ${comparisons.driving.label}`)}</text>
  <text x="1128" y="314" class="mono body" font-size="18" text-anchor="end">${escapeXml(comparisons.driving.value)}</text>

  <line x1="72" y1="354" x2="1128" y2="354" stroke="#343438" stroke-width="2"/>
  <text x="72" y="404" class="mono accent" font-size="30" font-weight="800">${escapeXml(title)}</text>
  <text x="72" y="448" class="mono body" font-size="20">${escapeXml(verdict.detail)}</text>
  <text x="72" y="492" class="mono muted" font-size="19">${escapeXml(localized(lang, `相对 7 日基线：Token ${tokenChange} · 请求 ${requestChange}`, `VS 7-DAY BASELINE: tokens ${tokenChange} · requests ${requestChange}`))}</text>

  <line x1="72" y1="526" x2="1128" y2="526" stroke="#343438" stroke-width="2"/>
  <text x="72" y="556" class="mono muted" font-size="15">${escapeXml(privacy)}</text>
  <text x="72" y="580" class="mono muted" font-size="15">${escapeXml(methodology)}</text>
  <text x="1128" y="600" class="mono muted" font-size="14" text-anchor="end">anti-ai · github.com/ppxu/anti-ai</text>
</svg>
`;
  return svg;
}

function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function inclusiveDateRange(startDate, endDate) {
  const dates = [];
  for (
    let current = startDate;
    current <= endDate;
    current = shiftDate(current, 1)
  ) {
    dates.push(current);
  }
  return dates;
}

function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return false;
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date
  );
}

function renderWeek(dailyReports, lang = "zh") {
  const firstDate = dailyReports[0].date;
  const lastDate = dailyReports.at(-1).date;
  const totals = emptyUsage();
  for (const report of dailyReports) addUsage(totals, report.totals);
  const maxTokens = Math.max(
    0,
    ...dailyReports.map((report) => report.totals.totalTokens),
  );
  const rows = dailyReports.map((report) => {
    const tokens = report.totals.totalTokens;
    const barLength =
      tokens === 0 ? 0 : Math.max(1, Math.round((tokens / maxTokens) * 20));
    const bar = barLength === 0 ? "·" : "█".repeat(barLength);
    return `  ${report.date.slice(5)}  ${bar.padEnd(20)}  ${formatTokens(tokens)}`;
  });
  const modelLines = combinedModelBreakdownLines(dailyReports, 5, lang);

  return [
    color("2", "┌──────────────────────────────────────────────┐"),
    `  ${color("1;31", `YOUR AI HANGOVER · ${firstDate} → ${lastDate}`)}`,
    color("2", "├──────────────────────────────────────────────┤"),
    "",
    ...rows,
    "",
    `  ${color("1", localized(lang, `7 日合计  ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} 次模型请求`, `7-day total  ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} ${totals.requests === 1 ? "model request" : "model requests"}`))}`,
    ...(modelLines.length > 0 ? ["", ...modelLines] : []),
    "",
    ...resourceBreakdownLines(
      totals,
      localized(lang, "7 日资源账单", "7-day resource bill"),
      lang,
    ),
    "",
    `  ${color("2", localized(lang, "七天过去了。代码也许能跑，账单肯定能。", "Seven days passed. The code might run; the bill definitely does."))}`,
    color("2", "└──────────────────────────────────────────────┘"),
    "",
  ].join("\n");
}

function heatLevel(tokens, maxTokens) {
  if (tokens === 0 || maxTokens === 0) return "·";
  const ratio = tokens / maxTokens;
  if (ratio <= 0.25) return "░";
  if (ratio <= 0.5) return "▒";
  if (ratio <= 0.75) return "▓";
  return "█";
}

function longestQuietStreak(dailyReports) {
  let longest = 0;
  let current = 0;
  for (const report of dailyReports) {
    if (report.totals.totalTokens === 0) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }
  return longest;
}

function renderMonth(dailyReports, lang = "zh") {
  const firstDate = dailyReports[0].date;
  const lastDate = dailyReports.at(-1).date;
  const totals = emptyUsage();
  for (const report of dailyReports) addUsage(totals, report.totals);

  const maxTokens = Math.max(
    0,
    ...dailyReports.map((report) => report.totals.totalTokens),
  );
  const firstWeekday =
    (new Date(`${firstDate}T12:00:00.000Z`).getUTCDay() + 6) % 7;
  const cells = Array(firstWeekday).fill("   ");
  for (const report of dailyReports) {
    const day = report.date.slice(8);
    cells.push(`${day}${heatLevel(report.totals.totalTokens, maxTokens)}`);
  }
  while (cells.length % 7 !== 0) cells.push("   ");

  const rows = [];
  for (let index = 0; index < cells.length; index += 7) {
    rows.push(`  ${cells.slice(index, index + 7).join("  ")}`);
  }

  const quietDays = dailyReports.filter(
    (report) => report.totals.totalTokens === 0,
  ).length;
  const peak = dailyReports.reduce((currentPeak, report) =>
    report.totals.totalTokens > currentPeak.totals.totalTokens
      ? report
      : currentPeak,
  );
  const modelLines = combinedModelBreakdownLines(dailyReports, 5, lang);

  return [
    color("2", "┌──────────────────────────────────────────────┐"),
    `  ${color("1;31", `YOUR AI CALENDAR · ${firstDate} → ${lastDate}`)}`,
    color("2", "├──────────────────────────────────────────────┤"),
    "",
    localized(
      lang,
      "  一    二    三    四    五    六    日",
      "  Mon  Tue  Wed  Thu  Fri  Sat  Sun",
    ),
    ...rows,
    "",
    localized(
      lang,
      "  · 无记录  ░ 少  ▒ 中  ▓ 多  █ 最重",
      "  · none  ░ low  ▒ medium  ▓ high  █ peak",
    ),
    "",
    `  ${color("1", localized(lang, `月度合计    ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} 次模型请求`, `Monthly total  ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} ${totals.requests === 1 ? "model request" : "model requests"}`))}`,
    localized(
      lang,
      `  AI 清醒日  ${quietDays} 天 / ${dailyReports.length} 天`,
      `  AI-free days  ${quietDays} ${quietDays === 1 ? "day" : "days"} / ${dailyReports.length} ${dailyReports.length === 1 ? "day" : "days"}`,
    ),
    localized(
      lang,
      `  最长清醒期 ${longestQuietStreak(dailyReports)} 天`,
      `  Longest break ${longestQuietStreak(dailyReports)} ${longestQuietStreak(dailyReports) === 1 ? "day" : "days"}`,
    ),
    localized(
      lang,
      `  最重一天    ${peak.date.slice(5)} · ${formatTokens(peak.totals.totalTokens)} tokens`,
      `  Peak day      ${peak.date.slice(5)} · ${formatTokens(peak.totals.totalTokens)} tokens`,
    ),
    ...(modelLines.length > 0 ? ["", ...modelLines] : []),
    "",
    ...resourceBreakdownLines(
      totals,
      localized(lang, "本月资源账单", "Monthly resource bill"),
      lang,
    ),
    "",
    `  ${color("2", localized(lang, "这个月还没结束，数据中心已经替你记住了。", "The month is not over. The data center already remembers it."))}`,
    color("2", "└──────────────────────────────────────────────┘"),
    "",
  ].join("\n");
}

export {
  addModelUsage,
  addUsage,
  color,
  formatTokens,
  inclusiveDateRange,
  isValidDate,
  padTerminal,
  renderMonth,
  renderReceipt,
  renderShareSvg,
  renderWeek,
  shiftDate,
  terminalWidth,
};
