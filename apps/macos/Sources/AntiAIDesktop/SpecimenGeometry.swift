import AppKit
import SpriteKit

extension SpecimenScene {
  func geneIndex(_ identifier: String, count: Int = 8) -> Int {
    max(0, min(count - 1, (Int(identifier.suffix(2)) ?? 1) - 1))
  }

  func stroke(points: [CGPoint], color: NSColor, width: CGFloat) -> SKShapeNode {
    let path = CGMutablePath()
    guard let first = points.first else { return SKShapeNode() }
    path.move(to: first)
    for point in points.dropFirst() { path.addLine(to: point) }
    return shape(path: path, color: color, width: width)
  }

  func shape(path: CGPath, color: NSColor, width: CGFloat) -> SKShapeNode {
    let node = SKShapeNode(path: path)
    node.strokeColor = color
    node.fillColor = .clear
    node.lineWidth = width
    node.lineCap = .round
    node.lineJoin = .round
    return node
  }

  func circle(
    radius: CGFloat,
    color: NSColor,
    filled: Bool,
    width: CGFloat = 1
  ) -> SKShapeNode {
    let node = SKShapeNode(circleOfRadius: radius)
    node.fillColor = filled ? color : .clear
    node.strokeColor = color
    node.lineWidth = width
    return node
  }
}
