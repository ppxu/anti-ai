#!/usr/bin/env swift
import AppKit
import Foundation

guard CommandLine.arguments.count == 2 else {
  FileHandle.standardError.write(Data("Usage: generate-app-icon.swift <output.png>\n".utf8))
  exit(2)
}

let size = NSSize(width: 1024, height: 1024)
let image = NSImage(size: size)
image.lockFocus()

let background = NSBezierPath(
  roundedRect: NSRect(x: 52, y: 52, width: 920, height: 920),
  xRadius: 190,
  yRadius: 190
)
NSColor(calibratedRed: 0.025, green: 0.035, blue: 0.055, alpha: 1).setFill()
background.fill()

let lime = NSColor(calibratedRed: 0.78, green: 1, blue: 0.29, alpha: 1)
let cyan = NSColor(calibratedRed: 0.40, green: 0.96, blue: 0.94, alpha: 1)
let magenta = NSColor(calibratedRed: 0.82, green: 0.17, blue: 0.73, alpha: 1)

func stroke(_ points: [NSPoint], color: NSColor, width: CGFloat) {
  guard let first = points.first else { return }
  let path = NSBezierPath()
  path.move(to: first)
  for point in points.dropFirst() { path.line(to: point) }
  path.lineWidth = width
  path.lineCapStyle = .round
  path.lineJoinStyle = .round
  color.setStroke()
  path.stroke()
}

for centerX in [390.0, 512.0, 634.0] {
  stroke(
    [
      NSPoint(x: centerX - 50, y: 750),
      NSPoint(x: centerX, y: 810),
      NSPoint(x: centerX + 50, y: 750),
    ],
    color: lime,
    width: 32
  )
  let sensor = NSBezierPath(ovalIn: NSRect(x: centerX - 15, y: 732, width: 30, height: 30))
  cyan.setFill()
  sensor.fill()
}

for centerX in [425.0, 599.0] {
  let eye = NSBezierPath(ovalIn: NSRect(x: centerX - 43, y: 620, width: 86, height: 86))
  cyan.setFill()
  eye.fill()
}

for y in [565.0, 525.0, 485.0] {
  stroke([NSPoint(x: 440, y: y), NSPoint(x: 584, y: y)], color: lime, width: 28)
}

let core = NSBezierPath(ovalIn: NSRect(x: 448, y: 330, width: 128, height: 128))
core.lineWidth = 30
cyan.setStroke()
core.stroke()

for side in [-1.0, 1.0] {
  let direction = CGFloat(side)
  stroke(
    [
      NSPoint(x: 512 + 90 * direction, y: 390),
      NSPoint(x: 512 + 160 * direction, y: 390),
      NSPoint(x: 512 + 210 * direction, y: 350),
      NSPoint(x: 512 + 280 * direction, y: 350),
    ],
    color: cyan,
    width: 19
  )
}

for side in [-1.0, 1.0] {
  let direction = CGFloat(side)
  stroke(
    [
      NSPoint(x: 512 + 90 * direction, y: 690),
      NSPoint(x: 512 + 190 * direction, y: 690),
      NSPoint(x: 512 + 300 * direction, y: 620),
    ],
    color: lime,
    width: 34
  )
  stroke(
    [
      NSPoint(x: 512 + 112 * direction, y: 280),
      NSPoint(x: 512 + 126 * direction, y: 150),
      NSPoint(x: 512 + 200 * direction, y: 150),
    ],
    color: lime,
    width: 42
  )
}

for (center, start, end) in [(340.0, 75.0, 250.0), (684.0, -70.0, 105.0)] {
  let binding = NSBezierPath()
  binding.appendArc(
    withCenter: NSPoint(x: center, y: 300),
    radius: 52,
    startAngle: start,
    endAngle: end
  )
  binding.lineWidth = 20
  binding.lineCapStyle = .round
  magenta.setStroke()
  binding.stroke()
}

image.unlockFocus()

guard
  let tiff = image.tiffRepresentation,
  let bitmap = NSBitmapImageRep(data: tiff),
  let png = bitmap.representation(using: .png, properties: [:])
else {
  FileHandle.standardError.write(Data("Unable to render app icon\n".utf8))
  exit(1)
}
try png.write(to: URL(fileURLWithPath: CommandLine.arguments[1]), options: .atomic)
