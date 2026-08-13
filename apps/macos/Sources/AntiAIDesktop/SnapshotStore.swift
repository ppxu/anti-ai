import Foundation

enum DesktopSnapshotLoadResult: Equatable, Sendable {
  case ready(DesktopSnapshot)
  case stale(DesktopSnapshot)
  case missing
  case incompatible(Int)
  case invalid
}

actor SnapshotStore {
  private let fileManager: FileManager
  private let validator: DesktopSnapshotValidator

  init(
    fileManager: FileManager = .default,
    validator: DesktopSnapshotValidator = DesktopSnapshotValidator()
  ) {
    self.fileManager = fileManager
    self.validator = validator
  }

  static func defaultURL(homeDirectory: URL = FileManager.default.homeDirectoryForCurrentUser)
    -> URL
  {
    homeDirectory
      .appendingPathComponent(".anti-ai", isDirectory: true)
      .appendingPathComponent("desktop", isDirectory: true)
      .appendingPathComponent("snapshot-v1.json", isDirectory: false)
  }

  func load(from url: URL) throws -> DesktopSnapshot {
    let data = try Data(contentsOf: url, options: [.mappedIfSafe])
    if let envelope = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let version = envelope["version"] as? Int,
      version != 1
    {
      throw DesktopSnapshotError.incompatibleVersion(version)
    }
    let snapshot = try JSONDecoder().decode(DesktopSnapshot.self, from: data)
    return try validator.validate(snapshot)
  }

  func loadResult(from url: URL) -> DesktopSnapshotLoadResult {
    guard fileManager.fileExists(atPath: url.path) else {
      return .missing
    }
    do {
      let snapshot = try load(from: url)
      return DesktopSnapshotFreshness.isStale(snapshot) ? .stale(snapshot) : .ready(snapshot)
    } catch DesktopSnapshotError.incompatibleVersion(let version) {
      return .incompatible(version)
    } catch {
      return .invalid
    }
  }
}

enum DesktopSnapshotFreshness {
  static let maximumAge: TimeInterval = 36 * 60 * 60

  static func isStale(
    _ snapshot: DesktopSnapshot,
    now: Date = Date(),
    calendar: Calendar = .current
  ) -> Bool {
    let components = calendar.dateComponents([.year, .month, .day], from: now)
    guard let year = components.year, let month = components.month, let day = components.day else {
      return true
    }
    let currentDate = String(format: "%04d-%02d-%02d", year, month, day)
    guard snapshot.date == currentDate else { return true }

    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    guard let generatedAt = formatter.date(from: snapshot.generatedAt) else { return true }
    let age = now.timeIntervalSince(generatedAt)
    return age < -5 * 60 || age > maximumAge
  }
}
