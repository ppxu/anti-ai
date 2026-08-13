import CoreGraphics
import Foundation

struct SpecimenPose: Equatable, Hashable, Sendable {
  var bodyOffsetY: CGFloat = 0
  var shoulderOffsetY: CGFloat = 0
  var coreScale: CGFloat = 1
  var eyeScaleY: CGFloat = 1
  var jawSpacingScale: CGFloat = 1
  var limeAlpha: CGFloat = 1
  var cyanAlpha: CGFloat = 1
  var coreGlowAlpha: CGFloat = 0
  var amberCircuitAlpha: CGFloat = 0
  var clarityHaloAlpha: CGFloat = 0
  var ghostCircuitAlpha: CGFloat = 0
  var circuitOffsetX: CGFloat = 0
  var delayedNodeOffsetX: CGFloat = 0
}

struct SpecimenMotionDirector: Sendable {
  static let frameCount = 4

  func pose(
    for state: SpecimenDisplayState,
    frame: Int,
    level: DesktopMotionLevel,
    reduceMotion: Bool
  ) -> SpecimenPose {
    let effectiveLevel = level.constrained(reduceMotion: reduceMotion)
    guard effectiveLevel != .off else { return SpecimenPose() }
    let index = min(max(frame, 0), Self.frameCount - 1)

    if effectiveLevel == .low {
      return lowMotionPose(for: state, frame: index)
    }
    return fullMotionPose(for: state, frame: index)
  }

  private func lowMotionPose(for state: SpecimenDisplayState, frame: Int) -> SpecimenPose {
    let active = frame >= 2
    switch state {
    case .idle:
      return active ? SpecimenPose(coreScale: 1.02, eyeScaleY: 0.18) : SpecimenPose()
    case .overload:
      return active
        ? SpecimenPose(coreScale: 1.04, coreGlowAlpha: 0.35, amberCircuitAlpha: 0.25)
        : SpecimenPose()
    case .clarity:
      return active
        ? SpecimenPose(eyeScaleY: 0.2, limeAlpha: 0.78, clarityHaloAlpha: 0.45)
        : SpecimenPose()
    case .anomaly:
      return active
        ? SpecimenPose(ghostCircuitAlpha: 0.28, delayedNodeOffsetX: 2)
        : SpecimenPose()
    }
  }

  private func fullMotionPose(for state: SpecimenDisplayState, frame: Int) -> SpecimenPose {
    switch state {
    case .idle:
      return [
        SpecimenPose(),
        SpecimenPose(shoulderOffsetY: 1, coreScale: 1.03),
        SpecimenPose(coreScale: 1.01, eyeScaleY: 0.14),
        SpecimenPose(bodyOffsetY: -1),
      ][frame]
    case .overload:
      return [
        SpecimenPose(),
        SpecimenPose(coreScale: 1.08, jawSpacingScale: 1.15, coreGlowAlpha: 0.55),
        SpecimenPose(
          shoulderOffsetY: 3,
          coreScale: 1.08,
          eyeScaleY: 1.08,
          coreGlowAlpha: 0.8,
          amberCircuitAlpha: 0.72
        ),
        SpecimenPose(coreScale: 1.03, coreGlowAlpha: 0.2, amberCircuitAlpha: 0.18),
      ][frame]
    case .clarity:
      return [
        SpecimenPose(),
        SpecimenPose(limeAlpha: 0.8),
        SpecimenPose(
          shoulderOffsetY: -2,
          eyeScaleY: 0.14,
          jawSpacingScale: 0.82,
          limeAlpha: 0.74
        ),
        SpecimenPose(limeAlpha: 0.88, clarityHaloAlpha: 0.8),
      ][frame]
    case .anomaly:
      return [
        SpecimenPose(),
        SpecimenPose(circuitOffsetX: 2, delayedNodeOffsetX: 2),
        SpecimenPose(
          ghostCircuitAlpha: 0.62,
          circuitOffsetX: -2,
          delayedNodeOffsetX: 3
        ),
        SpecimenPose(ghostCircuitAlpha: 0.12, delayedNodeOffsetX: 2),
      ][frame]
    }
  }
}
