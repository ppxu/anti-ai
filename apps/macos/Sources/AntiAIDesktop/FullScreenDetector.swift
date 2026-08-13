import AppKit
import CoreGraphics

struct FullScreenDetector {
  static func matchesFullScreen(
    windowBounds: [CGRect],
    screenFrames: [CGRect],
    tolerance: CGFloat = 2
  ) -> Bool {
    windowBounds.contains { window in
      screenFrames.contains { screen in
        abs(window.width - screen.width) <= tolerance
          && abs(window.height - screen.height) <= tolerance
      }
    }
  }

  @MainActor
  func frontmostApplicationUsesFullScreen() -> Bool {
    guard
      let application = NSWorkspace.shared.frontmostApplication,
      application.processIdentifier != ProcessInfo.processInfo.processIdentifier,
      let windows = CGWindowListCopyWindowInfo(
        [.optionOnScreenOnly, .excludeDesktopElements],
        kCGNullWindowID
      ) as? [[String: Any]]
    else {
      return false
    }
    let bounds = windows.compactMap { window -> CGRect? in
      guard
        window[kCGWindowOwnerPID as String] as? pid_t == application.processIdentifier,
        window[kCGWindowLayer as String] as? Int == 0,
        let dictionary = window[kCGWindowBounds as String] as? NSDictionary
      else {
        return nil
      }
      return CGRect(dictionaryRepresentation: dictionary)
    }
    return Self.matchesFullScreen(
      windowBounds: bounds,
      screenFrames: NSScreen.screens.map(\.frame)
    )
  }
}
