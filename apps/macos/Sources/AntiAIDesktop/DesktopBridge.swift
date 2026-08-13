import AppKit
import Foundation

struct DesktopBridgeLink: Codable, Equatable, Sendable {
  let version: Int
  let linkedAt: String?
  let nodePath: String
  let cliEntryPath: String

  init(version: Int, linkedAt: String? = nil, nodePath: String, cliEntryPath: String) {
    self.version = version
    self.linkedAt = linkedAt
    self.nodePath = nodePath
    self.cliEntryPath = cliEntryPath
  }
}

enum DesktopBridgeError: Error, Equatable, LocalizedError {
  case incompatibleVersion(Int)
  case pathMustBeAbsolute
  case missingNode
  case missingCLIEntry
  case actionFailed(Int32)
  case terminalLaunchFailed

  var errorDescription: String? {
    switch self {
    case .incompatibleVersion(let version): "Unsupported desktop bridge version: \(version)"
    case .pathMustBeAbsolute: "Desktop bridge paths must be absolute."
    case .missingNode: "The linked Node executable is unavailable."
    case .missingCLIEntry: "The linked anti-ai CLI is unavailable."
    case .actionFailed(let status): "Desktop bridge action failed with status \(status)."
    case .terminalLaunchFailed: "Unable to open anti-ai TUI in Terminal."
    }
  }
}

enum DesktopBridgeAction: String, CaseIterable, Sendable {
  case refresh
}

struct DesktopBridgeInvocation: Equatable, Sendable {
  let executableURL: URL
  let arguments: [String]
}

struct DesktopBridgeValidator {
  let fileManager: FileManager

  init(fileManager: FileManager = .default) {
    self.fileManager = fileManager
  }

  func validate(_ link: DesktopBridgeLink) throws -> DesktopBridgeLink {
    guard link.version == 1 else {
      throw DesktopBridgeError.incompatibleVersion(link.version)
    }
    guard link.nodePath.hasPrefix("/"), link.cliEntryPath.hasPrefix("/") else {
      throw DesktopBridgeError.pathMustBeAbsolute
    }
    guard fileManager.isExecutableFile(atPath: link.nodePath) else {
      throw DesktopBridgeError.missingNode
    }
    guard fileManager.fileExists(atPath: link.cliEntryPath) else {
      throw DesktopBridgeError.missingCLIEntry
    }
    return link
  }
}

actor DesktopBridgeRunner {
  private let store: DesktopBridgeStore

  init(store: DesktopBridgeStore = DesktopBridgeStore()) {
    self.store = store
  }

  func invocation(for action: DesktopBridgeAction, link: DesktopBridgeLink)
    -> DesktopBridgeInvocation
  {
    DesktopBridgeInvocation(
      executableURL: URL(fileURLWithPath: link.nodePath),
      arguments: [link.cliEntryPath, "desktop", action.rawValue, "--json"]
    )
  }

  func run(
    _ action: DesktopBridgeAction,
    linkURL: URL = DesktopBridgeStore.defaultURL()
  ) async throws -> Data {
    let link = try store.load(from: linkURL)
    let command = invocation(for: action, link: link)
    return try await withCheckedThrowingContinuation { continuation in
      let process = Process()
      let output = Pipe()
      let errors = Pipe()
      process.executableURL = command.executableURL
      process.arguments = command.arguments
      process.standardOutput = output
      process.standardError = errors
      process.terminationHandler = { process in
        if process.terminationStatus == 0 {
          continuation.resume(returning: output.fileHandleForReading.readDataToEndOfFile())
        } else {
          continuation.resume(throwing: DesktopBridgeError.actionFailed(process.terminationStatus))
        }
      }
      do {
        try process.run()
      } catch {
        continuation.resume(throwing: error)
      }
    }
  }
}

struct DesktopTerminalLauncher {
  let fileManager: FileManager
  let workspace: NSWorkspace

  init(fileManager: FileManager = .default, workspace: NSWorkspace = .shared) {
    self.fileManager = fileManager
    self.workspace = workspace
  }

  static func commandURL(
    homeDirectory: URL = FileManager.default.homeDirectoryForCurrentUser
  ) -> URL {
    homeDirectory
      .appendingPathComponent(".anti-ai", isDirectory: true)
      .appendingPathComponent("desktop", isDirectory: true)
      .appendingPathComponent("open-tui.command", isDirectory: false)
  }

  func shellQuote(_ value: String) -> String {
    "'\(value.replacingOccurrences(of: "'", with: "'\\''"))'"
  }

  func prepare(link: DesktopBridgeLink, at url: URL = commandURL()) throws -> URL {
    try fileManager.createDirectory(
      at: url.deletingLastPathComponent(),
      withIntermediateDirectories: true,
      attributes: [.posixPermissions: 0o700]
    )
    let contents = """
      #!/bin/zsh
      exec \(shellQuote(link.nodePath)) \(shellQuote(link.cliEntryPath)) tui
      """
    try Data(contents.utf8).write(to: url, options: .atomic)
    try fileManager.setAttributes([.posixPermissions: 0o700], ofItemAtPath: url.path)
    return url
  }

  func openTUI(
    linkURL: URL = DesktopBridgeStore.defaultURL(),
    commandURL: URL = commandURL()
  ) throws {
    let link = try DesktopBridgeStore().load(from: linkURL)
    guard workspace.open(try prepare(link: link, at: commandURL)) else {
      throw DesktopBridgeError.terminalLaunchFailed
    }
  }
}

struct DesktopBridgeStore {
  static func defaultURL(homeDirectory: URL = FileManager.default.homeDirectoryForCurrentUser)
    -> URL
  {
    homeDirectory
      .appendingPathComponent(".anti-ai", isDirectory: true)
      .appendingPathComponent("desktop", isDirectory: true)
      .appendingPathComponent("link-v1.json", isDirectory: false)
  }

  let validator: DesktopBridgeValidator

  init(validator: DesktopBridgeValidator = DesktopBridgeValidator()) {
    self.validator = validator
  }

  func load(from url: URL) throws -> DesktopBridgeLink {
    let data = try Data(contentsOf: url, options: [.mappedIfSafe])
    return try validator.validate(JSONDecoder().decode(DesktopBridgeLink.self, from: data))
  }
}
