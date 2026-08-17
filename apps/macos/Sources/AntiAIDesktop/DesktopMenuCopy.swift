import Foundation

enum DesktopLanguage: String, CaseIterable, Codable, Sendable {
  case zh
  case en

  var displayName: String {
    switch self {
    case .zh: "中文"
    case .en: "English"
    }
  }
}

struct DesktopMenuCopy: Sendable {
  let language: DesktopLanguage

  var toggleVisibility: String { language == .zh ? "显示 / 隐藏异变体" : "Show / Hide Specimen" }
  var lockPosition: String { language == .zh ? "锁定位置" : "Lock Position" }
  var resetPosition: String { language == .zh ? "重置位置" : "Reset Position" }
  var displayState: String { language == .zh ? "展示状态" : "Display State" }
  var motion: String { language == .zh ? "动态" : "Motion" }
  var languageMenu: String { language == .zh ? "语言" : "Language" }
  var settings: String { language == .zh ? "设置" : "Settings" }
  var refreshSnapshot: String { language == .zh ? "刷新桌面快照" : "Refresh Snapshot" }
  var linkDesktop: String {
    language == .zh ? "运行 anti-ai desktop link" : "Run anti-ai desktop link"
  }
  var relinkDesktop: String {
    language == .zh ? "重新运行 anti-ai desktop link" : "Run anti-ai desktop link again"
  }
  var openTUI: String { language == .zh ? "打开完整 TUI" : "Open Full TUI" }
  var checkForUpdates: String { language == .zh ? "检查更新…" : "Check for Updates…" }
  var automaticUpdateChecks: String {
    language == .zh ? "自动检查更新" : "Automatically Check for Updates"
  }
  var currentState: String { language == .zh ? "当前状态" : "Current State" }
  var lastSync: String { language == .zh ? "最后同步" : "Last Sync" }
  var diagnosis: String { language == .zh ? "主诊断" : "Diagnosis" }
  var recommendation: String { language == .zh ? "建议处置" : "Recommended" }
  var quit: String { language == .zh ? "退出 anti-ai" : "Quit anti-ai" }

  func syncState(_ state: DesktopSyncState) -> String {
    switch (language, state) {
    case (.zh, .ready): "已同步"
    case (.zh, .stale): "快照已过期 · 建议刷新"
    case (.zh, .refreshing): "正在刷新…"
    case (.zh, .unlinked): "未关联 · 运行 anti-ai desktop link"
    case (.zh, .missingSnapshot): "尚无快照 · 请刷新"
    case (.zh, .invalidSnapshot): "快照损坏 · 已保留本体"
    case (.zh, .incompatibleSnapshot): "快照版本不兼容"
    case (.zh, .tuiLaunchFailed): "无法打开 TUI · 请检查桌面关联"
    case (.zh, .failed): "刷新失败 · 旧快照仍可用"
    case (.en, .ready): "Synced"
    case (.en, .stale): "Snapshot is stale · refresh recommended"
    case (.en, .refreshing): "Refreshing…"
    case (.en, .unlinked): "Not linked · run anti-ai desktop link"
    case (.en, .missingSnapshot): "No snapshot · refresh required"
    case (.en, .invalidSnapshot): "Invalid snapshot · specimen preserved"
    case (.en, .incompatibleSnapshot): "Incompatible snapshot version"
    case (.en, .tuiLaunchFailed): "Unable to open TUI · check desktop link"
    case (.en, .failed): "Refresh failed · previous snapshot preserved"
    }
  }

  func state(_ state: SpecimenDisplayState) -> String {
    switch (language, state) {
    case (.zh, .idle): "待机"
    case (.zh, .overload): "过载"
    case (.zh, .clarity): "清醒"
    case (.zh, .anomaly): "异常"
    case (.en, .idle): "Idle"
    case (.en, .overload): "Overload"
    case (.en, .clarity): "Clarity"
    case (.en, .anomaly): "Anomaly"
    }
  }

  func motionLevel(_ level: DesktopMotionLevel) -> String {
    switch (language, level) {
    case (.zh, .off): "关闭"
    case (.zh, .low): "低动态"
    case (.zh, .full): "完整动态"
    case (.en, .off): "Off"
    case (.en, .low): "Low"
    case (.en, .full): "Full"
    }
  }
}

@MainActor
struct DesktopLanguageStore {
  private let defaults: UserDefaults
  private let key: String

  init(defaults: UserDefaults = .standard, key: String = "desktopLanguage") {
    self.defaults = defaults
    self.key = key
  }

  func load() -> DesktopLanguage {
    guard
      let rawValue = defaults.string(forKey: key),
      let language = DesktopLanguage(rawValue: rawValue)
    else {
      return .zh
    }
    return language
  }

  func save(_ language: DesktopLanguage) {
    defaults.set(language.rawValue, forKey: key)
  }
}
