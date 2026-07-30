import { localized } from "./shared.mjs";
import { COMPARISON_REFERENCES } from "./methodology.mjs";

const NUMBER = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INTEGER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatDuration(hours, lang = "zh") {
  if (hours <= 0) {
    return `0.00 ${localized(lang, "秒", "seconds")}`;
  }
  if (hours < 1 / 3_600) {
    const gap = (1 / 3_600) / hours;
    return localized(
      lang,
      `还差 ${INTEGER.format(gap)} 倍才够 1 秒`,
      `${INTEGER.format(gap)}× short of 1 second`,
    );
  }
  if (hours < 1 / 60) {
    return `${NUMBER.format(hours * 3_600)} ${localized(lang, "秒", "seconds")}`;
  }
  if (hours < 1) {
    return `${NUMBER.format(hours * 60)} ${localized(lang, "分钟", "minutes")}`;
  }
  if (hours < 48) {
    return `${NUMBER.format(hours)} ${localized(lang, "小时", "hours")}`;
  }
  if (hours < 24 * 730) {
    return `${NUMBER.format(hours / 24)} ${localized(lang, "天", "days")}`;
  }
  return `${NUMBER.format(hours / (24 * 365))} ${localized(lang, "年", "years")}`;
}

function formatCount(value, unitZh, unitEn, lang = "zh") {
  if (value <= 0) {
    return `0.00 ${localized(lang, unitZh, unitEn)}`;
  }
  if (value >= 0.01) {
    return `${NUMBER.format(value)} ${localized(lang, unitZh, unitEn)}`;
  }
  const gap = 1 / value;
  return localized(
    lang,
    `还差 ${INTEGER.format(gap)} 倍才够 1 ${unitZh}`,
    `${INTEGER.format(gap)}× short of 1 ${unitEn}`,
  );
}

function formatPortion(value, labelZh, labelEn, lang = "zh") {
  if (value <= 0) {
    return `0.00 ${localized(lang, labelZh, labelEn)}`;
  }
  if (value >= 1) {
    return `${NUMBER.format(value)} ${localized(lang, labelZh, labelEn)}`;
  }
  if (value >= 0.0001) {
    return localized(
      lang,
      `相当于 1 ${labelZh}的 ${NUMBER.format(value * 100)}%`,
      `${NUMBER.format(value * 100)}% of 1 ${labelEn}`,
    );
  }
  const gap = 1 / value;
  return localized(
    lang,
    `还差 ${INTEGER.format(gap)} 倍才够 1 ${labelZh}`,
    `${INTEGER.format(gap)}× short of 1 ${labelEn}`,
  );
}

function everydayComparisons(resources, period = "today", lang = "zh") {
  const energyWh = resources.energyWh.value;
  const waterMl = resources.waterMl.value;
  const carbonGrams = resources.carbonGrams.value;
  const { epaEquivalencies, energyStarDishwasher, waterSense } =
    COMPARISON_REFERENCES;
  const drivingKm =
    carbonGrams / epaEquivalencies.gasolineCarCarbonGramsPerKm;
  const treeHours =
    (carbonGrams / epaEquivalencies.urbanTreeCarbonGramsPerYear) *
    365 *
    24;

  if (period === "week") {
    return [
      {
        icon: "🫖",
        label: localized(lang, "烧开 1L 水", "Boil 1L water"),
        value: formatCount(energyWh / 100, "壶", "boil", lang),
      },
      {
        icon: "💻",
        label: localized(lang, "50W 笔记本电脑", "50W laptop"),
        value: formatDuration(energyWh / 50, lang),
      },
      {
        icon: "🍲",
        label: localized(lang, "1kW 微波炉", "1kW microwave"),
        value: formatDuration(energyWh / 1_000, lang),
      },
      {
        icon: "🚿",
        label: localized(lang, "WaterSense 淋浴", "WaterSense shower"),
        value: formatDuration(
          waterMl / waterSense.showerMlPerMinute / 60,
          lang,
        ),
      },
      {
        icon: "🍽️",
        label: localized(
          lang,
          "ENERGY STAR 洗碗机",
          "ENERGY STAR dishwasher",
        ),
        value: formatPortion(
          waterMl / energyStarDishwasher.waterMlPerCycle,
          "次",
          "cycle",
          lang,
        ),
      },
    ];
  }

  if (period === "month") {
    return [
      {
        icon: "🚗",
        label: localized(lang, "平均燃油车", "Average gas car"),
        value:
          drivingKm < 1
            ? `${NUMBER.format(drivingKm * 1_000)} ${localized(lang, "米", "meters")}`
            : `${NUMBER.format(drivingKm)} ${localized(lang, "公里", "km")}`,
      },
      {
        icon: "🌳",
        label: localized(lang, "1 棵城市树", "One urban tree"),
        value: localized(
          lang,
          `需要 ${formatDuration(treeHours, lang)}吸收`,
          `needs ${formatDuration(treeHours, lang)} to absorb it`,
        ),
      },
      {
        icon: "🏊",
        label: localized(lang, "标准泳池", "Competition pool"),
        value: formatPortion(
          waterMl / 2_500_000_000,
          "池",
          "pool",
          lang,
        ),
      },
      {
        icon: "🏠",
        label: localized(
          lang,
          "美国家庭日均用电",
          "U.S. household electricity day",
        ),
        value: formatPortion(
          energyWh / epaEquivalencies.householdElectricityWhPerDay,
          "天",
          "day",
          lang,
        ),
      },
      {
        icon: "🛁",
        label: localized(lang, "一缸洗澡水", "One bathtub"),
        value: formatPortion(
          waterMl / 150_000,
          "缸",
          "bath",
          lang,
        ),
      },
    ];
  }

  return [
    {
      icon: "💡",
      label: localized(lang, "10W LED 灯", "10W LED light"),
      value: formatDuration(energyWh / 10, lang),
    },
    {
      icon: "📱",
      label: localized(lang, "19Wh 手机充电", "19Wh phone charge"),
      value: formatCount(energyWh / 19, "次", "charges", lang),
    },
    {
      icon: "🥤",
      label: localized(lang, "550mL 饮用水", "550mL drinking water"),
      value: formatPortion(
        waterMl / 550,
        "瓶",
        "bottle",
        lang,
      ),
    },
    {
      icon: "💧",
      label: localized(lang, "一滴水", "One drop of water"),
      value: formatCount(waterMl / 0.05, "滴", "drops", lang),
    },
    {
      icon: "🚗",
      label: localized(lang, "平均燃油车", "Average gas car"),
      value:
        drivingKm < 1
          ? `${NUMBER.format(drivingKm * 1_000)} ${localized(lang, "米", "meters")}`
          : `${NUMBER.format(drivingKm)} ${localized(lang, "公里", "km")}`,
    },
  ];
}

export { everydayComparisons };
