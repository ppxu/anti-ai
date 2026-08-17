import CoreGraphics

enum SpecimenPointerOutcome: Equatable {
  case singleClick
  case doubleClick
  case drag
  case none
}

struct SpecimenPointerInteraction {
  private static let dragThreshold: CGFloat = 4

  private var startLocation: CGPoint?
  private var startWindowOrigin: CGPoint?
  private var didDrag = false

  mutating func begin(at location: CGPoint, windowOrigin: CGPoint) {
    startLocation = location
    startWindowOrigin = windowOrigin
    didDrag = false
  }

  mutating func drag(to location: CGPoint) -> CGPoint? {
    guard let startLocation, let startWindowOrigin else { return nil }
    let delta = CGPoint(x: location.x - startLocation.x, y: location.y - startLocation.y)
    if !didDrag {
      didDrag = hypot(delta.x, delta.y) >= Self.dragThreshold
    }
    guard didDrag else { return nil }
    return CGPoint(x: startWindowOrigin.x + delta.x, y: startWindowOrigin.y + delta.y)
  }

  mutating func end(clickCount: Int) -> SpecimenPointerOutcome {
    guard startLocation != nil else { return .none }
    defer {
      startLocation = nil
      startWindowOrigin = nil
      didDrag = false
    }
    if didDrag { return .drag }
    return clickCount >= 2 ? .doubleClick : .singleClick
  }
}
