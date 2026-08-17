import Foundation

enum TuiArea: String, CaseIterable, Equatable, Sendable {
  case overview
  case habitat
  case expedition
  case laboratory
  case codex

  static func from(recommendationTarget target: String?) -> TuiArea {
    switch target {
    case "habitat", "cabinet": .habitat
    case "expedition": .expedition
    case "laboratory", "culture": .laboratory
    case "codex": .codex
    default: .overview
    }
  }
}

struct DesktopInsight: Equatable, Sendable {
  let title: String
  let statusLine: String
  let diagnosisLine: String?
  let actionLine: String?
  let targetArea: TuiArea
}

struct DesktopInsightProjector: Sendable {
  func project(
    snapshot: DesktopSnapshot?,
    syncState: DesktopSyncState,
    language: DesktopLanguage
  ) -> DesktopInsight {
    let copy = DesktopMenuCopy(language: language)
    guard let snapshot else {
      let actionLine = syncState == .unlinked ? copy.linkDesktop : copy.refreshSnapshot
      return DesktopInsight(
        title: "ANTI-AI",
        statusLine: copy.syncState(syncState),
        diagnosisLine: nil,
        actionLine: actionLine,
        targetArea: .overview
      )
    }

    let state = SpecimenDisplayState(rawValue: snapshot.creature.poseId) ?? .idle
    let statusLine =
      syncState == .ready
      ? "\(copy.currentState) · \(copy.state(state))"
      : copy.syncState(syncState)
    let diagnosisLine = snapshot.clinic.map {
      "\(copy.diagnosis) · \($0.label.value(for: language))"
    }
    let actionLine =
      syncState == .tuiLaunchFailed
      ? copy.relinkDesktop
      : snapshot.recommendation.map {
        "\(copy.recommendation) · \($0.label.value(for: language))"
      }

    return DesktopInsight(
      title: snapshot.title?.value(for: language) ?? "ANTI-AI · \(snapshot.creature.specimenId)",
      statusLine: statusLine,
      diagnosisLine: diagnosisLine,
      actionLine: actionLine,
      targetArea: .from(recommendationTarget: snapshot.recommendation?.target)
    )
  }
}
