import CoreGraphics
import Foundation

guard CommandLine.arguments.count >= 2, let processId = Int32(CommandLine.arguments[1]) else {
  FileHandle.standardError.write(Data("usage: window-count.swift <pid> [--bounds]\n".utf8))
  exit(2)
}

let windows =
  CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID)
  as? [[String: Any]] ?? []
let ownedWindows = windows.filter {
  ($0[kCGWindowOwnerPID as String] as? Int32) == processId
}

if CommandLine.arguments.dropFirst(2).contains("--bounds") {
  for window in ownedWindows {
    guard
      let bounds = window[kCGWindowBounds as String] as? [String: Any],
      let width = bounds["Width"] as? NSNumber,
      let height = bounds["Height"] as? NSNumber
    else { continue }
    print("\(width.intValue)x\(height.intValue)")
  }
} else {
  print(ownedWindows.count)
}
