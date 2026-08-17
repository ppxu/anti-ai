import AppKit
import CoreGraphics
import Foundation
import Testing

@testable import AntiAIDesktop

private func makeInteractiveSnapshot() -> DesktopSnapshot {
  let prototype = DesktopSnapshot.prototype
  return DesktopSnapshot(
    version: prototype.version,
    generatedAt: prototype.generatedAt,
    date: prototype.date,
    language: prototype.language,
    title: .init(zh: "续杯中的请求兽", en: "Request Beast on Refill"),
    creature: prototype.creature,
    clinic: .init(
      diagnosisId: "stable_metabolism",
      evidenceState: "observed",
      label: .init(zh: "稳定复发", en: "Stable Relapse")
    ),
    recommendation: .init(
      id: "inspect_culture",
      label: .init(zh: "检查培养物", en: "Inspect Culture"),
      target: "culture"
    ),
    privacy: prototype.privacy
  )
}

@Test func specimenPointerInteractionSeparatesClicksFromDragging() {
  var interaction = SpecimenPointerInteraction()

  interaction.begin(
    at: CGPoint(x: 100, y: 100),
    windowOrigin: CGPoint(x: 40, y: 50)
  )
  #expect(interaction.drag(to: CGPoint(x: 102, y: 101)) == nil)
  #expect(interaction.end(clickCount: 1) == .singleClick)

  interaction.begin(
    at: CGPoint(x: 100, y: 100),
    windowOrigin: CGPoint(x: 40, y: 50)
  )
  #expect(interaction.drag(to: CGPoint(x: 112, y: 108)) == CGPoint(x: 52, y: 58))
  #expect(interaction.end(clickCount: 1) == .drag)

  interaction.begin(
    at: CGPoint(x: 100, y: 100),
    windowOrigin: CGPoint(x: 40, y: 50)
  )
  #expect(interaction.end(clickCount: 2) == .doubleClick)
}

@Test func desktopInsightUsesTheExistingSnapshotAndLocalizesItsSingleAction() {
  let snapshot = makeInteractiveSnapshot()

  let insight = DesktopInsightProjector().project(
    snapshot: snapshot,
    syncState: .ready,
    language: .zh
  )

  #expect(insight.title == "续杯中的请求兽")
  #expect(insight.statusLine == "当前状态 · 待机")
  #expect(insight.diagnosisLine == "主诊断 · 稳定复发")
  #expect(insight.actionLine == "建议处置 · 检查培养物")
  #expect(insight.targetArea == .laboratory)

  let stale = DesktopInsightProjector().project(
    snapshot: snapshot,
    syncState: .stale,
    language: .en
  )
  #expect(stale.statusLine == "Snapshot is stale · refresh recommended")
  #expect(stale.targetArea == .laboratory)

  let launchFailed = DesktopInsightProjector().project(
    snapshot: snapshot,
    syncState: .tuiLaunchFailed,
    language: .zh
  )
  #expect(launchFailed.statusLine == "无法打开 TUI · 请检查桌面关联")
  #expect(launchFailed.actionLine == "重新运行 anti-ai desktop link")

  let unlinked = DesktopInsightProjector().project(
    snapshot: nil,
    syncState: .unlinked,
    language: .en
  )
  #expect(unlinked.actionLine == "Run anti-ai desktop link")
}

@MainActor
@Test func specimenPanelShowsANonActivatingInsightAndDoubleClickOpensItsArea() throws {
  _ = NSApplication.shared
  let suiteName = "anti-ai-desktop-interaction-tests-\(UUID().uuidString)"
  let defaults = try #require(UserDefaults(suiteName: suiteName))
  defer { defaults.removePersistentDomain(forName: suiteName) }
  var openedArea: TuiArea?
  let controller = SpecimenPanelController(
    positionStore: WindowPositionStore(defaults: defaults, key: "anchor", lockKey: "locked"),
    onOpenTUI: { openedArea = $0 }
  )
  controller.update(
    snapshot: makeInteractiveSnapshot(),
    syncState: .ready,
    language: .zh
  )

  controller.handlePointerOutcome(.singleClick)
  #expect(controller.isInsightVisible)
  #expect(controller.insightWindow?.canBecomeKey == false)
  #expect(controller.insightWindow?.canBecomeMain == false)

  controller.handlePointerOutcome(.doubleClick)
  #expect(openedArea == .laboratory)
  #expect(!controller.isInsightVisible)
}
