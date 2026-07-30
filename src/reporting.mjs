import { everydayComparisons } from "./comparisons.mjs";
import { PERIOD_FOOTERS, SHARE_METHODOLOGY } from "./content.mjs";
import {
  estimateResources,
  formatResource,
  referenceLabel,
} from "./methodology.mjs";
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

function formatChange(current, baseline, lang = "zh") {
  if (baseline === 0) {
    return current === 0 ? "0.00%" : localized(lang, "首次记录", "first record");
  }
  const change = ((current - baseline) / baseline) * 100;
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${change.toFixed(2)}%`;
}

function terminalWidth(value) {
  const plain = String(value).replaceAll(/\u001B\[[0-9;]*m/g, "");
  return Array.from(plain).reduce(
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

function resourceBreakdownLines(
  totals,
  title,
  lang = "zh",
  period = "today",
) {
  const resources = estimateResources(totals);
  const comparisons = everydayComparisons(resources, period, lang);
  return [
    `  ${color("33", `${title} · ${localized(lang, "公开高位参照", "named public high-side reference")}`)}`,
    `  ⚡  ${formatResource(resources.energyWh, "Wh")} · ${referenceLabel(resources.energyWh, lang)}`,
    `  💧  ${formatResource(resources.waterMl, "mL")} · ${referenceLabel(resources.waterMl, lang)}`,
    `  ☁️  ${formatResource(resources.carbonGrams, "gCO₂e")} · ${referenceLabel(resources.carbonGrams, lang)}`,
    "",
    `  ${color("33", localized(lang, "生活翻译（终于像人话了）", "Everyday translation"))}`,
    ...comparisons.map(renderComparison),
  ];
}

function sourceLabel(source) {
  return (
    {
      codex: "Codex",
      claude: "Claude Code",
      opencode: "OpenCode",
      openclaw: "OpenClaw",
      hermes: "Hermes",
      pi: "Pi",
    }[source] ?? source
  );
}

function sourceBreakdownLines(sources) {
  const entries = Object.entries(sources).filter(
    ([, usage]) => usage.totalTokens > 0,
  );
  const width = Math.max(
    0,
    ...entries.map(([source]) => terminalWidth(sourceLabel(source))),
  );
  return entries.map(
    ([source, usage]) =>
      `  ${padTerminal(sourceLabel(source), width)} ${formatTokens(usage.totalTokens)}`,
  );
}

function sourceWarningLines(reports, lang = "zh") {
  const failures = new Map();
  for (const report of reports) {
    for (const warning of report.warnings ?? []) {
      failures.set(warning.source, warning.code);
    }
  }
  if (failures.size === 0) return [];
  return [
    color(
      "33",
      localized(
        lang,
        `  ⚠ 未计入：${[...failures]
          .map(([source, code]) => `${source} (${code})`)
          .join(" · ")}`,
        `  ⚠ Not counted: ${[...failures]
          .map(([source, code]) => `${source} (${code})`)
          .join(" · ")}`,
      ),
    ),
  ];
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
  const day = Math.floor(
    new Date(`${date}T00:00:00.000Z`).getTime() / 86_400_000,
  );
  return choices[((day % choices.length) + choices.length) % choices.length];
}

function rotatingLocalizedCopy(date, lang, zhChoices, enChoices) {
  return rotatingCopy(date, lang === "en" ? enChoices : zhChoices);
}

function periodFooter(period, date, lang) {
  return rotatingCopy(date, PERIOD_FOOTERS[period][lang]);
}

function dailyVerdict(totals, baseline, date, lang = "zh") {
  if (totals.requests === 0) {
    return {
      title: rotatingLocalizedCopy(
        date,
        lang,
        [
          "算力断供",
          "拒绝营业",
          "GPU 放假单",
          "硅基失联",
          "自动补全停尸间",
          "零请求证人",
          "手动思考嫌疑",
          "人脑试运行",
          "云端冷静期",
          "请求失踪案",
          "硅基停食日",
        ],
        [
          "COMPUTE CUTOFF",
          "NO SERVICE",
          "GPU LEAVE FORM",
          "SILICON MISSING",
          "AUTOCOMPLETE MORGUE",
          "ZERO-REQUEST WITNESS",
          "MANUAL-THOUGHT SUSPECT",
          "HUMAN BRAIN TRIAL",
          "CLOUD COOLING-OFF PERIOD",
          "MISSING REQUEST CASE",
          "SILICON FASTING DAY",
        ],
      ),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          "今天没有模型请求。显卡风扇第一次听见了鸟叫。",
          "零 Token，零借口。数据中心暂时把你移出了通讯录。",
          "今天没有模型请求。数据中心暂时失去了你的关心。",
          "硅基同事空等一天，终于体验了一次人类的无效会议。",
          "今日算力消耗为零：不是进步，可能只是忘了上班。",
          "请求记录干净得可疑，建议不要用补发来证明清白。",
          "今天只发现人类思考痕迹，实验室已送去复核。",
          "模型没有等到你，暂时把这段关系标成了已读不回。",
          "Token 供给中断，怪兽开始啃自己的使用说明。",
          "今日没有自动补全，键盘被迫承担完整句子的重量。",
          "云端一片安静，本地大脑传出轻微启动声。",
          "你成功让电表少演了一集，剧情是否推进仍待观察。",
          "零请求不是勋章，但至少不是投喂记录。",
        ],
        [
          "No model requests today. A GPU fan heard birdsong for the first time.",
          "Zero tokens, zero excuses. The data center removed you from its contacts.",
          "No model requests today. The data center briefly stopped feeling needed.",
          "Your silicon coworker waited all day and finally experienced a human meeting.",
          "Today's compute use is zero. Progress—or perhaps you forgot to work.",
          "The request log is suspiciously clean. Do not prove innocence by retrying.",
          "Only traces of human thought were found; samples went for review.",
          "The model heard nothing and marked the relationship as left on read.",
          "Token supply stopped. The creature began chewing its own manual.",
          "No autocomplete today. The keyboard carried whole sentences.",
          "The cloud was quiet. A local brain made a faint boot sound.",
          "You spared the meter one episode. Plot progress remains unclear.",
          "Zero requests is not a medal, but it is not a feeding record.",
        ],
      ),
    };
  }
  if (baseline.requests === 0 || baseline.totalTokens === 0) {
    return {
      title: rotatingLocalizedCopy(
        date,
        lang,
        [
          "初犯记录",
          "GPU 开张罪",
          "首次留痕",
          "基线失踪人口",
          "机房新客户",
          "算力破戒",
          "Token 开业犯",
          "云端初诊",
          "首张算力罚单",
          "请求户口登记",
          "模型关系建档",
        ],
        [
          "FIRST OFFENSE",
          "GPU OPENING OFFENSE",
          "FIRST TRACE",
          "BASELINE MISSING PERSON",
          "NEW DATACENTER CLIENT",
          "COMPUTE RELAPSE",
          "TOKEN GRAND OPENING",
          "CLOUD FIRST EXAM",
          "FIRST COMPUTE TICKET",
          "REQUEST REGISTRATION",
          "MODEL RELATIONSHIP FILED",
        ],
      ),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          "历史一片空白，今天这张账单算是开业剪彩。",
          "过去七天查无此人，今天突然来给 GPU 冲业绩。",
          "过去 7 天没有可比记录，今天先把小票钉在墙上。",
          "没有基线不代表没有代价，只代表以前没抓到。",
          "第一次留下脚印。放心，数据中心已经替你裱起来了。",
          "系统找不到前科，只好把今天登记成原始病例。",
          "没有历史均值可躲，今天的数字只能独自站在灯下。",
          "首张账单已生成，怪兽在孵化器里翻了个身。",
          "你和模型建立了正式关系，资源脚注担任证婚人。",
          "过去七天保持沉默，今天一句话把基线吵醒了。",
          "这是第一次记录，不代表第一次发生，病历对此很谨慎。",
          "数据太少无法比较，但足够制作一张不友好的小票。",
          "今日用量自动成为个人传统，直到明天推翻它。",
        ],
        [
          "History is blank, so today's receipt gets to cut the opening ribbon.",
          "Missing for seven days, then suddenly back to hit the GPU's quota.",
          "No comparable history. Pin today's receipt to the wall for now.",
          "No baseline does not mean no cost. It means you were not caught before.",
          "Your first footprint. The data center has already framed it.",
          "No prior record exists, so today becomes the original case file.",
          "With no average to hide behind, today's number stands alone under a lamp.",
          "The first receipt printed. Something rolled over in the hatchery.",
          "You made it official with the model; the resource footnote witnessed.",
          "Seven quiet days, then one prompt woke the baseline.",
          "First recorded does not mean first committed. The casebook is cautious.",
          "Too little data to compare; enough to print an unfriendly receipt.",
          "Today's usage becomes tradition until tomorrow overrules it.",
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
      title: rotatingLocalizedCopy(
        date,
        lang,
        [
          "上下文囤积",
          "窗口违建户",
          "附录走私犯",
          "Prompt 填埋工",
          "语料超载者",
          "附件饲养员",
          "长文本窝藏犯",
          "上下文房地产商",
          "背景材料走私船",
          "窗口超载驾驶",
          "必要附件收藏家",
        ],
        [
          "CONTEXT HOARDING",
          "WINDOW CODE VIOLATION",
          "APPENDIX SMUGGLER",
          "PROMPT LANDFILLER",
          "CORPUS OVERLOADER",
          "ATTACHMENT FEEDER",
          "LONG-TEXT HARBORING",
          "CONTEXT LANDLORD",
          "BACKGROUND SMUGGLER",
          "WINDOW OVERLOAD DRIVING",
          "ESSENTIAL ATTACHMENT COLLECTOR",
        ],
      ),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          `单次请求是平时的 ${tokensPerRequestRatio.toFixed(2)} 倍。你把上下文窗口当成了储物间。`,
          "请求次数很克制，附件体积很诚实：少问，不代表少塞。",
          `请求没多，单次 Token 用量却膨胀到 ${tokensPerRequestRatio.toFixed(2)} 倍。`,
          "模型没有被频繁打扰，只是每次都收到一整本附件。",
          "今天走的是少量多餐的反面：少问几次，每次喂到撑。",
          "你没有增加提问，只是让每个问题背着一间资料室进门。",
          "上下文窗口申请扩建，理由是所有背景都被标成了必要。",
          `单次请求达到日常的 ${tokensPerRequestRatio.toFixed(2)} 倍，像给一句话办理了整车托运。`,
          "问题很短，前情提要已经成长为独立长篇。",
          "模型收到的不是提示词，是一份带目录和附录的搬家清单。",
          "请求次数看起来很克制，Token 在每次请求里秘密集会。",
          "你把搜索范围定义成了整个已知项目，然后要求简短回答。",
          "附件不是上下文的一部分；从体积看，上下文是附件的一部分。",
        ],
        [
          `Each request was ${tokensPerRequestRatio.toFixed(2)}× normal. You used the context window as a storage unit.`,
          "Very restrained request count. Very honest attachment size.",
          `Requests stayed flat while tokens per request inflated to ${tokensPerRequestRatio.toFixed(2)}×.`,
          "The model was not interrupted often. It just received a whole book each time.",
          "The opposite of small frequent meals: ask less, feed until full.",
          "You asked no more often; each question arrived carrying a records room.",
          "The context window filed for expansion because everything was marked essential.",
          `One request reached ${tokensPerRequestRatio.toFixed(2)}× normal, like freight shipping a sentence.`,
          "The question was short. The recap became an independent novel.",
          "The model received a moving inventory with contents and appendices.",
          "Request count looked restrained. Tokens held secret meetings inside each one.",
          "You scoped search to the known project, then requested a concise answer.",
          "Attachments are not part of context; by volume, context is part of attachments.",
        ],
      ),
    };
  }
  if (requestRatio >= 2) {
    return {
      title: rotatingLocalizedCopy(
        date,
        lang,
        [
          "API 骚扰",
          "请求连发",
          "发送键纵火",
          "追问增殖",
          "模型传唤",
          "对话轰炸",
          "并发口器",
          "回车键惯犯",
          "追问流水线",
          "请求雨季",
          "模型点名册",
        ],
        [
          "API HARASSMENT",
          "REQUEST BARRAGE",
          "SEND-BUTTON ARSON",
          "FOLLOW-UP PROLIFERATION",
          "MODEL SUMMONING",
          "CHAT BOMBARDMENT",
          "CONCURRENT MAWS",
          "ENTER-KEY RECIDIVIST",
          "FOLLOW-UP ASSEMBLY LINE",
          "REQUEST MONSOON",
          "MODEL ROLL CALL",
        ],
      ),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          `请求量冲到平时的 ${requestRatio.toFixed(2)} 倍，模型的在线状态被你理解成了劳动合同。`,
          "一句话能问完的事，被你拆成了连续剧。",
          `模型被叫了平时的 ${requestRatio.toFixed(2)} 倍，像个没有下班按钮的实习生。`,
          "你没有在提问，你在对数据中心进行消息轰炸。",
          "今日快捷键不是撤销，是再次发送。",
          "每个回答刚站稳，下一条追问就把椅子抽走了。",
          `请求频率升到 ${requestRatio.toFixed(2)} 倍，发送键申请了工伤鉴定。`,
          "你把思考过程外包成了连续不断的“还有一个问题”。",
          "模型在线不等于无限接诊，今天的病历显然没看服务时间。",
          "请求队列已经排到门外，最后一条仍写着“很快就好”。",
          "你没有开启并发，只是同时失去了几次耐心。",
          "对话长度正常，追问繁殖速度不正常。",
          "今天最忙的不是模型，是负责把你每次回车变成请求的那一层。",
        ],
        [
          `Requests hit ${requestRatio.toFixed(2)}× normal. You mistook “online” for a labor contract.`,
          "A one-line question became a limited series.",
          `You summoned the model ${requestRatio.toFixed(2)}× as often, like an intern without a logout button.`,
          "This was not prompting. It was a denial-of-peace attack on a data center.",
          "Today's favorite shortcut was not undo. It was send again.",
          "Every answer found its footing just as the next follow-up pulled the chair.",
          `Request frequency hit ${requestRatio.toFixed(2)}×. The send key filed an injury claim.`,
          "You outsourced thinking into an uninterrupted series of 'one more thing.'",
          "Online does not mean unlimited triage. Today's casebook missed the hours.",
          "The queue reached outside; the last request still said 'quick question.'",
          "You did not enable concurrency; you lost patience several times at once.",
          "Conversation length was normal. Follow-up reproduction was not.",
          "The busiest layer translated every Enter press into another request.",
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
          "上下文遗址管理员",
          "电子包浆鉴定师",
          "缓存考古学家",
          "旧 Token 翻炒师",
          "会话回收站站长",
          "缓存木乃伊美容师",
          "昨日答案守灵人",
          "旧上下文物业",
          "Token 地层勘探队",
          "缓存复读机",
          "历史记录腌制师",
        ],
        [
          "CONTEXT RUINS CURATOR",
          "DIGITAL PATINA INSPECTOR",
          "CACHE ARCHAEOLOGIST",
          "TOKEN REHEAT CHEF",
          "CHAT LANDFILL WARDEN",
          "CACHE MUMMY BEAUTICIAN",
          "YESTERDAY ANSWER VIGIL",
          "OLD-CONTEXT PROPERTY OFFICE",
          "TOKEN STRATA SURVEY",
          "CACHE ECHO MACHINE",
          "HISTORY PRESERVATION CHEF",
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
          "新 Token 只是访客，旧上下文已经拿到了永久居留。",
          `缓存占到 ${(cacheRatio * 100).toFixed(2)}%，今天的创新主要是重新排列昨天。`,
          "旧答案被请回会议室，并再次被介绍为最新背景。",
          "缓存命中得很准，至于命中的是否还是问题，另行检查。",
          "会话已经长出年轮，最里面那圈还在讨论旧需求。",
          "你不是舍不得上下文，只是在经营一个私有数字博物馆。",
          "新问题进门前，先被迫参观了整段历史。",
          "今天的主要产出不是答案，是对旧答案的精装再版。",
        ],
        [
          `${(cacheRatio * 100).toFixed(2)}% cache: few new questions, beautifully polished old context.`,
          "Today's main task was reheating yesterday's tokens.",
          `${(cacheRatio * 100).toFixed(2)}% of input came from cache. Mostly digging through old tabs.`,
          "The model's memory is debatable. Your refusal to delete chats is not.",
          "The context is not stale. It is acquiring archaeological value.",
          "Fresh tokens are visitors; old context has permanent residency.",
          `${(cacheRatio * 100).toFixed(2)}% cache. Today's innovation mostly rearranged yesterday.`,
          "Old answers returned to the meeting and were introduced as current context.",
          "The cache hit precisely. Whether it still hit the question needs review.",
          "The session grew rings; the innermost one still discusses old requirements.",
          "You are not hoarding context; you operate a private digital museum.",
          "Every new question had to tour the entire history before entering.",
          "Today's main output was a hardcover reissue of an old answer.",
        ],
      ),
    };
  }
  if (totals.totalTokens <= baseline.totalTokens * 0.3) {
    return {
      title: rotatingLocalizedCopy(
        date,
        lang,
        [
          "算力节食",
          "电子戒断",
          "GPU 冷落",
          "补全断奶",
          "Prompt 禁食",
          "硅基疏远",
          "手动思考复健",
          "Token 低保户",
          "云端断联演习",
          "算力轻断食",
          "自动补全冷静期",
        ],
        [
          "COMPUTE DIET",
          "DIGITAL DETOX",
          "GPU NEGLECT",
          "AUTOCOMPLETE WEANING",
          "PROMPT FASTING",
          "SILICON DISTANCING",
          "MANUAL-THOUGHT REHAB",
          "TOKEN MINIMUM INCOME",
          "CLOUD DISCONNECTION DRILL",
          "COMPUTE LIGHT FAST",
          "AUTOCOMPLETE COOLING-OFF",
        ],
      ),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          "今天的 Token 少得像预算审批后的团建。",
          "用量骤降，显卡怀疑自己是不是被优化了。",
          "用量不到平时三成，硅基同事开始担心失业。",
          "你短暂摆脱了补全按钮，生产力是否一同消失仍待观察。",
          "数据中心今天省下的电，够你的自制力亮一会儿。",
          "今天的请求很少，模型开始把每次调用当成节日。",
          "Token 降到基线以下，怪兽只好舔培养皿上的缓存。",
          "你让自动补全休了半天，键盘因此发现自己还有字母。",
          "算力摄入显著减少，手动思考暂未发现明显副作用。",
          "数据中心今天没有忘记你，只是终于有空忘记一会儿。",
          "请求量进入低潮，发送键恢复了部分触觉。",
          "今天省下的不是地球，只是一小段可疑的克制。",
          "用量变少了。是效率提升还是问题减少，病历保持中立。",
        ],
        [
          "Today's token count looks like a team event after budget review.",
          "Usage collapsed. The GPU is wondering whether it was restructured.",
          "Usage fell below 30% of normal. Your silicon coworker fears unemployment.",
          "You escaped autocomplete briefly. Whether productivity escaped too is unclear.",
          "The power saved today could keep your self-control lit for a moment.",
          "Requests were scarce. The model treated each call as a holiday.",
          "Tokens fell below baseline; the creature licked cache off the dish.",
          "Autocomplete took half a day off. The keyboard rediscovered letters.",
          "Compute intake dropped. Manual thought shows no obvious adverse effects.",
          "The datacenter did not forget you; it finally had time to try.",
          "Requests entered low tide. The send key regained some sensation.",
          "You did not save Earth, only a small suspicious patch of restraint.",
          "Usage fell. Better efficiency or fewer problems? The casebook stays neutral.",
        ],
      ),
    };
  }
  if (totals.totalTokens >= baseline.totalTokens * 1.5) {
    const totalRatio = totals.totalTokens / baseline.totalTokens;
    return {
      title: rotatingLocalizedCopy(
        date,
        lang,
        [
          "Token 自助餐",
          "算力暴食",
          "GPU 加餐",
          "机房催吐",
          "上下文续杯",
          "算力夜宵",
          "电表喂养",
          "Token 洪峰",
          "机房加钟",
          "上下文暴雨",
          "算力吞咽障碍",
        ],
        [
          "TOKEN BUFFET",
          "COMPUTE BINGE",
          "GPU SECOND HELPING",
          "DATACENTER PURGE",
          "CONTEXT REFILL",
          "COMPUTE MIDNIGHT SNACK",
          "METER FEEDING",
          "TOKEN FLOOD",
          "SERVER-ROOM OVERTIME",
          "CONTEXT DOWNPOUR",
          "COMPUTE SWALLOWING DISORDER",
        ],
      ),
      detail: rotatingLocalizedCopy(
        date,
        lang,
        [
          `Token 吃到平时的 ${totalRatio.toFixed(2)} 倍，建议账单也开启上下文压缩。`,
          "今天不是在用 AI，是在给数据中心做压力测试。",
          `Token 总量达到平时的 ${totalRatio.toFixed(2)} 倍。`,
          "你负责灵感喷涌，机房负责电表狂奔。",
          "上下文窗口被你当成了自助餐盘，而且拒绝少拿多次。",
          "今天的用量曲线没有上升，它只是忘了哪里是天花板。",
          `总量达到基线的 ${totalRatio.toFixed(2)} 倍，怪兽要求把“偶尔”改成“主食”。`,
          "你给模型安排了加餐，电表以为这是季度冲刺。",
          "Token 像项目范围一样膨胀，暂未发现真正的截止线。",
          "请求并不一定多，但每一枚电子都被安排了团建。",
          "今天产出的文字很多，负责散热的沉默更多。",
          "模型吃饱后给出了答案，账单吃饱后给出了证据。",
          "这不是资源异常，只是你的日常突然获得了加粗格式。",
        ],
        [
          `Tokens reached ${totalRatio.toFixed(2)}× normal. The receipt may need context compaction.`,
          "You were not using AI today. You were load-testing a data center.",
          `Total tokens reached ${totalRatio.toFixed(2)}× your baseline.`,
          "You supplied the inspiration. The server room supplied the sprinting meter.",
          "You treated the context window like an all-you-can-eat plate.",
          "The usage curve did not rise; it forgot where the ceiling was.",
          `Total hit ${totalRatio.toFixed(2)}× baseline. The creature reclassified 'occasional' as food.`,
          "You ordered the model seconds. The meter assumed a quarterly push.",
          "Tokens expanded like project scope, with no true deadline in sight.",
          "Requests were not necessarily many; every electron attended the offsite.",
          "The model produced text. Cooling produced a longer silence.",
          "The model ate and answered. The bill ate and testified.",
          "Not a resource anomaly—just your routine in bold.",
        ],
      ),
    };
  }
  return {
    title: rotatingLocalizedCopy(
      date,
      lang,
      [
        "慢性补全",
        "稳定消耗",
        "日常发热",
        "算力通勤",
        "电子低烧",
        "Token 例行公事",
        "机房匀速跑步",
        "常规电子迁徙",
        "自动补全慢病",
        "稳定算力通勤",
        "机房日常值班",
      ],
      [
        "CHRONIC AUTOCOMPLETE",
        "STEADY BURN",
        "ROUTINE HEATING",
        "COMPUTE COMMUTE",
        "DIGITAL LOW-GRADE FEVER",
        "TOKEN BUSINESS AS USUAL",
        "DATACENTER JOGGING",
        "ROUTINE ELECTRON MIGRATION",
        "CHRONIC AUTOCOMPLETE",
        "STEADY COMPUTE COMMUTE",
        "SERVER-ROOM DAY SHIFT",
      ],
    ),
    detail: rotatingLocalizedCopy(
      date,
      lang,
      [
        "用量平稳得像心电图直线——这句是否吉利由你判断。",
        "今天没有异常，只是照常把瓦时兑换成 Markdown。",
        "没有暴走，也没有戒断。只是稳定地把电变成文字。",
        "稳定发挥：你产出代码，数据中心产出热量。",
        "平平无奇的一天，除了又有一批电子经过长途跋涉变成文字。",
        "今日指标全部正常，说明这种消耗已经成功变成习惯。",
        "没有峰值值得报警，只有日常值得稍微不安。",
        "模型按时上班，Token 按时下班，账单负责考勤。",
        "用量曲线平稳，像一条已经接受命运的传送带。",
        "今天没有传奇故事，只有稳定续费的基础设施。",
        "请求与基线握手言和，电表在旁边保持职业微笑。",
        "这是一份普通账单，普通到最适合被长期忽略。",
        "你没有暴食，只是按时给怪兽续上了日粮。",
      ],
      [
        "Usage was as flat as a heart monitor. You decide whether that sounds healthy.",
        "Nothing unusual today. Just converting watt-hours into Markdown as usual.",
        "No binge, no detox. Just steadily turning electricity into text.",
        "Consistent performance: you produced code; the data center produced heat.",
        "An ordinary day, except more electrons completed a long trip into prose.",
        "Every metric looks normal, meaning the consumption successfully became habit.",
        "No peak worth alarming over, only a routine worth mild unease.",
        "The model clocked in. Tokens clocked out. The receipt kept attendance.",
        "The curve stayed flat like a conveyor belt that accepted its fate.",
        "No legend today, only infrastructure renewing on schedule.",
        "Usage shook hands with baseline while the meter smiled professionally.",
        "An ordinary bill—exactly the kind easiest to ignore for years.",
        "You did not binge. You simply served the creature its scheduled ration.",
      ],
    ),
  };
}

function embeddedSectionLines(section) {
  return section ? section.trimEnd().split("\n") : [];
}

function renderReceipt(
  report,
  historicalReports = [],
  lang = "zh",
  mutationSection = "",
) {
  const { date, sources, totals } = report;
  const baseline =
    historicalReports.length > 0 ? averageTotals(historicalReports) : undefined;
  const verdict = baseline
    ? dailyVerdict(totals, baseline, date, lang)
    : undefined;
  const modelLines = modelBreakdownLines(report, 5, lang);
  const sourceLines = sourceBreakdownLines(sources);
  const warningLines = sourceWarningLines([report], lang);
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
    ...sourceLines,
    ...(warningLines.length > 0 ? ["", ...warningLines] : []),
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
    ...(mutationSection
      ? ["", ...embeddedSectionLines(mutationSection)]
      : []),
    "",
    `  ${localized(lang, "运行 anti-ai explain resources 查看参照边界", "Run anti-ai explain resources for reference boundaries")}`,
    "",
    `  ${color("2", periodFooter("today", date, lang))}`,
    color("2", "└──────────────────────────────────────────────┘"),
    "",
  ];
  return lines.join("\n");
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

function renderWeek(dailyReports, lang = "zh", mutationSection = "") {
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
  const warningLines = sourceWarningLines(dailyReports, lang);

  return [
    color("2", "┌──────────────────────────────────────────────┐"),
    `  ${color("1;31", `YOUR AI HANGOVER · ${firstDate} → ${lastDate}`)}`,
    color("2", "├──────────────────────────────────────────────┤"),
    "",
    ...rows,
    "",
    `  ${color("1", localized(lang, `7 日合计  ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} 次模型请求`, `7-day total  ${formatTokens(totals.totalTokens)} tokens · ${totals.requests} ${totals.requests === 1 ? "model request" : "model requests"}`))}`,
    ...(modelLines.length > 0 ? ["", ...modelLines] : []),
    ...(warningLines.length > 0 ? ["", ...warningLines] : []),
    "",
    ...resourceBreakdownLines(
      totals,
      localized(lang, "7 日资源账单", "7-day resource bill"),
      lang,
      "week",
    ),
    ...(mutationSection
      ? ["", ...embeddedSectionLines(mutationSection)]
      : []),
    "",
    `  ${color("2", periodFooter("week", lastDate, lang))}`,
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

function renderMonth(dailyReports, lang = "zh", mutationSection = "") {
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
  const cellWidth = 5;
  const cells = Array(firstWeekday).fill("");
  for (const report of dailyReports) {
    const day = report.date.slice(8);
    cells.push(`${day}${heatLevel(report.totals.totalTokens, maxTokens)}`);
  }
  while (cells.length % 7 !== 0) cells.push("");

  const rows = [];
  for (let index = 0; index < cells.length; index += 7) {
    rows.push(
      `  ${cells
        .slice(index, index + 7)
        .map((cell) => padTerminal(cell, cellWidth))
        .join("")}`.trimEnd(),
    );
  }
  const weekdayLabels =
    lang === "en"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["一", "二", "三", "四", "五", "六", "日"];
  const weekdayHeader = `  ${weekdayLabels
    .map((label) => padTerminal(label, cellWidth))
    .join("")}`.trimEnd();

  const quietDays = dailyReports.filter(
    (report) => report.totals.totalTokens === 0,
  ).length;
  const peak = dailyReports.reduce((currentPeak, report) =>
    report.totals.totalTokens > currentPeak.totals.totalTokens
      ? report
      : currentPeak,
  );
  const modelLines = combinedModelBreakdownLines(dailyReports, 5, lang);
  const warningLines = sourceWarningLines(dailyReports, lang);

  return [
    color("2", "┌──────────────────────────────────────────────┐"),
    `  ${color("1;31", `YOUR AI CALENDAR · ${firstDate} → ${lastDate}`)}`,
    color("2", "├──────────────────────────────────────────────┤"),
    "",
    weekdayHeader,
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
    ...(warningLines.length > 0 ? ["", ...warningLines] : []),
    "",
    ...resourceBreakdownLines(
      totals,
      localized(lang, "本月资源账单", "Monthly resource bill"),
      lang,
      "month",
    ),
    ...(mutationSection
      ? ["", ...embeddedSectionLines(mutationSection)]
      : []),
    "",
    `  ${color("2", periodFooter("month", lastDate, lang))}`,
    color("2", "└──────────────────────────────────────────────┘"),
    "",
  ].join("\n");
}

export {
  averageTotals,
  dailyVerdict,
  formatChange,
  rotatingCopy,
  addModelUsage,
  addUsage,
  color,
  formatTokens,
  inclusiveDateRange,
  isValidDate,
  padTerminal,
  renderMonth,
  renderReceipt,
  renderWeek,
  shiftDate,
  terminalWidth,
};
