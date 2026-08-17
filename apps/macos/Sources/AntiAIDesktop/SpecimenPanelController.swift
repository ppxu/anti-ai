import AppKit
import SpriteKit

@MainActor
final class NonActivatingSpecimenPanel: NSPanel {
  override var canBecomeKey: Bool { false }
  override var canBecomeMain: Bool { false }
}

@MainActor
final class DraggableSpecimenView: SKView {
  var onSingleClick: (() -> Void)?
  var onDoubleClick: (() -> Void)?

  private var pointerInteraction = SpecimenPointerInteraction()
  private var pendingSingleClick: DispatchWorkItem?

  override var mouseDownCanMoveWindow: Bool { false }

  override func mouseDown(with event: NSEvent) {
    if event.clickCount >= 2 {
      pendingSingleClick?.cancel()
      pendingSingleClick = nil
    }
    pointerInteraction.begin(
      at: NSEvent.mouseLocation,
      windowOrigin: window?.frame.origin ?? .zero
    )
  }

  override func mouseDragged(with event: NSEvent) {
    guard let origin = pointerInteraction.drag(to: NSEvent.mouseLocation) else { return }
    pendingSingleClick?.cancel()
    pendingSingleClick = nil
    window?.setFrameOrigin(origin)
  }

  override func mouseUp(with event: NSEvent) {
    switch pointerInteraction.end(clickCount: event.clickCount) {
    case .singleClick:
      scheduleSingleClick()
    case .doubleClick:
      pendingSingleClick?.cancel()
      pendingSingleClick = nil
      onDoubleClick?()
    case .drag, .none:
      break
    }
  }

  private func scheduleSingleClick() {
    pendingSingleClick?.cancel()
    let workItem = DispatchWorkItem { [weak self] in
      self?.pendingSingleClick = nil
      self?.onSingleClick?()
    }
    pendingSingleClick = workItem
    DispatchQueue.main.asyncAfter(
      deadline: .now() + NSEvent.doubleClickInterval,
      execute: workItem
    )
  }
}

@MainActor
final class SpecimenPanelController: NSWindowController, NSWindowDelegate {
  static let panelSize = CGSize(width: 150, height: 140)
  static let sceneSize = CGSize(width: 300, height: 280)

  let scene: SpecimenScene
  let spriteView: DraggableSpecimenView
  private(set) var isPositionLocked: Bool
  private let positionStore: WindowPositionStore
  private let insightBubbleController = SpecimenInsightBubbleController()
  private let onOpenTUI: (TuiArea) -> Void
  private var currentInsight = DesktopInsightProjector().project(
    snapshot: nil,
    syncState: .missingSnapshot,
    language: .zh
  )
  private var userWantsVisible = true
  private var fullScreenSuppressed = false
  private var displaySleeping = false

  init(
    positionStore: WindowPositionStore = WindowPositionStore(),
    onOpenTUI: @escaping (TuiArea) -> Void = { _ in }
  ) {
    self.positionStore = positionStore
    self.onOpenTUI = onOpenTUI
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

    spriteView = DraggableSpecimenView(frame: CGRect(origin: .zero, size: Self.panelSize))
    spriteView.allowsTransparency = true
    spriteView.ignoresSiblingOrder = true
    spriteView.presentScene(scene)
    panel.contentView = spriteView

    super.init(window: panel)
    spriteView.onSingleClick = { [weak self] in
      self?.handlePointerOutcome(.singleClick)
    }
    spriteView.onDoubleClick = { [weak self] in
      self?.handlePointerOutcome(.doubleClick)
    }
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
    insightBubbleController.dismiss()
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
      insightBubbleController.dismiss()
      savePosition()
    }
    isPositionLocked = locked
    panel.isMovableByWindowBackground = !locked
    panel.ignoresMouseEvents = locked
    positionStore.savePositionLocked(locked)
  }

  func resetPosition() {
    insightBubbleController.dismiss()
    positionStore.reset()
    restoreVisiblePosition()
  }

  func clampToVisibleScreen() {
    insightBubbleController.dismiss()
    restoreVisiblePosition()
  }

  func update(
    snapshot: DesktopSnapshot?,
    syncState: DesktopSyncState,
    language: DesktopLanguage
  ) {
    currentInsight = DesktopInsightProjector().project(
      snapshot: snapshot,
      syncState: syncState,
      language: language
    )
    if insightBubbleController.isVisible, let window {
      insightBubbleController.show(currentInsight, relativeTo: window)
    }
  }

  func handlePointerOutcome(_ outcome: SpecimenPointerOutcome) {
    switch outcome {
    case .singleClick:
      guard let window else { return }
      insightBubbleController.show(currentInsight, relativeTo: window)
    case .doubleClick:
      insightBubbleController.dismiss()
      onOpenTUI(currentInsight.targetArea)
    case .drag:
      insightBubbleController.dismiss()
    case .none:
      break
    }
  }

  var isInsightVisible: Bool { insightBubbleController.isVisible }
  var insightWindow: NSWindow? { insightBubbleController.window }

  func windowDidMove(_ notification: Notification) {
    insightBubbleController.dismiss()
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
