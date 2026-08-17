import Foundation

struct SpecimenPlaybackController {
  private let motionDirector = SpecimenMotionDirector()
  private(set) var lastFrame = -1
  private var lastUpdateTime: TimeInterval = 0
  private(set) var externallyPaused = false

  mutating func reset() {
    lastFrame = -1
    lastUpdateTime = 0
  }

  mutating func setExternallyPaused(_ paused: Bool) {
    externallyPaused = paused
  }

  mutating func nextFrame(
    at currentTime: TimeInterval,
    level: DesktopMotionLevel,
    reduceMotion: Bool
  ) -> Int? {
    let constrainedLevel = level.constrained(reduceMotion: reduceMotion)
    guard constrainedLevel != .off else { return nil }
    let interval = 1 / max(constrainedLevel.framesPerSecond, 1)
    guard lastUpdateTime == 0 || currentTime - lastUpdateTime >= interval else { return nil }
    lastUpdateTime = currentTime
    return (lastFrame + 1) % SpecimenMotionDirector.frameCount
  }

  mutating func pose(
    for state: SpecimenDisplayState,
    frame: Int,
    level: DesktopMotionLevel,
    reduceMotion: Bool
  ) -> SpecimenPose {
    lastFrame = frame
    return motionDirector.pose(
      for: state,
      frame: frame,
      level: level,
      reduceMotion: reduceMotion
    )
  }
}
