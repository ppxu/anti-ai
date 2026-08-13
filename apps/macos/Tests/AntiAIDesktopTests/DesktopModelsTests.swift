import AppKit
import CoreGraphics
import Foundation
import Testing

@testable import AntiAIDesktop

@MainActor
private func prepareAppKitForTesting() {
  _ = NSApplication.shared
}

@Test func snapshotRejectsUnknownMajorVersion() {
  let snapshot = DesktopSnapshot(
    version: 2,
    generatedAt: DesktopSnapshot.prototype.generatedAt,
    date: DesktopSnapshot.prototype.date,
    language: DesktopSnapshot.prototype.language,
    creature: DesktopSnapshot.prototype.creature,
    privacy: DesktopSnapshot.prototype.privacy
  )

  #expect(throws: DesktopSnapshotError.incompatibleVersion(2)) {
    try DesktopSnapshotValidator().validate(snapshot)
  }
}

@Test func snapshotRejectsUnsafePrivacyFlags() {
  let snapshot = DesktopSnapshot(
    version: 1,
    generatedAt: DesktopSnapshot.prototype.generatedAt,
    date: DesktopSnapshot.prototype.date,
    language: DesktopSnapshot.prototype.language,
    creature: DesktopSnapshot.prototype.creature,
    privacy: DesktopSnapshot.Privacy(
      containsExactTokens: true,
      containsModels: false,
      containsPaths: false,
      containsConversation: false
    )
  )

  #expect(throws: DesktopSnapshotError.unsafePrivacyBoundary) {
    try DesktopSnapshotValidator().validate(snapshot)
  }
}

@Test func prototypeSnapshotPassesValidation() throws {
  let result = try DesktopSnapshotValidator().validate(.prototype)
  #expect(result.creature.specimenId == "140a55f3")
  #expect(result.privacy.isSafe)
}

@Test func snapshotRejectsUnsupportedPose() {
  let prototype = DesktopSnapshot.prototype
  let creature = DesktopSnapshot.Creature(
    specimenId: prototype.creature.specimenId,
    fingerprint: prototype.creature.fingerprint,
    stageIndex: prototype.creature.stageIndex,
    ecologyId: prototype.creature.ecologyId,
    pathologyId: prototype.creature.pathologyId,
    formId: prototype.creature.formId,
    paletteId: prototype.creature.paletteId,
    poseId: "sleep",
    bodyId: prototype.creature.bodyId,
    eyesId: prototype.creature.eyesId,
    mouthId: prototype.creature.mouthId,
    coreId: prototype.creature.coreId,
    limbsId: prototype.creature.limbsId,
    tailId: prototype.creature.tailId,
    chromaticId: prototype.creature.chromaticId,
    scarId: prototype.creature.scarId,
    graftId: prototype.creature.graftId
  )
  let snapshot = DesktopSnapshot(
    version: prototype.version,
    generatedAt: prototype.generatedAt,
    date: prototype.date,
    language: prototype.language,
    creature: creature,
    privacy: prototype.privacy
  )

  #expect(throws: DesktopSnapshotError.unsupportedPose("sleep")) {
    try DesktopSnapshotValidator().validate(snapshot)
  }
}

@Test func fixtureSnapshotDecodesThroughThePublicStoreBoundary() async throws {
  let url = try #require(
    Bundle.module.url(forResource: "valid-snapshot-v1", withExtension: "json")
  )
  let result = try await SnapshotStore().load(from: url)
  #expect(result.version == 1)
  #expect(result.creature.fingerprint == "6ddf1c0d5913")
  #expect(result.title?.value(for: .zh) == "续杯中的请求兽")
  #expect(result.clinic?.diagnosisId == "stable_metabolism")
  #expect(result.privacy.isSafe)
}

@Test func missingSnapshotSurfacesAnExplicitOnboardingState() async {
  let result = await SnapshotStore().loadResult(
    from: URL(fileURLWithPath: "/anti-ai/fixture-does-not-exist.json")
  )
  #expect(result == .missing)
}

@Test func snapshotFreshnessUsesTheNaturalDayAndGenerationTime() {
  let prototype = DesktopSnapshot.prototype
  var calendar = Calendar(identifier: .gregorian)
  calendar.timeZone = try! #require(TimeZone(identifier: "Asia/Shanghai"))
  let now = try! #require(
    ISO8601DateFormatter().date(from: "2026-08-13T04:00:00Z")
  )
  let fresh = DesktopSnapshot(
    version: prototype.version,
    generatedAt: "2026-08-13T03:59:00.000Z",
    date: "2026-08-13",
    language: prototype.language,
    creature: prototype.creature,
    privacy: prototype.privacy
  )
  let previousDay = DesktopSnapshot(
    version: prototype.version,
    generatedAt: "2026-08-12T03:59:00.000Z",
    date: "2026-08-12",
    language: prototype.language,
    creature: prototype.creature,
    privacy: prototype.privacy
  )

  #expect(!DesktopSnapshotFreshness.isStale(fresh, now: now, calendar: calendar))
  #expect(DesktopSnapshotFreshness.isStale(previousDay, now: now, calendar: calendar))
}

@Test func futureSnapshotVersionFailsBeforeDecodingItsUnknownShape() async throws {
  let directory = FileManager.default.temporaryDirectory
    .appendingPathComponent("anti-ai-snapshot-\(UUID().uuidString)", isDirectory: true)
  try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
  defer { try? FileManager.default.removeItem(at: directory) }
  let url = directory.appendingPathComponent("snapshot-v1.json")
  try Data(#"{"version":2,"future":"shape"}"#.utf8).write(to: url)

  let result = await SnapshotStore().loadResult(from: url)
  #expect(result == .incompatible(2))
}

@Test func normalizedAnchorClampsAndResolvesInsideVisibleFrame() {
  let anchor = NormalizedWindowAnchor(x: 1.7, y: -0.5)
  let visibleFrame = CGRect(x: 100, y: 80, width: 1_000, height: 700)
  let origin = anchor.origin(
    windowSize: CGSize(width: 220, height: 180),
    visibleFrame: visibleFrame
  )

  #expect(origin.x == 880)
  #expect(origin.y == 80)
}

@Test func normalizedAnchorRoundTripsWindowPosition() {
  let visibleFrame = CGRect(x: -900, y: 40, width: 900, height: 700)
  let windowSize = CGSize(width: 220, height: 180)
  let anchor = NormalizedWindowAnchor(x: 0.25, y: 0.75)
  let origin = anchor.origin(windowSize: windowSize, visibleFrame: visibleFrame)
  let recovered = NormalizedWindowAnchor.derive(
    origin: origin,
    windowSize: windowSize,
    visibleFrame: visibleFrame
  )

  #expect(abs(recovered.x - anchor.x) < 0.000_001)
  #expect(abs(recovered.y - anchor.y) < 0.000_001)
}

@Test func reducedMotionNeverLeavesFullModeEnabled() {
  #expect(DesktopMotionLevel.full.constrained(reduceMotion: true) == .low)
  #expect(DesktopMotionLevel.off.constrained(reduceMotion: true) == .off)
}

@Test func motionDirectorKeepsOffModeStaticForEveryState() {
  let director = SpecimenMotionDirector()
  for state in SpecimenDisplayState.allCases {
    #expect(director.pose(for: state, frame: 3, level: .off, reduceMotion: false) == SpecimenPose())
  }
}

@Test func fullMotionStatesHaveDistinctPeakSignatures() {
  let director = SpecimenMotionDirector()
  let poses = Set(
    SpecimenDisplayState.allCases.map {
      director.pose(for: $0, frame: 2, level: .full, reduceMotion: false)
    })
  #expect(poses.count == SpecimenDisplayState.allCases.count)
}

@Test func anomalyMotionDoesNotMoveTheCreatureBody() {
  let pose = SpecimenMotionDirector().pose(
    for: .anomaly,
    frame: 2,
    level: .full,
    reduceMotion: false
  )
  #expect(pose.bodyOffsetY == 0)
  #expect(pose.coreScale == 1)
  #expect(pose.ghostCircuitAlpha > 0)
}

@MainActor
@Test func specimenFitsInsideTheTransparentPanel() throws {
  prepareAppKitForTesting()
  let scene = SpecimenScene(size: SpecimenPanelController.sceneSize)
  let specimen = try #require(scene.children.first)
  let bounds = specimen.calculateAccumulatedFrame()
  let sceneBounds = CGRect(
    x: -scene.size.width / 2,
    y: -scene.size.height / 2,
    width: scene.size.width,
    height: scene.size.height
  )

  #expect(sceneBounds.contains(bounds))
}

@MainActor
@Test func everyBaseOrganVariantFitsTheFormalDesktopCanvas() throws {
  prepareAppKitForTesting()
  let prototype = DesktopSnapshot.prototype
  let variants: [(String, [String])] = [
    ("body", (1...6).map { String(format: "body_%02d", $0) }),
    ("eyes", (1...8).map { String(format: "eyes_%02d", $0) }),
    ("mouth", (1...8).map { String(format: "mouth_%02d", $0) }),
    ("core", (1...6).map { String(format: "core_%02d", $0) }),
    ("limbs", (1...6).map { String(format: "limbs_%02d", $0) }),
    ("tail", (1...6).map { String(format: "tail_%02d", $0) }),
  ]
  let sceneBounds = CGRect(
    x: -SpecimenPanelController.sceneSize.width / 2,
    y: -SpecimenPanelController.sceneSize.height / 2,
    width: SpecimenPanelController.sceneSize.width,
    height: SpecimenPanelController.sceneSize.height
  )
  for (gene, identifiers) in variants {
    for identifier in identifiers {
      let base = prototype.creature
      let creature = DesktopSnapshot.Creature(
        specimenId: base.specimenId,
        fingerprint: base.fingerprint,
        stageIndex: gene == "tail" ? 3 : base.stageIndex,
        ecologyId: base.ecologyId,
        pathologyId: base.pathologyId,
        formId: base.formId,
        paletteId: base.paletteId,
        poseId: base.poseId,
        bodyId: gene == "body" ? identifier : base.bodyId,
        eyesId: gene == "eyes" ? identifier : base.eyesId,
        mouthId: gene == "mouth" ? identifier : base.mouthId,
        coreId: gene == "core" ? identifier : base.coreId,
        limbsId: gene == "limbs" ? identifier : base.limbsId,
        tailId: gene == "tail" ? identifier : base.tailId,
        chromaticId: base.chromaticId,
        scarId: base.scarId,
        graftId: base.graftId
      )
      let snapshot = DesktopSnapshot(
        version: prototype.version,
        generatedAt: prototype.generatedAt,
        date: prototype.date,
        language: prototype.language,
        creature: creature,
        privacy: prototype.privacy
      )
      let scene = SpecimenScene(size: SpecimenPanelController.sceneSize, snapshot: snapshot)
      let specimen = try #require(scene.children.first)
      #expect(sceneBounds.contains(specimen.calculateAccumulatedFrame()), "\(gene) \(identifier)")
    }
  }
}

@MainActor
@Test func desktopPanelRendersTheReferenceSceneAtHalfSize() {
  #expect(SpecimenPanelController.panelSize.width == SpecimenPanelController.sceneSize.width / 2)
  #expect(SpecimenPanelController.panelSize.height == SpecimenPanelController.sceneSize.height / 2)
}

@MainActor
@Test func desktopPositionIsMovableByDefaultAndLockPersists() throws {
  prepareAppKitForTesting()
  let suiteName = "anti-ai-desktop-tests-\(UUID().uuidString)"
  let defaults = try #require(UserDefaults(suiteName: suiteName))
  defer { defaults.removePersistentDomain(forName: suiteName) }
  let store = WindowPositionStore(
    defaults: defaults,
    key: "anchor",
    lockKey: "locked"
  )
  let controller = SpecimenPanelController(positionStore: store)
  let panel = try #require(controller.window)

  #expect(!controller.isPositionLocked)
  #expect(!panel.ignoresMouseEvents)
  #expect(panel.isMovableByWindowBackground)

  #expect(controller.togglePositionLock())
  #expect(panel.ignoresMouseEvents)
  #expect(!panel.isMovableByWindowBackground)
  #expect(store.loadPositionLocked())

  #expect(!controller.togglePositionLock())
  #expect(!panel.ignoresMouseEvents)
  #expect(panel.isMovableByWindowBackground)
  #expect(!store.loadPositionLocked())
}

@MainActor
@Test func fullScreenSuppressionPreservesTheUsersVisibilityChoice() throws {
  prepareAppKitForTesting()
  let suiteName = "anti-ai-desktop-full-screen-tests-\(UUID().uuidString)"
  let defaults = try #require(UserDefaults(suiteName: suiteName))
  defer { defaults.removePersistentDomain(forName: suiteName) }
  let controller = SpecimenPanelController(
    positionStore: WindowPositionStore(defaults: defaults, key: "anchor", lockKey: "locked")
  )
  let panel = try #require(controller.window)

  controller.show()
  #expect(panel.isVisible)
  controller.setFullScreenSuppressed(true)
  #expect(!panel.isVisible)
  controller.setFullScreenSuppressed(false)
  #expect(panel.isVisible)
  controller.hide()
  controller.setFullScreenSuppressed(true)
  controller.setFullScreenSuppressed(false)
  #expect(!panel.isVisible)
}

@Test func fullScreenDetectionMatchesScreenSizedWindowsOnly() {
  let screens = [CGRect(x: 0, y: 0, width: 1_440, height: 900)]
  #expect(
    FullScreenDetector.matchesFullScreen(
      windowBounds: [CGRect(x: 0, y: 0, width: 1_440, height: 900)],
      screenFrames: screens
    ))
  #expect(
    !FullScreenDetector.matchesFullScreen(
      windowBounds: [CGRect(x: 0, y: 23, width: 1_440, height: 877)],
      screenFrames: screens
    ))
}

@Test func desktopMenuCopyIsFullyLocalizedInChineseByDefault() {
  let copy = DesktopMenuCopy(language: .zh)

  #expect(copy.toggleVisibility == "显示 / 隐藏异变体")
  #expect(copy.lockPosition == "锁定位置")
  #expect(copy.resetPosition == "重置位置")
  #expect(copy.displayState == "展示状态")
  #expect(SpecimenDisplayState.allCases.map(copy.state) == ["待机", "过载", "清醒", "异常"])
  #expect(copy.motion == "动态")
  #expect(DesktopMotionLevel.allCases.map(copy.motionLevel) == ["关闭", "低动态", "完整动态"])
  #expect(copy.languageMenu == "语言")
  #expect(copy.refreshSnapshot == "刷新桌面快照")
  #expect(copy.openTUI == "打开完整 TUI")
  #expect(copy.checkForUpdates == "检查更新…")
  #expect(copy.automaticUpdateChecks == "自动检查更新")
  #expect(copy.syncState(.unlinked) == "未关联 · 运行 anti-ai desktop link")
  #expect(copy.syncState(.stale) == "快照已过期 · 建议刷新")
  #expect(copy.quit == "退出 anti-ai")
}

@Test func desktopMenuCopyHasCompleteEnglishAlternative() {
  let copy = DesktopMenuCopy(language: .en)

  #expect(copy.toggleVisibility == "Show / Hide Specimen")
  #expect(copy.lockPosition == "Lock Position")
  #expect(copy.resetPosition == "Reset Position")
  #expect(copy.displayState == "Display State")
  #expect(
    SpecimenDisplayState.allCases.map(copy.state) == ["Idle", "Overload", "Clarity", "Anomaly"])
  #expect(copy.motion == "Motion")
  #expect(DesktopMotionLevel.allCases.map(copy.motionLevel) == ["Off", "Low", "Full"])
  #expect(copy.languageMenu == "Language")
  #expect(copy.refreshSnapshot == "Refresh Snapshot")
  #expect(copy.openTUI == "Open Full TUI")
  #expect(copy.checkForUpdates == "Check for Updates…")
  #expect(copy.automaticUpdateChecks == "Automatically Check for Updates")
  #expect(copy.syncState(.failed) == "Refresh failed · previous snapshot preserved")
  #expect(copy.syncState(.stale) == "Snapshot is stale · refresh recommended")
  #expect(copy.quit == "Quit anti-ai")
}

@Test func desktopUpdateConfigurationRequiresHTTPSAndAnEd25519PublicKey() throws {
  let publicKey = Data(repeating: 7, count: 32).base64EncodedString()
  let configuration = try #require(
    DesktopUpdateConfiguration.parse([
      "SUFeedURL": "https://github.com/ppxu/anti-ai/releases/latest/download/appcast.xml",
      "SUPublicEDKey": publicKey,
    ]))

  #expect(configuration.feedURL.scheme == "https")
  #expect(configuration.publicKey == publicKey)
  #expect(
    DesktopUpdateConfiguration.parse([
      "SUFeedURL": "http://example.com/appcast.xml",
      "SUPublicEDKey": publicKey,
    ]) == nil)
  #expect(
    DesktopUpdateConfiguration.parse([
      "SUFeedURL": "https://example.com/appcast.xml",
      "SUPublicEDKey": "not-a-key",
    ]) == nil)
}

@MainActor
@Test func statusMenuExposesConfiguredUpdateActions() throws {
  prepareAppKitForTesting()
  var checked = false
  var automaticChecks = false
  let controller = StatusMenuController(
    specimenId: "140a55f3",
    positionLocked: false,
    language: .zh,
    onToggleVisibility: {},
    onTogglePositionLock: { false },
    onResetPosition: {},
    onRefreshSnapshot: {},
    onOpenTUI: {},
    onLanguage: { _ in },
    onState: { _ in },
    onMotion: { _ in },
    onQuit: {},
    updatesConfigured: true,
    automaticallyChecksForUpdates: false,
    onCanCheckForUpdates: { true },
    onCheckForUpdates: { checked = true },
    onToggleAutomaticUpdates: {
      automaticChecks.toggle()
      return automaticChecks
    }
  )

  controller.menuWillOpen(controller.menu)
  let checkItem = try #require(
    controller.menu.items.first(where: { $0.title == "检查更新…" })
  )
  let automaticItem = try #require(
    controller.menu.items.first(where: { $0.title == "自动检查更新" })
  )
  #expect(checkItem.isEnabled)
  #expect(automaticItem.state == .off)

  #expect(NSApp.sendAction(checkItem.action!, to: checkItem.target, from: checkItem))
  #expect(checked)
  #expect(NSApp.sendAction(automaticItem.action!, to: automaticItem.target, from: automaticItem))
  #expect(automaticChecks)
  #expect(automaticItem.state == .on)
}

@MainActor
@Test func desktopLanguageDefaultsToChineseAndPersistsSelection() throws {
  let suiteName = "anti-ai-desktop-language-tests-\(UUID().uuidString)"
  let defaults = try #require(UserDefaults(suiteName: suiteName))
  defer { defaults.removePersistentDomain(forName: suiteName) }
  let store = DesktopLanguageStore(defaults: defaults, key: "language")

  #expect(store.load() == .zh)
  store.save(.en)
  #expect(store.load() == .en)
  store.save(.zh)
  #expect(store.load() == .zh)
}

@MainActor
@Test func statusMenuStartsFullyChineseAndSwitchesFullyToEnglish() throws {
  prepareAppKitForTesting()
  var selectedLanguage: DesktopLanguage?
  let controller = StatusMenuController(
    specimenId: "140a55f3",
    positionLocked: false,
    language: .zh,
    onToggleVisibility: {},
    onTogglePositionLock: { false },
    onResetPosition: {},
    onRefreshSnapshot: {},
    onOpenTUI: {},
    onLanguage: { selectedLanguage = $0 },
    onState: { _ in },
    onMotion: { _ in },
    onQuit: {}
  )

  let chineseTitles = controller.menu.items.map(\.title)
  #expect(chineseTitles.contains("显示 / 隐藏异变体"))
  #expect(chineseTitles.contains("锁定位置"))
  #expect(chineseTitles.contains("展示状态"))
  #expect(chineseTitles.contains("动态"))
  #expect(chineseTitles.contains("语言"))
  let chineseStateMenu = try #require(
    controller.menu.items.first(where: { $0.title == "展示状态" })?.submenu
  )
  let chineseMotionMenu = try #require(
    controller.menu.items.first(where: { $0.title == "动态" })?.submenu
  )
  #expect(chineseStateMenu.items.map(\.title) == ["待机", "过载", "清醒", "异常"])
  #expect(chineseMotionMenu.items.map(\.title) == ["关闭", "低动态", "完整动态"])

  let languageMenu = try #require(
    controller.menu.items.first(where: { $0.title == "语言" })?.submenu
  )
  let englishItem = try #require(languageMenu.items.first(where: { $0.title == "English" }))
  let didSwitch = NSApp.sendAction(englishItem.action!, to: englishItem.target, from: englishItem)
  #expect(didSwitch)
  #expect(selectedLanguage == .en)

  let englishTitles = controller.menu.items.map(\.title)
  #expect(englishTitles.contains("Show / Hide Specimen"))
  #expect(englishTitles.contains("Lock Position"))
  #expect(englishTitles.contains("Display State"))
  #expect(englishTitles.contains("Motion"))
  #expect(englishTitles.contains("Language"))
  let englishStateMenu = try #require(
    controller.menu.items.first(where: { $0.title == "Display State" })?.submenu
  )
  let englishMotionMenu = try #require(
    controller.menu.items.first(where: { $0.title == "Motion" })?.submenu
  )
  #expect(englishStateMenu.items.map(\.title) == ["Idle", "Overload", "Clarity", "Anomaly"])
  #expect(englishMotionMenu.items.map(\.title) == ["Off", "Low", "Full"])
}

@Test func bridgeRejectsRelativePathsBeforeTouchingTheFileSystem() {
  let link = DesktopBridgeLink(
    version: 1,
    nodePath: "node",
    cliEntryPath: "bin/anti-ai.mjs"
  )
  #expect(throws: DesktopBridgeError.pathMustBeAbsolute) {
    try DesktopBridgeValidator().validate(link)
  }
}

@Test func bridgeRejectsUnknownMajorVersion() {
  let link = DesktopBridgeLink(
    version: 2,
    nodePath: "/usr/bin/false",
    cliEntryPath: "/tmp/missing.mjs"
  )
  #expect(throws: DesktopBridgeError.incompatibleVersion(2)) {
    try DesktopBridgeValidator().validate(link)
  }
}

@Test func bridgeRunnerBuildsOnlyTheFixedRefreshInvocation() async throws {
  let link = DesktopBridgeLink(
    version: 1,
    linkedAt: "2026-08-13T00:00:00.000Z",
    nodePath: "/usr/bin/node",
    cliEntryPath: "/opt/anti-ai/bin/anti-ai.mjs"
  )
  let invocation = await DesktopBridgeRunner().invocation(for: .refresh, link: link)
  #expect(invocation.executableURL.path == "/usr/bin/node")
  #expect(
    invocation.arguments == [
      "/opt/anti-ai/bin/anti-ai.mjs", "desktop", "refresh", "--json",
    ])
}

@Test func terminalLauncherWritesOnlyTheFixedTuiCommand() throws {
  let directory = FileManager.default.temporaryDirectory
    .appendingPathComponent("anti-ai-terminal-\(UUID().uuidString)", isDirectory: true)
  defer { try? FileManager.default.removeItem(at: directory) }
  let url = directory.appendingPathComponent("open-tui.command")
  let link = DesktopBridgeLink(
    version: 1,
    nodePath: "/Applications/Node's Runtime/node",
    cliEntryPath: "/opt/anti-ai/bin/anti-ai.mjs"
  )

  _ = try DesktopTerminalLauncher().prepare(link: link, at: url)
  let contents = try String(contentsOf: url, encoding: .utf8)
  #expect(
    contents == """
      #!/bin/zsh
      exec '/Applications/Node'\\''s Runtime/node' '/opt/anti-ai/bin/anti-ai.mjs' tui
      """)
  let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
  #expect((attributes[.posixPermissions] as? NSNumber)?.intValue == 0o700)
}
