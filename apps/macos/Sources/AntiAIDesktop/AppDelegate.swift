import AppKit
import Foundation

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
  private let snapshotStore = SnapshotStore()
  private let snapshotURL = SnapshotStore.defaultURL()
  private let bridgeRunner = DesktopBridgeRunner()
  private let terminalLauncher = DesktopTerminalLauncher()
  private let fullScreenDetector = FullScreenDetector()
  private let languageStore = DesktopLanguageStore()
  private var updateController: DesktopUpdateController?
  private var panelController: SpecimenPanelController?
  private var statusMenuController: StatusMenuController?
  private var workspaceObservers: [NSObjectProtocol] = []

  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.accessory)

    let panelController = SpecimenPanelController()
    self.panelController = panelController
    panelController.show()
    updateController = DesktopUpdateController()

    statusMenuController = StatusMenuController(
      specimenId: DesktopSnapshot.prototype.creature.specimenId,
      positionLocked: panelController.isPositionLocked,
      language: languageStore.load(),
      onToggleVisibility: { [weak panelController] in panelController?.toggleVisibility() },
      onTogglePositionLock: {
        [weak panelController] in panelController?.togglePositionLock() ?? false
      },
      onResetPosition: { [weak panelController] in panelController?.resetPosition() },
      onRefreshSnapshot: { [weak self] in self?.refreshSnapshot() },
      onOpenTUI: { [weak self] in self?.openTUI() },
      onLanguage: { [weak self] language in self?.languageStore.save(language) },
      onState: { [weak panelController] state in panelController?.scene.displayState = state },
      onMotion: { [weak panelController] level in panelController?.scene.motionLevel = level },
      onQuit: { NSApp.terminate(nil) },
      updatesConfigured: updateController != nil,
      automaticallyChecksForUpdates: updateController?.automaticallyChecksForUpdates ?? false,
      onCanCheckForUpdates: { [weak self] in
        self?.updateController?.canCheckForUpdates ?? false
      },
      onCheckForUpdates: { [weak self] in self?.updateController?.checkForUpdates() },
      onToggleAutomaticUpdates: { [weak self] in
        self?.updateController?.toggleAutomaticChecks() ?? false
      }
    )

    observeWorkspace()
    updateFullScreenVisibility()
    loadSnapshot()
  }

  func applicationWillTerminate(_ notification: Notification) {
    for observer in workspaceObservers {
      NotificationCenter.default.removeObserver(observer)
      NSWorkspace.shared.notificationCenter.removeObserver(observer)
    }
  }

  private func loadSnapshot() {
    Task { [weak self] in
      guard let self else { return }
      let result = await snapshotStore.loadResult(from: snapshotURL)
      await MainActor.run {
        self.apply(result)
      }
    }
  }

  private func apply(_ result: DesktopSnapshotLoadResult) {
    switch result {
    case .ready(let snapshot):
      statusMenuController?.update(snapshot: snapshot)
      panelController?.scene.apply(snapshot)
    case .stale(let snapshot):
      statusMenuController?.update(snapshot: snapshot)
      statusMenuController?.update(syncState: .stale)
      panelController?.scene.apply(snapshot)
    case .missing:
      let linked = (try? DesktopBridgeStore().load(from: DesktopBridgeStore.defaultURL())) != nil
      statusMenuController?.update(syncState: linked ? .missingSnapshot : .unlinked)
    case .incompatible:
      statusMenuController?.update(syncState: .incompatibleSnapshot)
    case .invalid:
      statusMenuController?.update(syncState: .invalidSnapshot)
    }
  }

  private func refreshSnapshot() {
    statusMenuController?.update(syncState: .refreshing)
    Task { [weak self] in
      guard let self else { return }
      do {
        _ = try await bridgeRunner.run(.refresh)
        let result = await snapshotStore.loadResult(from: snapshotURL)
        await MainActor.run { self.apply(result) }
      } catch {
        await MainActor.run {
          self.statusMenuController?.update(syncState: .failed)
        }
      }
    }
  }

  private func openTUI() {
    do {
      try terminalLauncher.openTUI()
    } catch {
      statusMenuController?.update(syncState: .failed)
    }
  }

  private func observeWorkspace() {
    let workspaceCenter = NSWorkspace.shared.notificationCenter
    workspaceObservers.append(
      workspaceCenter.addObserver(
        forName: NSWorkspace.didActivateApplicationNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        Task { @MainActor in self?.updateFullScreenVisibility() }
      })
    workspaceObservers.append(
      workspaceCenter.addObserver(
        forName: NSWorkspace.activeSpaceDidChangeNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        Task { @MainActor in self?.updateFullScreenVisibility() }
      })
    workspaceObservers.append(
      workspaceCenter.addObserver(
        forName: NSWorkspace.screensDidSleepNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        Task { @MainActor in self?.panelController?.setDisplaySleeping(true) }
      })
    workspaceObservers.append(
      workspaceCenter.addObserver(
        forName: NSWorkspace.screensDidWakeNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        Task { @MainActor in self?.panelController?.setDisplaySleeping(false) }
      })
    workspaceObservers.append(
      NotificationCenter.default.addObserver(
        forName: NSApplication.didChangeScreenParametersNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        Task { @MainActor in self?.panelController?.clampToVisibleScreen() }
      })
    workspaceObservers.append(
      NotificationCenter.default.addObserver(
        forName: NSWorkspace.accessibilityDisplayOptionsDidChangeNotification,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        Task { @MainActor in
          self?.panelController?.scene.reduceMotion =
            NSWorkspace.shared.accessibilityDisplayShouldReduceMotion
        }
      })
  }

  private func updateFullScreenVisibility() {
    panelController?.setFullScreenSuppressed(
      fullScreenDetector.frontmostApplicationUsesFullScreen()
    )
  }
}
