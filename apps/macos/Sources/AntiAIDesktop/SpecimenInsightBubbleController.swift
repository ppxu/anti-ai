import AppKit

@MainActor
final class NonActivatingInsightPanel: NSPanel {
  override var canBecomeKey: Bool { false }
  override var canBecomeMain: Bool { false }
}

@MainActor
final class SpecimenInsightBubbleController {
  private static let panelWidth: CGFloat = 270
  private static let panelHeight: CGFloat = 124
  private static let spacing: CGFloat = 10

  private let panel: NonActivatingInsightPanel
  private var dismissWorkItem: DispatchWorkItem?

  init() {
    panel = NonActivatingInsightPanel(
      contentRect: CGRect(x: 0, y: 0, width: Self.panelWidth, height: Self.panelHeight),
      styleMask: [.borderless, .nonactivatingPanel],
      backing: .buffered,
      defer: false
    )
    panel.isOpaque = false
    panel.backgroundColor = .clear
    panel.hasShadow = true
    panel.level = .floating
    panel.hidesOnDeactivate = false
    panel.ignoresMouseEvents = true
    panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]
    panel.animationBehavior = .none
  }

  var window: NSWindow { panel }
  var isVisible: Bool { panel.isVisible }

  func show(_ insight: DesktopInsight, relativeTo specimenWindow: NSWindow) {
    dismissWorkItem?.cancel()
    panel.contentView = makeContentView(for: insight)
    panel.setFrameOrigin(origin(relativeTo: specimenWindow))
    panel.orderFrontRegardless()

    let workItem = DispatchWorkItem { [weak self] in self?.dismiss() }
    dismissWorkItem = workItem
    DispatchQueue.main.asyncAfter(deadline: .now() + 4.5, execute: workItem)
  }

  func dismiss() {
    dismissWorkItem?.cancel()
    dismissWorkItem = nil
    panel.orderOut(nil)
  }

  private func makeContentView(for insight: DesktopInsight) -> NSView {
    let effect = NSVisualEffectView()
    effect.material = .hudWindow
    effect.blendingMode = .behindWindow
    effect.state = .active
    effect.wantsLayer = true
    effect.layer?.cornerRadius = 12
    effect.layer?.masksToBounds = true

    let stack = NSStackView()
    stack.orientation = .vertical
    stack.alignment = .leading
    stack.spacing = 5
    stack.translatesAutoresizingMaskIntoConstraints = false

    let title = label(insight.title, size: 13, weight: .semibold, color: .labelColor)
    stack.addArrangedSubview(title)
    stack.addArrangedSubview(
      label(insight.statusLine, size: 12, weight: .medium, color: .secondaryLabelColor)
    )
    if let diagnosis = insight.diagnosisLine {
      stack.addArrangedSubview(
        label(diagnosis, size: 11, weight: .regular, color: .secondaryLabelColor)
      )
    }
    if let action = insight.actionLine {
      stack.addArrangedSubview(
        label("↗ \(action)", size: 11, weight: .medium, color: .systemGreen)
      )
    }

    effect.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.leadingAnchor.constraint(equalTo: effect.leadingAnchor, constant: 14),
      stack.trailingAnchor.constraint(lessThanOrEqualTo: effect.trailingAnchor, constant: -14),
      stack.centerYAnchor.constraint(equalTo: effect.centerYAnchor),
    ])
    return effect
  }

  private func label(
    _ text: String,
    size: CGFloat,
    weight: NSFont.Weight,
    color: NSColor
  ) -> NSTextField {
    let field = NSTextField(labelWithString: text)
    field.font = .systemFont(ofSize: size, weight: weight)
    field.textColor = color
    field.lineBreakMode = .byTruncatingTail
    field.maximumNumberOfLines = 1
    field.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
    return field
  }

  private func origin(relativeTo specimenWindow: NSWindow) -> CGPoint {
    let specimenFrame = specimenWindow.frame
    let visibleFrame =
      (specimenWindow.screen ?? NSScreen.main)?.visibleFrame
      ?? CGRect(x: 0, y: 0, width: Self.panelWidth, height: Self.panelHeight)
    var x = specimenFrame.maxX + Self.spacing
    if x + Self.panelWidth > visibleFrame.maxX {
      x = specimenFrame.minX - Self.panelWidth - Self.spacing
    }
    x = min(max(x, visibleFrame.minX), visibleFrame.maxX - Self.panelWidth)
    let centeredY = specimenFrame.midY - Self.panelHeight / 2
    let y = min(
      max(centeredY, visibleFrame.minY),
      visibleFrame.maxY - Self.panelHeight
    )
    return CGPoint(x: x, y: y)
  }
}
