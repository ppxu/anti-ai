function localized(lang, zh, en) {
  return lang === "en" ? en : zh;
}

function emptyUsage() {
  return {
    requests: 0,
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  };
}

export { emptyUsage, localized };
