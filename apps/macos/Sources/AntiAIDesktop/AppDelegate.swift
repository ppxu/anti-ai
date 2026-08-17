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
  private var currentSnapshot: DesktopSnapshot?
  private var currentSyncState: DesktopSyncState = .missingSnapshot
  private var currentLanguage: DesktopLanguage = .zh

  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.accessory)

    currentLanguage = languageStore.load()
    let panelController = SpecimenPanelController(
      onOpenTUI: { [weak self] area in self?.openTUI(area: area) }
    )
    self.panelController = panelController
    panelController.show()
    updateController = DesktopUpdateController()

    statusMenuController = StatusMenuController(
      specimenId: DesktopSnapshot.prototype.creature.specimenId,
      positionLocked: panelController.isPositionLocked,
      language: currentLanguage,
      onToggleVisibility: { [weak panelController] in panelController?.toggleVisibility() },
      onTogglePositionLock: {
        [weak panelController] in panelController?.togglePositionLock() ?? false
      },
      onResetPosition: { [weak panelController] in panelController?.resetPosition() },
      onRefreshSnapshot: { [weak self] in self?.refreshSnapshot() },
      onOpenTUI: { [weak self] area in self?.openTUI(area: area) },
      onLanguage: { [weak self] language in
        self?.currentLanguage = language
        self?.languageStore.save(language)
        self?.updatePanelInsight()
      },
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
      currentSnapshot = snapshot
      currentSyncState = .ready
      statusMenuController?.update(snapshot: snapshot, syncState: .ready)
      panelController?.scene.apply(snapshot)
    case .stale(let snapshot):
      currentSnapshot = snapshot
      currentSyncState = .stale
      statusMenuController?.update(snapshot: snapshot, syncState: .stale)
      panelController?.scene.apply(snapshot)
    case .missing:
      let linked = (try? DesktopBridgeStore().load(from: DesktopBridgeStore.defaultURL())) != nil
      currentSnapshot = nil
      currentSyncState = linked ? .missingSnapshot : .unlinked
      statusMenuController?.update(snapshot: nil, syncState: currentSyncState)
    case .incompatible:
      currentSnapshot = nil
      currentSyncState = .incompatibleSnapshot
      statusMenuController?.update(snapshot: nil, syncState: .incompatibleSnapshot)
    case .invalid:
      currentSnapshot = nil
      currentSyncState = .invalidSnapshot
      statusMenuController?.update(snapshot: nil, syncState: .invalidSnapshot)
    }
    updatePanelInsight()
  }

  private func refreshSnapshot() {
    currentSyncState = .refreshing
    statusMenuController?.update(syncState: .refreshing)
    updatePanelInsight()
    Task { [weak self] in
      guard let self else { return }
      do {
        _ = try await bridgeRunner.run(.refresh)
        let result = await snapshotStore.loadResult(from: snapshotURL)
        await MainActor.run { self.apply(result) }
      } catch {
        await MainActor.run {
          self.currentSyncState = .failed
          self.statusMenuController?.update(syncState: .failed)
          self.updatePanelInsight()
        }
      }
    }
  }

  private func openTUI(area: TuiArea) {
    do {
      try terminalLauncher.openTUI(area: area)
    } catch {
      currentSyncState = .tuiLaunchFailed
      statusMenuController?.update(syncState: .tuiLaunchFailed)
      updatePanelInsight()
    }
  }

  private func updatePanelInsight() {
    panelController?.update(
      snapshot: currentSnapshot,
      syncState: currentSyncState,
      language: currentLanguage
    )
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
