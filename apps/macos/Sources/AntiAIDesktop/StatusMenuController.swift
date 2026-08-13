import AppKit

@MainActor
final class StatusMenuController: NSObject, NSMenuDelegate {
  private let statusItem: NSStatusItem
  let menu = NSMenu()
  private let onToggleVisibility: () -> Void
  private let onTogglePositionLock: () -> Bool
  private let onResetPosition: () -> Void
  private let onRefreshSnapshot: () -> Void
  private let onOpenTUI: () -> Void
  private let onLanguage: (DesktopLanguage) -> Void
  private let onQuit: () -> Void
  private let updatesConfigured: Bool
  private let onCanCheckForUpdates: () -> Bool
  private let onCheckForUpdates: () -> Void
  private let onToggleAutomaticUpdates: () -> Bool
  private let onState: (SpecimenDisplayState) -> Void
  private let onMotion: (DesktopMotionLevel) -> Void
  private var stateItems: [SpecimenDisplayState: NSMenuItem] = [:]
  private var motionItems: [DesktopMotionLevel: NSMenuItem] = [:]
  private var languageItems: [DesktopLanguage: NSMenuItem] = [:]
  private var positionLockItem: NSMenuItem?
  private var checkForUpdatesItem: NSMenuItem?
  private var automaticUpdateChecksItem: NSMenuItem?
  private var currentState: SpecimenDisplayState = .idle
  private var currentMotion: DesktopMotionLevel = .low
  private var currentPositionLocked: Bool
  private var currentLanguage: DesktopLanguage
  private var currentAutomaticUpdateChecks: Bool
  private var specimenId: String
  private var snapshot: DesktopSnapshot?
  private var syncState: DesktopSyncState = .missingSnapshot

  init(
    specimenId: String,
    positionLocked: Bool,
    language: DesktopLanguage,
    onToggleVisibility: @escaping () -> Void,
    onTogglePositionLock: @escaping () -> Bool,
    onResetPosition: @escaping () -> Void,
    onRefreshSnapshot: @escaping () -> Void,
    onOpenTUI: @escaping () -> Void,
    onLanguage: @escaping (DesktopLanguage) -> Void,
    onState: @escaping (SpecimenDisplayState) -> Void,
    onMotion: @escaping (DesktopMotionLevel) -> Void,
    onQuit: @escaping () -> Void,
    updatesConfigured: Bool = false,
    automaticallyChecksForUpdates: Bool = false,
    onCanCheckForUpdates: @escaping () -> Bool = { false },
    onCheckForUpdates: @escaping () -> Void = {},
    onToggleAutomaticUpdates: @escaping () -> Bool = { false }
  ) {
    statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.squareLength)
    self.specimenId = specimenId
    currentPositionLocked = positionLocked
    currentLanguage = language
    self.onToggleVisibility = onToggleVisibility
    self.onTogglePositionLock = onTogglePositionLock
    self.onResetPosition = onResetPosition
    self.onRefreshSnapshot = onRefreshSnapshot
    self.onOpenTUI = onOpenTUI
    self.onLanguage = onLanguage
    self.onState = onState
    self.onMotion = onMotion
    self.onQuit = onQuit
    self.updatesConfigured = updatesConfigured
    currentAutomaticUpdateChecks = automaticallyChecksForUpdates
    self.onCanCheckForUpdates = onCanCheckForUpdates
    self.onCheckForUpdates = onCheckForUpdates
    self.onToggleAutomaticUpdates = onToggleAutomaticUpdates
    super.init()

    statusItem.button?.image = NSImage(
      systemSymbolName: "bolt.horizontal.circle",
      accessibilityDescription: "anti-ai"
    )
    statusItem.menu = menu
    menu.delegate = self
    rebuildMenu()
  }

  func update(specimenId: String, state: SpecimenDisplayState) {
    self.specimenId = specimenId
    currentState = state
    rebuildMenu()
  }

  func update(snapshot: DesktopSnapshot) {
    self.snapshot = snapshot
    specimenId = snapshot.creature.specimenId
    currentState = SpecimenDisplayState(rawValue: snapshot.creature.poseId) ?? .idle
    syncState = .ready
    rebuildMenu()
  }

  func update(syncState: DesktopSyncState) {
    self.syncState = syncState
    rebuildMenu()
  }

  func menuWillOpen(_ menu: NSMenu) {
    for (state, item) in stateItems { item.state = state == currentState ? .on : .off }
    for (level, item) in motionItems { item.state = level == currentMotion ? .on : .off }
    for (language, item) in languageItems {
      item.state = language == currentLanguage ? .on : .off
    }
    positionLockItem?.state = currentPositionLocked ? .on : .off
    checkForUpdatesItem?.isEnabled = updatesConfigured && onCanCheckForUpdates()
    automaticUpdateChecksItem?.state = currentAutomaticUpdateChecks ? .on : .off
  }

  private func rebuildMenu() {
    let copy = DesktopMenuCopy(language: currentLanguage)
    menu.removeAllItems()
    stateItems.removeAll()
    motionItems.removeAll()
    languageItems.removeAll()

    let identity = NSMenuItem(title: "ANTI-AI · \(specimenId)", action: nil, keyEquivalent: "")
    identity.isEnabled = false
    menu.addItem(identity)
    let sync = NSMenuItem(
      title: copy.syncState(syncState),
      action: nil,
      keyEquivalent: ""
    )
    sync.isEnabled = false
    menu.addItem(sync)
    if let snapshot {
      let lastSync = NSMenuItem(
        title: "\(copy.lastSync) · \(snapshot.generatedAt)",
        action: nil,
        keyEquivalent: ""
      )
      lastSync.isEnabled = false
      menu.addItem(lastSync)
      if let title = snapshot.title?.value(for: currentLanguage) {
        let specimenTitle = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        specimenTitle.isEnabled = false
        menu.addItem(specimenTitle)
      }
      if let diagnosis = snapshot.clinic?.label.value(for: currentLanguage) {
        let diagnosisItem = NSMenuItem(
          title: "\(copy.diagnosis) · \(diagnosis)",
          action: nil,
          keyEquivalent: ""
        )
        diagnosisItem.isEnabled = false
        menu.addItem(diagnosisItem)
      }
      if let recommendation = snapshot.recommendation?.label.value(for: currentLanguage) {
        menu.addItem(
          item(
            "\(copy.recommendation) · \(recommendation)…",
            action: #selector(openTUI)
          ))
      }
    }
    menu.addItem(.separator())
    menu.addItem(item(copy.toggleVisibility, action: #selector(toggleVisibility), key: "h"))
    let lockItem = item(copy.lockPosition, action: #selector(togglePositionLock), key: "l")
    lockItem.state = currentPositionLocked ? .on : .off
    positionLockItem = lockItem
    menu.addItem(lockItem)
    menu.addItem(item(copy.resetPosition, action: #selector(resetPosition)))

    let stateMenu = NSMenu(title: copy.displayState)
    for state in SpecimenDisplayState.allCases {
      let entry = NSMenuItem(
        title: copy.state(state),
        action: #selector(selectState(_:)),
        keyEquivalent: ""
      )
      entry.target = self
      entry.representedObject = state.rawValue
      stateMenu.addItem(entry)
      stateItems[state] = entry
    }
    let stateRoot = NSMenuItem(title: copy.displayState, action: nil, keyEquivalent: "")
    stateRoot.submenu = stateMenu
    menu.addItem(stateRoot)

    let motionMenu = NSMenu(title: copy.motion)
    for level in DesktopMotionLevel.allCases {
      let entry = NSMenuItem(
        title: copy.motionLevel(level),
        action: #selector(selectMotion(_:)),
        keyEquivalent: ""
      )
      entry.target = self
      entry.representedObject = level.rawValue
      motionMenu.addItem(entry)
      motionItems[level] = entry
    }
    let motionRoot = NSMenuItem(title: copy.motion, action: nil, keyEquivalent: "")
    motionRoot.submenu = motionMenu
    menu.addItem(motionRoot)

    let languageMenu = NSMenu(title: copy.languageMenu)
    for language in DesktopLanguage.allCases {
      let entry = NSMenuItem(
        title: language.displayName,
        action: #selector(selectLanguage(_:)),
        keyEquivalent: ""
      )
      entry.target = self
      entry.representedObject = language.rawValue
      entry.state = language == currentLanguage ? .on : .off
      languageMenu.addItem(entry)
      languageItems[language] = entry
    }
    let languageRoot = NSMenuItem(title: copy.languageMenu, action: nil, keyEquivalent: "")
    languageRoot.submenu = languageMenu
    menu.addItem(languageRoot)

    menu.addItem(.separator())
    let refresh = item(copy.refreshSnapshot, action: #selector(refreshSnapshot), key: "r")
    refresh.isEnabled = syncState != .refreshing
    menu.addItem(refresh)
    menu.addItem(item(copy.openTUI, action: #selector(openTUI), key: "t"))
    menu.addItem(.separator())
    let checkUpdates = item(copy.checkForUpdates, action: #selector(checkForUpdates))
    checkUpdates.isEnabled = updatesConfigured && onCanCheckForUpdates()
    checkForUpdatesItem = checkUpdates
    menu.addItem(checkUpdates)
    let automaticChecks = item(
      copy.automaticUpdateChecks,
      action: #selector(toggleAutomaticUpdateChecks)
    )
    automaticChecks.isEnabled = updatesConfigured
    automaticChecks.state = currentAutomaticUpdateChecks ? .on : .off
    automaticUpdateChecksItem = automaticChecks
    menu.addItem(automaticChecks)
    menu.addItem(.separator())
    menu.addItem(item(copy.quit, action: #selector(quit), key: "q"))
  }

  private func item(_ title: String, action: Selector, key: String = "") -> NSMenuItem {
    let entry = NSMenuItem(title: title, action: action, keyEquivalent: key)
    entry.target = self
    return entry
  }

  @objc private func toggleVisibility() { onToggleVisibility() }
  @objc private func togglePositionLock() {
    currentPositionLocked = onTogglePositionLock()
    positionLockItem?.state = currentPositionLocked ? .on : .off
  }
  @objc private func resetPosition() { onResetPosition() }
  @objc private func refreshSnapshot() { onRefreshSnapshot() }
  @objc private func openTUI() { onOpenTUI() }
  @objc private func checkForUpdates() { onCheckForUpdates() }
  @objc private func toggleAutomaticUpdateChecks() {
    currentAutomaticUpdateChecks = onToggleAutomaticUpdates()
    automaticUpdateChecksItem?.state = currentAutomaticUpdateChecks ? .on : .off
  }
  @objc private func quit() { onQuit() }

  @objc private func selectState(_ sender: NSMenuItem) {
    guard
      let rawValue = sender.representedObject as? String,
      let state = SpecimenDisplayState(rawValue: rawValue)
    else { return }
    currentState = state
    onState(state)
  }

  @objc private func selectMotion(_ sender: NSMenuItem) {
    guard
      let rawValue = sender.representedObject as? String,
      let level = DesktopMotionLevel(rawValue: rawValue)
    else { return }
    currentMotion = level
    onMotion(level)
  }

  @objc private func selectLanguage(_ sender: NSMenuItem) {
    guard
      let rawValue = sender.representedObject as? String,
      let language = DesktopLanguage(rawValue: rawValue)
    else { return }
    currentLanguage = language
    onLanguage(language)
    rebuildMenu()
  }
}
