import AppKit
import SpriteKit

@MainActor
final class SpecimenScene: SKScene {
  private typealias Palette = SpecimenPalette

  private var playback = SpecimenPlaybackController()
  private let bodyRoot = SKNode()
  private let shoulderRoot = SKNode()
  private let limeGroup = SKNode()
  private let cyanGroup = SKNode()
  private let circuitGroup = SKNode()
  private let amberCircuitGroup = SKNode()
  private let ghostCircuitGroup = SKNode()
  private let ecologyGroup = SKNode()
  private let growthGroup = SKNode()
  private let coreGroup = SKNode()
  private let eyeGroup = SKNode()
  private let jawGroup = SKNode()
  private let clarityHalo = SKShapeNode(circleOfRadius: 23)
  private let coreGlow = SKShapeNode(circleOfRadius: 18)
  private let delayedCircuitNode = SKShapeNode(rectOf: CGSize(width: 4, height: 4), cornerRadius: 1)
  private var jawBasePositions: [CGFloat] = []
  private var snapshot: DesktopSnapshot

  var displayState: SpecimenDisplayState = .idle {
    didSet {
      playback.reset()
      applyCurrentFrame(0)
    }
  }

  var motionLevel: DesktopMotionLevel = .low {
    didSet { configurePlayback() }
  }

  var reduceMotion = NSWorkspace.shared.accessibilityDisplayShouldReduceMotion {
    didSet { configurePlayback() }
  }

  init(size: CGSize, snapshot: DesktopSnapshot = .prototype) {
    self.snapshot = snapshot
    super.init(size: size)
    backgroundColor = .clear
    scaleMode = .aspectFit
    anchorPoint = CGPoint(x: 0.5, y: 0.5)
    buildSpecimen()
    applyCurrentFrame(0)
  }

  @available(*, unavailable)
  required init?(coder aDecoder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  override func didMove(to view: SKView) {
    configurePlayback()
  }

  override func update(_ currentTime: TimeInterval) {
    guard
      let frame = playback.nextFrame(
        at: currentTime,
        level: motionLevel,
        reduceMotion: reduceMotion
      )
    else { return }
    applyCurrentFrame(frame)
  }

  func setRenderingPaused(_ paused: Bool) {
    playback.setExternallyPaused(paused)
    configurePlayback()
  }

  func apply(_ snapshot: DesktopSnapshot) {
    let rebuild = self.snapshot.creature.fingerprint != snapshot.creature.fingerprint
    self.snapshot = snapshot
    displayState = SpecimenDisplayState(rawValue: snapshot.creature.poseId) ?? .idle
    guard rebuild else { return }
    rebuildSpecimen()
    applyCurrentFrame(0)
  }

  private func rebuildSpecimen() {
    removeAllChildren()
    for node in [
      bodyRoot, shoulderRoot, limeGroup, cyanGroup, circuitGroup, amberCircuitGroup,
      ghostCircuitGroup, ecologyGroup, growthGroup, coreGroup, eyeGroup, jawGroup,
    ] {
      node.removeAllChildren()
      node.removeAllActions()
      node.position = .zero
      node.setScale(1)
      node.alpha = 1
    }
    jawBasePositions.removeAll()
    buildSpecimen()
  }

  private func configurePlayback() {
    let level = motionLevel.constrained(reduceMotion: reduceMotion)
    view?.preferredFramesPerSecond = max(Int(level.framesPerSecond), 1)
    view?.isPaused = playback.externallyPaused || level == .off
    if level == .off {
      applyCurrentFrame(0)
    }
  }

  private func applyCurrentFrame(_ frame: Int) {
    let pose = playback.pose(
      for: displayState,
      frame: frame,
      level: motionLevel,
      reduceMotion: reduceMotion
    )
    bodyRoot.position.y = pose.bodyOffsetY
    shoulderRoot.position.y = pose.shoulderOffsetY
    limeGroup.alpha = pose.limeAlpha
    cyanGroup.alpha = pose.cyanAlpha
    for node in eyeGroup.children {
      node.yScale = max(pose.eyeScaleY, 0.08)
    }
    coreGroup.setScale(pose.coreScale)
    coreGlow.alpha = pose.coreGlowAlpha
    clarityHalo.alpha = pose.clarityHaloAlpha
    amberCircuitGroup.alpha = pose.amberCircuitAlpha
    circuitGroup.position.x = pose.circuitOffsetX
    ghostCircuitGroup.alpha = pose.ghostCircuitAlpha
    delayedCircuitNode.position.x = 78 + pose.delayedNodeOffsetX
    for (index, node) in jawGroup.children.enumerated() where index < jawBasePositions.count {
      let center = CGFloat(jawBasePositions.count - 1) / 2
      node.position.y =
        jawBasePositions[index] + (CGFloat(index) - center) * 3 * (pose.jawSpacingScale - 1)
    }
  }

  private func buildSpecimen() {
    addChild(bodyRoot)
    bodyRoot.addChild(limeGroup)
    bodyRoot.addChild(cyanGroup)
    bodyRoot.addChild(ghostCircuitGroup)
    bodyRoot.addChild(ecologyGroup)
    bodyRoot.addChild(growthGroup)
    bodyRoot.position = CGPoint(x: 0, y: 12)
    let stageScales: [CGFloat] = [0.66, 0.82, 1, 1]
    bodyRoot.setScale(stageScales[snapshot.creature.stageIndex])

    buildShoulders()
    buildHead()
    buildChest()
    buildLegs()
  }

  private func buildShoulders() {
    limeGroup.addChild(shoulderRoot)
    let leftSegments: [[CGPoint]] = [
      [CGPoint(x: -42, y: 60), CGPoint(x: -72, y: 60), CGPoint(x: -82, y: 50)],
      [CGPoint(x: -58, y: 42), CGPoint(x: -96, y: 42), CGPoint(x: -110, y: 30)],
      [CGPoint(x: -72, y: 23), CGPoint(x: -120, y: 23), CGPoint(x: -136, y: 8)],
      [CGPoint(x: -58, y: 2), CGPoint(x: -102, y: 2), CGPoint(x: -114, y: -10)],
      [CGPoint(x: -68, y: -18), CGPoint(x: -116, y: -18), CGPoint(x: -132, y: -31)],
      [CGPoint(x: -87, y: -39), CGPoint(x: -122, y: -39), CGPoint(x: -134, y: -50)],
    ]
    let segmentCount = [2, 4, 6, 6][snapshot.creature.stageIndex]
    for points in leftSegments.prefix(segmentCount) {
      shoulderRoot.addChild(stroke(points: points, color: Palette.lime, width: 7))
      shoulderRoot.addChild(
        stroke(
          points: points.map { CGPoint(x: -$0.x, y: $0.y) },
          color: Palette.lime,
          width: 7
        ))
    }

    guard snapshot.creature.stageIndex >= 1 else { return }
    for side in [-1.0, 1.0] {
      let grid = SKNode()
      grid.position = CGPoint(x: 69 * side, y: 28)
      for row in 0..<3 {
        for column in 0..<4 {
          let square = SKShapeNode(rectOf: CGSize(width: 6, height: 6), cornerRadius: 1.5)
          square.fillColor = Palette.lime
          square.strokeColor = .clear
          square.position = CGPoint(
            x: (CGFloat(column) - 1.5) * 8,
            y: (CGFloat(row) - 1) * 8
          )
          grid.addChild(square)
        }
      }
      shoulderRoot.addChild(grid)
    }
  }

  private func buildHead() {
    let headPath = CGMutablePath()
    headPath.move(to: CGPoint(x: -43, y: 78))
    headPath.addLine(to: CGPoint(x: -54, y: 65))
    headPath.addLine(to: CGPoint(x: -42, y: 53))
    headPath.move(to: CGPoint(x: 43, y: 78))
    headPath.addLine(to: CGPoint(x: 54, y: 65))
    headPath.addLine(to: CGPoint(x: 42, y: 53))
    limeGroup.addChild(shape(path: headPath, color: Palette.lime, width: 7))

    buildPathologyCrest()
    buildGeneEyes()
    cyanGroup.addChild(eyeGroup)

    let mouthIndex = geneIndex(snapshot.creature.mouthId)
    let barCount = [2, 3, 1, 3, 4, 1, 2, 2][mouthIndex]
    let spacing = [10, 9, 0, 8, 6, 0, 11, 7][mouthIndex]
    jawBasePositions = []
    for index in 0..<barCount {
      let step: Int = barCount - 1 - index
      let offset: CGFloat = CGFloat(step * spacing)
      jawBasePositions.append(CGFloat(33) + offset)
    }
    for y in jawBasePositions {
      let bar = stroke(
        points: [CGPoint(x: -19, y: y), CGPoint(x: 19, y: y)],
        color: Palette.lime,
        width: mouthIndex == 5 ? 3 : mouthIndex == 2 ? 10 : 6
      )
      jawGroup.addChild(bar)
    }
    limeGroup.addChild(jawGroup)
  }

  private func buildPathologyCrest() {
    switch snapshot.creature.pathologyId {
    case "cache":
      for x in stride(from: CGFloat(-30), through: CGFloat(30), by: CGFloat(12)) {
        let block = SKShapeNode(rectOf: CGSize(width: 8, height: 12), cornerRadius: 1)
        block.fillColor = Palette.lime
        block.strokeColor = .clear
        block.position = CGPoint(
          x: x,
          y: 94 + ((Int(x) / 12).isMultiple(of: 2) ? 0 : 4)
        )
        limeGroup.addChild(block)
      }
    case "context":
      for side in [-1.0, 1.0] {
        limeGroup.addChild(
          stroke(
            points: [
              CGPoint(x: 8 * side, y: 91),
              CGPoint(x: 25 * side, y: 108),
              CGPoint(x: 42 * side, y: 91),
            ],
            color: Palette.lime,
            width: 7
          ))
      }
    case "nuclear":
      for x in [-36.0, -12.0, 12.0, 36.0] {
        limeGroup.addChild(
          stroke(
            points: [CGPoint(x: x - 8, y: 91), CGPoint(x: x, y: 108), CGPoint(x: x + 8, y: 91)],
            color: Palette.lime,
            width: 6
          ))
      }
    default:
      let crownCenters: [CGFloat] = [-30, 0, 30]
      for x in crownCenters {
        limeGroup.addChild(
          stroke(
            points: [
              CGPoint(x: x - 12, y: 91),
              CGPoint(x: x, y: 104),
              CGPoint(x: x + 12, y: 91),
            ],
            color: Palette.lime,
            width: 7
          ))
        let sensor = circle(radius: 4.5, color: Palette.cyan, filled: true)
        sensor.position = CGPoint(x: x, y: 91)
        eyeGroup.addChild(sensor)
      }
    }
  }

  private func buildGeneEyes() {
    let index = geneIndex(snapshot.creature.eyesId)
    let positions: [CGFloat] = [5, 6].contains(index) ? [-25, 0, 25] : [-23, 23]
    for x in positions {
      let eye: SKShapeNode
      if index == 2 {
        let diamond = CGMutablePath()
        diamond.move(to: CGPoint(x: 0, y: 11))
        diamond.addLine(to: CGPoint(x: 11, y: 0))
        diamond.addLine(to: CGPoint(x: 0, y: -11))
        diamond.addLine(to: CGPoint(x: -11, y: 0))
        diamond.closeSubpath()
        eye = shape(path: diamond, color: Palette.cyan, width: 5)
      } else if index == 7 {
        eye = SKShapeNode(rectOf: CGSize(width: 18, height: 18), cornerRadius: 2)
        eye.strokeColor = Palette.cyan
        eye.fillColor = .clear
        eye.lineWidth = 5
      } else {
        eye = circle(
          radius: positions.count == 3 ? 8 : 11,
          color: Palette.cyan,
          filled: ![0, 5].contains(index),
          width: 5
        )
      }
      eye.position = CGPoint(x: x, y: 65)
      eyeGroup.addChild(eye)
    }
  }

  private func buildChest() {
    coreGroup.position = CGPoint(x: 0, y: 2)
    let coreIndex = geneIndex(snapshot.creature.coreId, count: 6)
    let core: SKShapeNode
    if [2, 3].contains(coreIndex) {
      core = SKShapeNode(
        rectOf: CGSize(width: coreIndex == 2 ? 24 : 27, height: coreIndex == 2 ? 24 : 27),
        cornerRadius: coreIndex == 2 ? 2 : 7
      )
      core.fillColor = .clear
      core.strokeColor = Palette.cyan
      core.lineWidth = 7
      core.zRotation = coreIndex == 3 ? .pi / 4 : 0
    } else {
      core = circle(
        radius: coreIndex == 4 ? 11 : 14,
        color: Palette.cyan,
        filled: coreIndex == 5,
        width: 7
      )
    }
    coreGroup.addChild(core)
    coreGlow.fillColor = .clear
    coreGlow.strokeColor = Palette.cyan
    coreGlow.lineWidth = 8
    coreGlow.glowWidth = 12
    coreGlow.alpha = 0
    coreGroup.addChild(coreGlow)
    clarityHalo.fillColor = .clear
    clarityHalo.strokeColor = Palette.cyan
    clarityHalo.lineWidth = 2
    clarityHalo.glowWidth = 6
    clarityHalo.alpha = 0
    coreGroup.addChild(clarityHalo)
    cyanGroup.addChild(coreGroup)

    let leftCircuit = [
      CGPoint(x: -8, y: -14), CGPoint(x: -26, y: -14), CGPoint(x: -36, y: -24),
      CGPoint(x: -52, y: -24), CGPoint(x: -62, y: -17), CGPoint(x: -76, y: -17),
    ]
    circuitGroup.addChild(stroke(points: leftCircuit, color: Palette.cyan, width: 4))
    circuitGroup.addChild(
      stroke(
        points: leftCircuit.map { CGPoint(x: -$0.x, y: $0.y) },
        color: Palette.cyan,
        width: 4
      ))
    let lowerLeft = leftCircuit.map { CGPoint(x: $0.x - 2, y: $0.y - 7) }
    circuitGroup.addChild(stroke(points: lowerLeft, color: Palette.cyan, width: 3))
    circuitGroup.addChild(
      stroke(
        points: lowerLeft.map { CGPoint(x: -$0.x, y: $0.y) },
        color: Palette.cyan,
        width: 3
      ))
    cyanGroup.addChild(circuitGroup)

    for node in circuitGroup.children {
      if let source = node as? SKShapeNode {
        let duplicate = SKShapeNode(path: source.path ?? CGMutablePath())
        duplicate.strokeColor = Palette.amber
        duplicate.lineWidth = source.lineWidth
        duplicate.lineCap = .round
        duplicate.lineJoin = .round
        amberCircuitGroup.addChild(duplicate)
        let ghost = SKShapeNode(path: source.path ?? CGMutablePath())
        ghost.strokeColor = Palette.magenta
        ghost.lineWidth = max(source.lineWidth - 1, 1)
        ghost.lineCap = .round
        ghost.lineJoin = .round
        ghost.position = CGPoint(x: -4, y: -2)
        ghostCircuitGroup.addChild(ghost)
      }
    }
    amberCircuitGroup.alpha = 0
    ghostCircuitGroup.alpha = 0
    cyanGroup.addChild(amberCircuitGroup)

    delayedCircuitNode.fillColor = Palette.cyan
    delayedCircuitNode.strokeColor = .clear
    delayedCircuitNode.position = CGPoint(x: 78, y: -17)
    circuitGroup.addChild(delayedCircuitNode)

    buildEcologyMarks()

    let bodyIndex = geneIndex(snapshot.creature.bodyId, count: 6)
    let bodyScales: [CGFloat] = [0.82, 0.92, 0.76, 1.12, 1, 1.06]
    let bodyScale = bodyScales[bodyIndex]
    for (x, y, width, height) in [
      (-40.0, -48.0, 30.0, 27.0), (40.0, -48.0, 30.0, 27.0),
      (0.0, -39.0, 34.0, 20.0), (0.0, -65.0, 27.0, 20.0),
    ] {
      let plate = SKShapeNode(
        rectOf: CGSize(width: width * bodyScale, height: height),
        cornerRadius: bodyIndex == 3 ? 2 : bodyIndex == 5 ? 10 : 6
      )
      plate.fillColor = Palette.lime
      plate.strokeColor = .clear
      plate.position = CGPoint(x: x, y: y)
      limeGroup.addChild(plate)
    }
    buildGrowthMarks()
  }

  private func buildEcologyMarks() {
    switch snapshot.creature.ecologyId {
    case "paradox":
      for side in [-1.0, 1.0] {
        let bindingPath = CGMutablePath()
        bindingPath.addArc(
          center: CGPoint(x: 58 * side, y: -43),
          radius: 13,
          startAngle: side < 0 ? .pi * 0.55 : -.pi * 0.05,
          endAngle: side < 0 ? .pi * 1.1 : .pi * 0.45,
          clockwise: side > 0
        )
        ecologyGroup.addChild(shape(path: bindingPath, color: Palette.magenta, width: 5))
      }
    case "polluted":
      for x in [-67.0, 67.0] {
        ecologyGroup.addChild(
          stroke(
            points: [CGPoint(x: x, y: -28), CGPoint(x: x, y: -47)],
            color: Palette.amber,
            width: 5
          ))
      }
    case "lucid":
      let halo = SKShapeNode(ellipseOf: CGSize(width: 122, height: 74))
      halo.strokeColor = Palette.cyan
      halo.fillColor = .clear
      halo.lineWidth = 2
      halo.alpha = 0.55
      halo.position = CGPoint(x: 0, y: -18)
      ecologyGroup.addChild(halo)
    default:
      break
    }
  }

  private func buildGrowthMarks() {
    if snapshot.creature.chromaticId != nil {
      for angle in stride(from: CGFloat(0), to: CGFloat.pi * 2, by: CGFloat.pi * 2 / 3) {
        let node = circle(radius: 3, color: Palette.magenta, filled: true)
        node.position = CGPoint(x: cos(angle) * 29, y: 2 + sin(angle) * 29)
        growthGroup.addChild(node)
      }
    }
    if snapshot.creature.scarId != nil {
      growthGroup.addChild(
        stroke(
          points: [CGPoint(x: 31, y: -38), CGPoint(x: 41, y: -49), CGPoint(x: 34, y: -61)],
          color: Palette.amber,
          width: 3
        ))
    }
    if snapshot.creature.graftId != nil {
      let graft = SKShapeNode(rectOf: CGSize(width: 26, height: 8), cornerRadius: 3)
      graft.strokeColor = Palette.magenta
      graft.fillColor = .clear
      graft.lineWidth = 3
      graft.position = CGPoint(x: 0, y: -82)
      growthGroup.addChild(graft)
    }
  }

  private func buildLegs() {
    let limbIndex = geneIndex(snapshot.creature.limbsId, count: 6)
    let upperWidths: [CGFloat] = [25, 29, 21, 17, 23, 31]
    let strokeWidths: [CGFloat] = [7, 8, 5, 5, 6, 9]
    for side in [-1.0, 1.0] {
      let upperLeg = SKShapeNode(
        rectOf: CGSize(width: upperWidths[limbIndex], height: 37),
        cornerRadius: limbIndex == 3 ? 2 : 6
      )
      upperLeg.fillColor = Palette.lime
      upperLeg.strokeColor = .clear
      upperLeg.position = CGPoint(x: 54 * side, y: -83)
      upperLeg.zRotation = CGFloat(side) * -0.08
      limeGroup.addChild(upperLeg)

      let lowerLeg = SKShapeNode(
        rectOf: CGSize(width: max(10, upperWidths[limbIndex] * 0.52), height: 25),
        cornerRadius: 2
      )
      lowerLeg.fillColor = Palette.lime
      lowerLeg.strokeColor = .clear
      lowerLeg.position = CGPoint(x: 57 * side, y: -111)
      limeGroup.addChild(lowerLeg)

      limeGroup.addChild(
        stroke(
          points: [
            CGPoint(x: 57 * side, y: -124),
            CGPoint(x: 57 * side, y: -133),
            CGPoint(x: (limbIndex == 2 ? 71 : limbIndex == 5 ? 84 : 77) * side, y: -133),
          ],
          color: Palette.lime,
          width: strokeWidths[limbIndex]
        ))
    }
    guard snapshot.creature.stageIndex >= 3 else { return }
    let tailIndex = geneIndex(snapshot.creature.tailId ?? "tail_01", count: 6)
    let tailY: [CGFloat] = [-46, -54, -37, -49, -42, -58]
    limeGroup.addChild(
      stroke(
        points: [
          CGPoint(x: 92, y: -42),
          CGPoint(x: 116, y: tailY[tailIndex]),
          CGPoint(x: 140, y: tailY[tailIndex] + (tailIndex.isMultiple(of: 2) ? 8 : -3)),
        ],
        color: Palette.lime,
        width: strokeWidths[limbIndex]
      ))
  }

}
