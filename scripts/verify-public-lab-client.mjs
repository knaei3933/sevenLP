import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildRoot = join(projectRoot, ".next");
const routeStatsPath = join(buildRoot, "diagnostics/route-bundle-stats.json");
const clientReferencePath = join(buildRoot, "server/app/lab/page_client-reference-manifest.js");
const reportPath = process.env.PUBLIC_LAB_LEAK_REPORT
  && isAbsolute(process.env.PUBLIC_LAB_LEAK_REPORT)
  ? process.env.PUBLIC_LAB_LEAK_REPORT
  : join(projectRoot, ".verification/public-lab-client-leak.json");

const prohibitedSymbols = [
  "PUBLIC_TARGET_MARGINS",
  "canonicalRequest",
  "calculateAutomaticQuotation",
  "calculatePouchCost",
  "calculateSelectedCandidateCore",
  "calculationVersion",
  "createPublicLabQuote",
  "defaultGravureRollParameters",
  "defaultParameters",
  "public-lab-quote.server",
  "resultHash",
  "sizeMaster",
  "targetMargin",
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

if (!await exists(routeStatsPath) || !await exists(clientReferencePath)) {
  throw new Error("Missing Next.js production route bundle evidence.");
}

const routeStats = JSON.parse(await readFile(routeStatsPath, "utf8"));
const labRoutes = routeStats.filter((route) => route.route === "/lab");
if (labRoutes.length !== 1) {
  throw new Error(`Expected exactly one /lab route bundle entry, found ${JSON.stringify(labRoutes.map(({ route }) => route))}`);
}

const clientReferenceSource = await readFile(clientReferencePath, "utf8");
const clientReference = JSON.parse(
  clientReferenceSource.slice(
    clientReferenceSource.lastIndexOf("=") + 1,
    clientReferenceSource.lastIndexOf(";"),
  ),
);
const assetPaths = [
  ...labRoutes[0].firstLoadChunkPaths
    .map((path) => path.replace(/^\.next\//, ""))
    .filter((path) => path.endsWith(".js")),
  ...Object.values(clientReference.entryCSSFiles ?? {}).flat().map((entry) => entry.path),
].filter((value, index, values) => values.indexOf(value) === index).sort();
if (assetPaths.length === 0) {
  throw new Error("The /lab production manifest contains no CSS or JavaScript client assets.");
}

const scannedFiles = [];
for (const relativeAssetPath of assetPaths) {
  const absolutePath = join(buildRoot, relativeAssetPath);
  if (!isAbsolute(relativeAssetPath) && await exists(absolutePath)) {
    const content = await readFile(absolutePath, "utf8");
    const matches = prohibitedSymbols.filter((symbol) => content.includes(symbol));
    scannedFiles.push({
      path: relativeAssetPath,
      sha256: sha256(content),
      bytes: Buffer.byteLength(content),
      prohibitedMatches: matches,
    });
  } else {
    scannedFiles.push({
      path: relativeAssetPath,
      error: "missing_from_build",
      prohibitedMatches: ["missing_from_build"],
    });
  }
}

const sourcePaths = [
  "src/app/lab/lab-request-form.tsx",
  "src/app/lab/page.tsx",
];
const sourceChecks = [];
for (const sourcePath of sourcePaths) {
  const source = await readFile(join(projectRoot, sourcePath), "utf8");
  const forbiddenImport = source.match(/from\s+"(?:@\/lib\/)?(?:[^"]*(?:calculation|pricing|public-lab-quote\.server)[^"]*)"/);
  sourceChecks.push({
    path: sourcePath,
    sha256: sha256(source),
    forbiddenImport: forbiddenImport?.[0] ?? null,
  });
}

const failed = [
  ...scannedFiles.flatMap((file) => file.prohibitedMatches.map((symbol) => `${file.path}:${symbol}`)),
  ...sourceChecks.flatMap((file) => file.forbiddenImport ? [`${file.path}:${file.forbiddenImport}`] : []),
];
const buildId = await readFile(join(buildRoot, "BUILD_ID"), "utf8");
const report = {
  status: failed.length === 0 ? "pass" : "fail",
  buildId: buildId.trim(),
  route: "/lab",
  routeEvidence: {
    routeStatsPath: relative(projectRoot, routeStatsPath),
    clientReferencePath: relative(projectRoot, clientReferencePath),
    firstLoadUncompressedJsBytes: labRoutes[0].firstLoadUncompressedJsBytes,
  },
  prohibitedSymbols,
  sourceChecks,
  scannedFiles,
  failed,
};

await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`public lab client leak check: ${report.status}`);
console.log(`scanned ${scannedFiles.length} /lab production assets`);
console.log(`report: ${relative(projectRoot, reportPath) || reportPath}`);
if (failed.length > 0) {
  console.error(failed.join("\n"));
  process.exit(1);
}
