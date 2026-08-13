import AppKit
import SpriteKit

@MainActor
final class NonActivatingSpecimenPanel: NSPanel {
  override var canBecomeKey: Bool { false }
  override var canBecomeMain: Bool { false }
}

final class DraggableSpecimenView: SKView {
  override var mouseDownCanMoveWindow: Bool { true }
}

@MainActor
final class SpecimenPanelController: NSWindowController, NSWindowDelegate {
  static let panelSize = CGSize(width: 150, height: 140)
  static let sceneSize = CGSize(width: 300, height: 280)

  let scene: SpecimenScene
  private(set) var isPositionLocked: Bool
  private let positionStore: WindowPositionStore
  private var userWantsVisible = true
  private var fullScreenSuppressed = false
  private var displaySleeping = false

  init(positionStore: WindowPositionStore = WindowPositionStore()) {
    self.positionStore = positionStore
    isPositionLocked = positionStore.loadPositionLocked()
    scene = SpecimenScene(size: Self.sceneSize)

    let panel = NonActivatingSpecimenPanel(
      contentRect: CGRect(origin: .zero, size: Self.panelSize),
      styleMask: [.borderless, .nonactivatingPanel],
      backing: .buffered,
      defer: false
    )
    panel.isOpaque = false
    panel.backgroundColor = .clear
    panel.hasShadow = false
    panel.level = .floating
    panel.hidesOnDeactivate = false
    panel.ignoresMouseEvents = isPositionLocked
    panel.isMovableByWindowBackground = !isPositionLocked
    panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
    panel.animationBehavior = .none

    let spriteView = DraggableSpecimenView(frame: CGRect(origin: .zero, size: Self.panelSize))
    spriteView.allowsTransparency = true
    spriteView.ignoresSiblingOrder = true
    spriteView.presentScene(scene)
    panel.contentView = spriteView

    super.init(window: panel)
    panel.delegate = self
    restoreVisiblePosition()
  }

  @available(*, unavailable)
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  func show() {
    userWantsVisible = true
    guard !fullScreenSuppressed else { return }
    restoreVisiblePosition()
    window?.orderFrontRegardless()
    updateRenderingPause()
  }

  func hide() {
    userWantsVisible = false
    hidePanel()
  }

  private func hidePanel() {
    savePosition()
    window?.orderOut(nil)
    updateRenderingPause()
  }

  func toggleVisibility() {
    if userWantsVisible { hide() } else { show() }
  }

  func setFullScreenSuppressed(_ suppressed: Bool) {
    guard fullScreenSuppressed != suppressed else { return }
    fullScreenSuppressed = suppressed
    if suppressed {
      hidePanel()
    } else if userWantsVisible {
      restoreVisiblePosition()
      window?.orderFrontRegardless()
      updateRenderingPause()
    }
  }

  func setDisplaySleeping(_ sleeping: Bool) {
    displaySleeping = sleeping
    updateRenderingPause()
  }

  @discardableResult
  func togglePositionLock() -> Bool {
    setPositionLocked(!isPositionLocked)
    return isPositionLocked
  }

  func setPositionLocked(_ locked: Bool) {
    guard let panel = window else { return }
    if locked {
      savePosition()
    }
    isPositionLocked = locked
    panel.isMovableByWindowBackground = !locked
    panel.ignoresMouseEvents = locked
    positionStore.savePositionLocked(locked)
  }

  func resetPosition() {
    positionStore.reset()
    restoreVisiblePosition()
  }

  func clampToVisibleScreen() {
    restoreVisiblePosition()
  }

  func windowDidMove(_ notification: Notification) {
    guard !isPositionLocked else { return }
    savePosition()
  }

  func windowDidChangeScreen(_ notification: Notification) {
    restoreVisiblePosition()
  }

  private func restoreVisiblePosition() {
    guard let panel = window, let screen = panel.screen ?? NSScreen.main ?? NSScreen.screens.first
    else {
      return
    }
    let origin = positionStore.load().origin(
      windowSize: panel.frame.size,
      visibleFrame: screen.visibleFrame
    )
    panel.setFrameOrigin(origin)
  }

  private func savePosition() {
    guard let panel = window, let screen = panel.screen ?? NSScreen.main else { return }
    positionStore.save(
      NormalizedWindowAnchor.derive(
        origin: panel.frame.origin,
        windowSize: panel.frame.size,
        visibleFrame: screen.visibleFrame
      ))
  }

  private func updateRenderingPause() {
    scene.setRenderingPaused(
      displaySleeping || fullScreenSuppressed || !userWantsVisible || window?.isVisible != true
    )
  }
}
