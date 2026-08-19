import {
  assert,
  mkdirSync,
  mkdtempSync,
  path,
  projectDir,
  readFileSync,
  rmSync,
  spawnSync,
  test,
  tmpdir,
  writeFileSync,
} from "./helpers.mjs";

import { mergeAppcasts } from "../apps/macos/scripts/merge-appcast.mjs";

test("the release script generates only the current item before merging history", () => {
  const script = readFileSync(
    path.join(
      process.cwd(),
      "apps",
      "macos",
      "scripts",
      "generate-appcast.sh",
    ),
    "utf8",
  );

  assert.match(script, /staging_input=/u);
  assert.match(script, /--maximum-versions 1/u);
  assert.match(script, /merge-appcast\.mjs/u);
  assert.match(script, /ANTI_AI_SPARKLE_PREVIOUS_APPCAST/u);
  assert.doesNotMatch(
    script,
    /generate_appcast"[^\n]*"\$updates_dir"/u,
  );
});

function item(version, signature = `signature-${version}`) {
  return `        <item>
            <title>${version}</title>
            <sparkle:shortVersionString>${version}</sparkle:shortVersionString>
            <enclosure url="https://github.com/ppxu/anti-ai/releases/download/v${version}/anti-ai-${version}-macos-universal.zip" sparkle:edSignature="${signature}"/>
        </item>`;
}

function feed(items) {
  return `<?xml version="1.0" standalone="yes"?>
<rss xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle" version="2.0">
    <channel>
        <title>anti-ai</title>
${items.join("\n")}
    </channel>
</rss>
`;
}

test("the release script runs against an isolated current-version staging directory", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-appcast-script-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const distribution = path.join(workspace, "dist");
  const fakeBin = path.join(workspace, "bin");
  const archive = path.join(
    workspace,
    "anti-ai-4.2.0-macos-universal.zip",
  );
  const previous = path.join(workspace, "previous.xml");
  const generator = path.join(fakeBin, "generate_appcast.mjs");
  mkdirSync(fakeBin, { recursive: true });
  writeFileSync(archive, "fixture archive");
  writeFileSync(previous, feed([item("4.1.0")]));
  writeFileSync(
    generator,
    `#!/usr/bin/env node
import { readdirSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const output = args[args.indexOf("-o") + 1];
const input = args.at(-1);
const files = readdirSync(input).sort();
if (files.join(",") !== "anti-ai-4.2.0-macos-universal.zip") {
  throw new Error(\`unexpected staging input: \${files.join(",")}\`);
}
writeFileSync(output, ${JSON.stringify(feed([item("4.2.0", "current-signature")]))});
`,
    { mode: 0o755 },
  );
  writeFileSync(
    path.join(fakeBin, "xmllint"),
    "#!/usr/bin/env sh\nexit 0\n",
    { mode: 0o755 },
  );

  const result = spawnSync(
    "bash",
    [
      path.join(projectDir, "apps", "macos", "scripts", "generate-appcast.sh"),
      "4.2.0",
      archive,
    ],
    {
      cwd: projectDir,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${fakeBin}${path.delimiter}${process.env.PATH}`,
        ANTI_AI_SPARKLE_DIST_DIR: distribution,
        ANTI_AI_SPARKLE_GENERATE_APPCAST: generator,
        ANTI_AI_SPARKLE_PREVIOUS_APPCAST: previous,
      },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const merged = readFileSync(path.join(distribution, "appcast.xml"), "utf8");
  assert.equal((merged.match(/<item>/gu) ?? []).length, 2);
  assert.match(merged, /download\/v4\.2\.0\/anti-ai-4\.2\.0/u);
  assert.match(merged, /download\/v4\.1\.0\/anti-ai-4\.1\.0/u);
});

test("appcast merging keeps historical items byte-stable and caps the feed at three", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-appcast-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const currentPath = path.join(workspace, "current.xml");
  const previousPath = path.join(workspace, "previous.xml");
  const outputPath = path.join(workspace, "appcast.xml");
  const current = item("4.2.0", "new-signature");
  const historical = [item("4.1.0"), item("4.0.0"), item("3.9.0")];
  writeFileSync(currentPath, feed([current]));
  writeFileSync(previousPath, feed(historical));

  const result = mergeAppcasts({
    currentPath,
    previousPath,
    outputPath,
    currentVersion: "4.2.0",
    maximumVersions: 3,
  });
  const merged = readFileSync(outputPath, "utf8");

  assert.deepEqual(result.versions, ["4.2.0", "4.1.0", "4.0.0"]);
  assert.equal((merged.match(/<item>/gu) ?? []).length, 3);
  assert.ok(merged.includes(current));
  assert.ok(merged.includes(historical[0]));
  assert.ok(merged.includes(historical[1]));
  assert.ok(!merged.includes(historical[2]));
  const historicalItem = [...merged.matchAll(/<item>[\s\S]*?<\/item>/gu)]
    .map(([entry]) => entry)
    .find((entry) => entry.includes(">4.1.0<"));
  assert.ok(historicalItem);
  assert.doesNotMatch(historicalItem, /download\/v4\.2\.0/u);
});

test("appcast merging replaces the same version instead of duplicating it", (t) => {
  const workspace = mkdtempSync(path.join(tmpdir(), "anti-ai-appcast-replace-"));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const currentPath = path.join(workspace, "current.xml");
  const previousPath = path.join(workspace, "previous.xml");
  const outputPath = path.join(workspace, "appcast.xml");
  writeFileSync(currentPath, feed([item("4.2.0", "replacement")]));
  writeFileSync(
    previousPath,
    feed([item("4.2.0", "stale"), item("4.1.0")]),
  );

  const result = mergeAppcasts({
    currentPath,
    previousPath,
    outputPath,
    currentVersion: "4.2.0",
  });
  const merged = readFileSync(outputPath, "utf8");

  assert.deepEqual(result.versions, ["4.2.0", "4.1.0"]);
  assert.equal(
    (merged.match(/<sparkle:shortVersionString>4\.2\.0<\//gu) ?? []).length,
    1,
  );
  assert.match(merged, /replacement/u);
  assert.doesNotMatch(merged, /stale/u);
});
