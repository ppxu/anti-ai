// swift-tools-version: 6.1

import PackageDescription

let package = Package(
  name: "AntiAIDesktop",
  platforms: [
    .macOS(.v14)
  ],
  products: [
    .executable(name: "AntiAIDesktop", targets: ["AntiAIDesktop"])
  ],
  targets: [
    .binaryTarget(
      name: "Sparkle",
      url:
        "https://github.com/sparkle-project/Sparkle/releases/download/2.9.5/Sparkle-for-Swift-Package-Manager.zip",
      checksum: "34b9b2071f3de0012eca3faa3a9290bb94e62131e9a74f6dc91514a000097a6c"
    ),
    .executableTarget(
      name: "AntiAIDesktop",
      dependencies: [
        "Sparkle"
      ],
      path: "Sources/AntiAIDesktop"
    ),
    .testTarget(
      name: "AntiAIDesktopTests",
      dependencies: ["AntiAIDesktop"],
      path: "Tests/AntiAIDesktopTests",
      resources: [
        .copy("Fixtures/valid-snapshot-v1.json")
      ]
    ),
  ]
)
