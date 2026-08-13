import Foundation
import Sparkle

struct DesktopUpdateConfiguration: Equatable, Sendable {
  let feedURL: URL
  let publicKey: String

  static func parse(_ info: [String: Any]?) -> DesktopUpdateConfiguration? {
    guard
      let feedValue = info?["SUFeedURL"] as? String,
      let feedURL = URL(string: feedValue),
      feedURL.scheme == "https",
      feedURL.host != nil,
      let publicKey = info?["SUPublicEDKey"] as? String,
      let decodedKey = Data(base64Encoded: publicKey),
      decodedKey.count == 32
    else {
      return nil
    }
    return DesktopUpdateConfiguration(feedURL: feedURL, publicKey: publicKey)
  }
}

final class DesktopUpdateReminderDelegate: NSObject, SPUStandardUserDriverDelegate {
  var supportsGentleScheduledUpdateReminders: Bool { true }

  func standardUserDriverShouldHandleShowingScheduledUpdate(
    _ update: SUAppcastItem,
    andInImmediateFocus immediateFocus: Bool
  ) -> Bool {
    true
  }
}

@MainActor
final class DesktopUpdateController: NSObject {
  private let updaterController: SPUStandardUpdaterController
  private let reminderDelegate: DesktopUpdateReminderDelegate

  init?(configurationBundle bundle: Bundle = .main) {
    guard DesktopUpdateConfiguration.parse(bundle.infoDictionary) != nil else { return nil }
    reminderDelegate = DesktopUpdateReminderDelegate()
    updaterController = SPUStandardUpdaterController(
      startingUpdater: true,
      updaterDelegate: nil,
      userDriverDelegate: reminderDelegate
    )
    super.init()
  }

  var canCheckForUpdates: Bool {
    updaterController.updater.canCheckForUpdates
  }

  var automaticallyChecksForUpdates: Bool {
    updaterController.updater.automaticallyChecksForUpdates
  }

  func checkForUpdates() {
    updaterController.checkForUpdates(nil)
  }

  func toggleAutomaticChecks() -> Bool {
    let enabled = !updaterController.updater.automaticallyChecksForUpdates
    updaterController.updater.automaticallyChecksForUpdates = enabled
    return enabled
  }
}
