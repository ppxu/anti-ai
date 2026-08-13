import CoreGraphics
import Foundation

@MainActor
struct WindowPositionStore {
  private let defaults: UserDefaults
  private let key: String
  private let lockKey: String

  init(
    defaults: UserDefaults = .standard,
    key: String = "desktopWindowAnchor",
    lockKey: String = "desktopWindowPositionLocked"
  ) {
    self.defaults = defaults
    self.key = key
    self.lockKey = lockKey
  }

  func load() -> NormalizedWindowAnchor {
    guard
      let data = defaults.data(forKey: key),
      let anchor = try? JSONDecoder().decode(NormalizedWindowAnchor.self, from: data)
    else {
      return .defaultValue
    }
    return anchor.clamped()
  }

  func save(_ anchor: NormalizedWindowAnchor) {
    guard let data = try? JSONEncoder().encode(anchor.clamped()) else { return }
    defaults.set(data, forKey: key)
  }

  func reset() {
    defaults.removeObject(forKey: key)
  }

  func loadPositionLocked() -> Bool {
    defaults.object(forKey: lockKey) as? Bool ?? false
  }

  func savePositionLocked(_ locked: Bool) {
    defaults.set(locked, forKey: lockKey)
  }
}
