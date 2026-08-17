import CoreGraphics
import Foundation

enum DesktopMotionLevel: String, CaseIterable, Codable, Sendable {
  case off
  case low
  case full

  var framesPerSecond: Double {
    switch self {
    case .off: 0
    case .low: 2
    case .full: 4
    }
  }

  func constrained(reduceMotion: Bool) -> DesktopMotionLevel {
    guard reduceMotion else { return self }
    return self == .off ? .off : .low
  }
}

enum SpecimenDisplayState: String, CaseIterable, Codable, Sendable {
  case idle
  case overload
  case clarity
  case anomaly
}

enum DesktopSyncState: Equatable, Sendable {
  case ready
  case stale
  case refreshing
  case unlinked
  case missingSnapshot
  case invalidSnapshot
  case incompatibleSnapshot
  case tuiLaunchFailed
  case failed
}

struct DesktopSnapshot: Codable, Equatable, Sendable {
  struct LocalizedText: Codable, Equatable, Sendable {
    let zh: String
    let en: String

    func value(for language: DesktopLanguage) -> String {
      language == .zh ? zh : en
    }
  }

  struct Creature: Codable, Equatable, Sendable {
    let specimenId: String
    let fingerprint: String
    let stageIndex: Int
    let ecologyId: String
    let pathologyId: String
    let formId: String
    let paletteId: String
    let poseId: String
    let bodyId: String
    let eyesId: String
    let mouthId: String
    let coreId: String
    let limbsId: String
    let tailId: String?
    let chromaticId: String?
    let scarId: String?
    let graftId: String?
  }

  struct Privacy: Codable, Equatable, Sendable {
    let containsExactTokens: Bool
    let containsModels: Bool
    let containsPaths: Bool
    let containsConversation: Bool

    var isSafe: Bool {
      !containsExactTokens && !containsModels && !containsPaths && !containsConversation
    }
  }

  struct Companion: Codable, Equatable, Sendable {
    let cultureId: String
    let stageId: String
    let routeId: String
    let anomalyIds: [String]
  }

  struct Visitor: Codable, Equatable, Sendable {
    let stayId: String
    let specimenId: String
    let formId: String
    let relationshipId: String
  }

  struct Habitat: Codable, Equatable, Sendable {
    let sceneId: String
    let cycleId: String
    let phenomenonId: String?
  }

  struct Briefing: Codable, Equatable, Sendable {
    struct Section: Codable, Equatable, Sendable {
      let id: String
      let kind: String
      let label: LocalizedText
      let detail: LocalizedText
      let target: String
    }

    let status: String
    let sections: [Section]
  }

  struct Clinic: Codable, Equatable, Sendable {
    let diagnosisId: String
    let evidenceState: String
    let label: LocalizedText
  }

  struct Recommendation: Codable, Equatable, Sendable {
    let id: String
    let label: LocalizedText
    let target: String
  }

  let version: Int
  let generatedAt: String
  let date: String
  let language: String
  let status: String?
  let lastSettledDate: String?
  let title: LocalizedText?
  let creature: Creature
  let companion: Companion?
  let visitor: Visitor?
  let habitat: Habitat?
  let briefing: Briefing?
  let clinic: Clinic?
  let recommendation: Recommendation?
  let privacy: Privacy

  init(
    version: Int,
    generatedAt: String,
    date: String,
    language: String,
    status: String? = nil,
    lastSettledDate: String? = nil,
    title: LocalizedText? = nil,
    creature: Creature,
    companion: Companion? = nil,
    visitor: Visitor? = nil,
    habitat: Habitat? = nil,
    briefing: Briefing? = nil,
    clinic: Clinic? = nil,
    recommendation: Recommendation? = nil,
    privacy: Privacy
  ) {
    self.version = version
    self.generatedAt = generatedAt
    self.date = date
    self.language = language
    self.status = status
    self.lastSettledDate = lastSettledDate
    self.title = title
    self.creature = creature
    self.companion = companion
    self.visitor = visitor
    self.habitat = habitat
    self.briefing = briefing
    self.clinic = clinic
    self.recommendation = recommendation
    self.privacy = privacy
  }

  static let prototype = DesktopSnapshot(
    version: 1,
    generatedAt: "2026-08-12T00:00:00.000Z",
    date: "2026-08-12",
    language: "zh",
    creature: Creature(
      specimenId: "140a55f3",
      fingerprint: "6ddf1c0d5913",
      stageIndex: 2,
      ecologyId: "paradox",
      pathologyId: "frenzy",
      formId: "sealed_request_hydra",
      paletteId: "paradox_r_v2",
      poseId: "idle",
      bodyId: "body_05",
      eyesId: "eyes_02",
      mouthId: "mouth_02",
      coreId: "core_02",
      limbsId: "limbs_01",
      tailId: "tail_04",
      chromaticId: "meeting_radiation",
      scarId: nil,
      graftId: nil
    ),
    privacy: Privacy(
      containsExactTokens: false,
      containsModels: false,
      containsPaths: false,
      containsConversation: false
    )
  )
}

enum DesktopSnapshotError: Error, Equatable, LocalizedError {
  case incompatibleVersion(Int)
  case unsafePrivacyBoundary
  case invalidStage(Int)
  case invalidIdentifier(String)
  case unsupportedPose(String)

  var errorDescription: String? {
    switch self {
    case .incompatibleVersion(let version):
      "Unsupported desktop snapshot version: \(version)"
    case .unsafePrivacyBoundary:
      "Desktop snapshot contains data outside the privacy boundary."
    case .invalidStage(let stage):
      "Invalid creature stage index: \(stage)"
    case .invalidIdentifier(let identifier):
      "Invalid desktop snapshot identifier: \(identifier)"
    case .unsupportedPose(let pose):
      "Unsupported desktop specimen pose: \(pose)"
    }
  }
}

struct DesktopSnapshotValidator: Sendable {
  private func validGene(_ value: String, prefix: String, range: ClosedRange<Int>) -> Bool {
    guard value.hasPrefix("\(prefix)_"), let number = Int(value.suffix(2)) else { return false }
    return range.contains(number)
  }

  func validate(_ snapshot: DesktopSnapshot) throws -> DesktopSnapshot {
    let identifier = /^[a-z0-9][a-z0-9_-]{0,63}$/
    let hexadecimal = /^[a-f0-9]{8,64}$/
    guard snapshot.version == 1 else {
      throw DesktopSnapshotError.incompatibleVersion(snapshot.version)
    }
    guard snapshot.privacy.isSafe else {
      throw DesktopSnapshotError.unsafePrivacyBoundary
    }
    guard (0...3).contains(snapshot.creature.stageIndex) else {
      throw DesktopSnapshotError.invalidStage(snapshot.creature.stageIndex)
    }
    guard SpecimenDisplayState(rawValue: snapshot.creature.poseId) != nil else {
      throw DesktopSnapshotError.unsupportedPose(snapshot.creature.poseId)
    }
    let values =
      [
        snapshot.creature.ecologyId,
        snapshot.creature.pathologyId,
        snapshot.creature.formId,
        snapshot.creature.paletteId,
        snapshot.creature.poseId,
        snapshot.creature.bodyId,
        snapshot.creature.eyesId,
        snapshot.creature.mouthId,
        snapshot.creature.coreId,
        snapshot.creature.limbsId,
      ]
      + [
        snapshot.creature.tailId,
        snapshot.creature.chromaticId,
        snapshot.creature.scarId,
        snapshot.creature.graftId,
      ].compactMap { $0 }
    for value in values where value.wholeMatch(of: identifier) == nil {
      throw DesktopSnapshotError.invalidIdentifier(value)
    }
    for value in [snapshot.creature.specimenId, snapshot.creature.fingerprint]
    where value.wholeMatch(of: hexadecimal) == nil {
      throw DesktopSnapshotError.invalidIdentifier(value)
    }
    let genes = [
      validGene(snapshot.creature.bodyId, prefix: "body", range: 1...6),
      validGene(snapshot.creature.eyesId, prefix: "eyes", range: 1...8),
      validGene(snapshot.creature.mouthId, prefix: "mouth", range: 1...8),
      validGene(snapshot.creature.coreId, prefix: "core", range: 1...6),
      validGene(snapshot.creature.limbsId, prefix: "limbs", range: 1...6),
      snapshot.creature.tailId.map { validGene($0, prefix: "tail", range: 1...6) } ?? true,
    ]
    guard genes.allSatisfy({ $0 }) else {
      throw DesktopSnapshotError.invalidIdentifier("creature-gene")
    }
    return snapshot
  }
}

struct NormalizedWindowAnchor: Codable, Equatable, Sendable {
  var x: Double
  var y: Double

  static let defaultValue = NormalizedWindowAnchor(x: 0.96, y: 0.08)

  func clamped() -> NormalizedWindowAnchor {
    NormalizedWindowAnchor(
      x: min(max(x, 0), 1),
      y: min(max(y, 0), 1)
    )
  }

  func origin(windowSize: CGSize, visibleFrame: CGRect) -> CGPoint {
    let value = clamped()
    let width = max(visibleFrame.width - windowSize.width, 0)
    let height = max(visibleFrame.height - windowSize.height, 0)
    return CGPoint(
      x: visibleFrame.minX + width * value.x,
      y: visibleFrame.minY + height * value.y
    )
  }

  static func derive(origin: CGPoint, windowSize: CGSize, visibleFrame: CGRect) -> Self {
    let width = max(visibleFrame.width - windowSize.width, 1)
    let height = max(visibleFrame.height - windowSize.height, 1)
    return NormalizedWindowAnchor(
      x: (origin.x - visibleFrame.minX) / width,
      y: (origin.y - visibleFrame.minY) / height
    ).clamped()
  }
}
