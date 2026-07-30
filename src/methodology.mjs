import { localized } from "./shared.mjs";

const PUBLIC_CASES = {
  googleRequest: {
    energyWh: 0.24,
    waterMl: 0.26,
    carbonGrams: 0.03,
    sourceUrl:
      "https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf",
    boundary:
      "Production median text prompt including active accelerators, hosts, idle capacity, and data-center overhead.",
    labels: {
      zh: "Google 请求级生产测量",
      en: "Google request-level production measurement",
    },
  },
  openaiRequest: {
    energyWh: 0.34,
    waterMl: 0.32176,
    sourceUrl: "https://blog.samaltman.com/the-gentle-singularity",
    boundary:
      "Published average ChatGPT query without a disclosed model, request length, or complete measurement boundary.",
    labels: {
      zh: "OpenAI 请求级公开平均",
      en: "OpenAI published request-level average",
    },
  },
  mistralLifecycle: {
    outputTokens: 400,
    waterMl: 45,
    carbonGrams: 1.14,
    sourceUrl:
      "https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/",
    boundary:
      "Life-cycle assessment high-side case for a 400-output-token Le Chat response using Mistral Large 2.",
    labels: {
      zh: "Mistral 生命周期高位",
      en: "Mistral lifecycle high-side case",
    },
  },
};

const COMPARISON_REFERENCES = {
  waterSense: {
    showerMlPerMinute: 7_600,
    sourceUrl: "https://www.epa.gov/watersense/showerheads",
  },
  energyStarDishwasher: {
    waterMlPerCycle: 12_100,
    sourceUrl:
      "https://www.energystar.gov/products/dishwashers/key_product_criteria",
  },
  epaEquivalencies: {
    gasolineCarCarbonGramsPerKm: 244.2,
    urbanTreeCarbonGramsPerYear: 60_000,
    householdElectricityWhPerDay: 33_400,
    sourceUrl:
      "https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator-calculations-and-references",
  },
};

function highSide(candidates) {
  return candidates.reduce((highest, candidate) =>
    candidate.value > highest.value ? candidate : highest,
  );
}

function estimateResources(usage) {
  const requestCount = Number(usage.requests ?? 0);
  const outputTokens = Number(usage.outputTokens ?? 0);
  const google = PUBLIC_CASES.googleRequest;
  const openai = PUBLIC_CASES.openaiRequest;
  const mistral = PUBLIC_CASES.mistralLifecycle;

  return {
    energyWh: highSide([
      {
        value: requestCount * google.energyWh,
        caseId: "googleRequest",
      },
      {
        value: requestCount * openai.energyWh,
        caseId: "openaiRequest",
      },
    ]),
    waterMl: highSide([
      {
        value: requestCount * google.waterMl,
        caseId: "googleRequest",
      },
      {
        value: requestCount * openai.waterMl,
        caseId: "openaiRequest",
      },
      {
        value:
          (outputTokens / mistral.outputTokens) *
          mistral.waterMl,
        caseId: "mistralLifecycle",
      },
    ]),
    carbonGrams: highSide([
      {
        value: requestCount * google.carbonGrams,
        caseId: "googleRequest",
      },
      {
        value:
          (outputTokens / mistral.outputTokens) *
          mistral.carbonGrams,
        caseId: "mistralLifecycle",
      },
    ]),
  };
}

function referenceLabel(resource, lang = "zh") {
  const labels = PUBLIC_CASES[resource.caseId].labels;
  return localized(lang, labels.zh, labels.en);
}

function formatResource(resource, unit) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(resource.value)} ${unit}`;
}

export {
  COMPARISON_REFERENCES,
  PUBLIC_CASES,
  estimateResources,
  formatResource,
  referenceLabel,
};
