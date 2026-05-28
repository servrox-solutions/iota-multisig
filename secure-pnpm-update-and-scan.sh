#!/usr/bin/env bash
set -Eeuo pipefail

# Applies pnpm supply-chain protections, optionally updates package manifests to
# the newest versions allowed by a release-age cooldown, refreshes the lockfile
# without running lifecycle scripts, then scans the repo with Bumblebee's threat
# intel and local Shai-Hulud indicators.

COOLDOWN_DAYS="${COOLDOWN_DAYS:-14}"
MAX_SCAN_DURATION="${MAX_SCAN_DURATION:-10m}"
TRUST_POLICY_IGNORE_AFTER_MIN="${TRUST_POLICY_IGNORE_AFTER_MIN:-20160}"
NPM_CHECK_UPDATES_REJECT="${NPM_CHECK_UPDATES_REJECT:-eslint,recharts,@thalalabs/surf,react-lite-youtube-embed}"
UA_PARSER_JS_OVERRIDE="${UA_PARSER_JS_OVERRIDE:-1.0.40}"
UPDATE_MANIFESTS="${UPDATE_MANIFESTS:-0}"
FAIL_ON_PEER_ISSUES="${FAIL_ON_PEER_ISSUES:-0}"
MATERIALIZE_NODE_MODULES="${MATERIALIZE_NODE_MODULES:-1}"
INSTALL_TIMEOUT_SECONDS="${INSTALL_TIMEOUT_SECONDS:-900}"
PEER_CHECK_TIMEOUT_SECONDS="${PEER_CHECK_TIMEOUT_SECONDS:-120}"
MINIMUM_RELEASE_AGE_EXCLUDE="${MINIMUM_RELEASE_AGE_EXCLUDE:-turbo@2.9.14,@turbo/darwin-64@2.9.14,@turbo/darwin-arm64@2.9.14,@turbo/linux-64@2.9.14,@turbo/linux-arm64@2.9.14,@turbo/windows-64@2.9.14,@turbo/windows-arm64@2.9.14,qs@6.15.2,tmp@0.2.6}"
MIN_RELEASE_MIN="$((COOLDOWN_DAYS * 24 * 60))"
export COOLDOWN_DAYS
export MAX_SCAN_DURATION
export TRUST_POLICY_IGNORE_AFTER_MIN
export NPM_CHECK_UPDATES_REJECT
export UA_PARSER_JS_OVERRIDE
export UPDATE_MANIFESTS
export FAIL_ON_PEER_ISSUES
export MATERIALIZE_NODE_MODULES
export INSTALL_TIMEOUT_SECONDS
export PEER_CHECK_TIMEOUT_SECONDS
export MINIMUM_RELEASE_AGE_EXCLUDE
export CI="${CI:-true}"
export NPM_CONFIG_IGNORE_SCRIPTS="${NPM_CONFIG_IGNORE_SCRIPTS:-true}"
export npm_config_ignore_scripts="${npm_config_ignore_scripts:-true}"
export PNPM_CONFIG_PM_ON_FAIL="${PNPM_CONFIG_PM_ON_FAIL:-ignore}"

need() {
  command -v "$1" >/dev/null || {
    echo "missing required command: $1" >&2
    exit 1
  }
}

go_is_125_or_newer() {
  command -v go >/dev/null || return 1
  local version major minor
  version="$(go version 2>/dev/null || true)"
  [[ "$version" =~ go([0-9]+)\.([0-9]+) ]] || return 1
  major="${BASH_REMATCH[1]}"
  minor="${BASH_REMATCH[2]}"
  ((major > 1 || (major == 1 && minor >= 25)))
}

go_cmd() {
  if go_is_125_or_newer; then
    go "$@"
  elif command -v nix >/dev/null; then
    nix shell 'nixpkgs#go' -c go "$@"
  else
    echo "need Go 1.25+ or nix to build Bumblebee" >&2
    exit 1
  fi
}

need node
need git
need find

REPO="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO"

if command -v corepack >/dev/null && COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm --version >/dev/null 2>&1; then
  PNPM_CMD=(corepack pnpm)
elif command -v pnpm >/dev/null; then
  PNPM_CMD=(pnpm)
else
  echo "missing required command: pnpm or corepack pnpm" >&2
  exit 1
fi

pnpm_cmd() {
  PNPM_CONFIG_PM_ON_FAIL="$PNPM_CONFIG_PM_ON_FAIL" "${PNPM_CMD[@]}" "$@"
}

pnpm_is_11_or_newer() {
  local version major
  version="${1#v}"
  major="${version%%.*}"
  [[ "$major" =~ ^[0-9]+$ ]] && ((major >= 11))
}

PNPM_VERSION="$(pnpm_cmd --version)"
if ! pnpm_is_11_or_newer "$PNPM_VERSION"; then
  echo "need pnpm 11+ for minimumReleaseAge/trustPolicy protections; found pnpm@$PNPM_VERSION" >&2
  exit 1
fi
echo "Using pnpm@$PNPM_VERSION"

mapfile -t PACKAGE_DIRS < <(
  node <<'NODE'
const fs = require("fs");
const dirs = new Set(["."]);

if (fs.existsSync("pnpm-lock.yaml")) {
  const lines = fs.readFileSync("pnpm-lock.yaml", "utf8").split(/\r?\n/);
  let inImporters = false;

  for (const line of lines) {
    if (line === "importers:") {
      inImporters = true;
      continue;
    }

    if (!inImporters) continue;
    if (/^\S/.test(line) && line.trim() !== "") break;

    const match = /^ {2}(.+):\s*$/.exec(line);
    if (!match) continue;

    const dir = match[1].replace(/^['"]|['"]$/g, "");
    if (fs.existsSync(`${dir}/package.json`)) {
      dirs.add(dir);
    }
  }
}

if (dirs.size === 1 && fs.existsSync("pnpm-workspace.yaml")) {
  const lines = fs.readFileSync("pnpm-workspace.yaml", "utf8").split(/\r?\n/);
  let inPackages = false;

  for (const line of lines) {
    if (line === "packages:") {
      inPackages = true;
      continue;
    }

    if (!inPackages) continue;
    if (/^\S/.test(line) && line.trim() !== "") break;

    const match = /^ {2}-\s+["']?([^"'!*?[\]{}]+)["']?\s*$/.exec(line);
    if (!match) continue;

    const dir = match[1].replace(/\/$/, "");
    if (fs.existsSync(`${dir}/package.json`)) {
      dirs.add(dir);
    }
  }
}

for (const dir of [...dirs].sort()) {
  console.log(dir);
}
NODE
)

PACKAGE_FILES=()
for dir in "${PACKAGE_DIRS[@]}"; do
  dir="${dir%/}"
  [[ -f "$dir/package.json" ]] && PACKAGE_FILES+=("$dir/package.json")
done

if ((${#PACKAGE_FILES[@]} == 0)); then
  echo "no package.json files found" >&2
  exit 1
fi

WORKSPACE_PACKAGE_EXCLUDES=(
  "!**/dist/**"
  "!**/.next/**"
  "!sdk/create-dapp/templates/*"
  "!sdk/typescript/bcs"
  "!sdk/typescript/client"
  "!sdk/typescript/cryptography"
  "!sdk/typescript/faucet"
  "!sdk/typescript/graphql"
  "!sdk/typescript/keypairs/ed25519"
  "!sdk/typescript/keypairs/secp256k1"
  "!sdk/typescript/keypairs/secp256r1"
  "!sdk/typescript/keypairs/passkey"
  "!sdk/typescript/multisig"
  "!sdk/typescript/signers/ledger"
  "!sdk/typescript/scripts"
  "!sdk/typescript/transactions"
  "!sdk/typescript/utils"
  "!sdk/typescript/verify"
  "!sdk/move-bytecode-template/pkg"
  "!sdk/typescript/graphql/schemas/2025.2"
  "!sdk/signers/aws"
  "!sdk/signers/gcp"
  "!sdk/signers/ledger"
  "!sdk/signers/webcrypto"
  "!sdk/typescript/test/**/**"
)

{
  workspace_entries=()
  for file in "${PACKAGE_FILES[@]}"; do
    dir="${file%/package.json}"
    dir="${dir#./}"
    [[ "$dir" == "." ]] || workspace_entries+=("$dir")
  done

  for entry in "${WORKSPACE_PACKAGE_EXCLUDES[@]}"; do
    workspace_entries+=("$entry")
  done

  if ((${#workspace_entries[@]} == 0)); then
    echo "packages: []"
  else
    echo "packages:"
    for entry in "${workspace_entries[@]}"; do
      printf '  - "%s"\n' "$entry"
    done
  fi

  cat <<EOF

strictDepBuilds: true
blockExoticSubdeps: true
autoInstallPeers: false
strictPeerDependencies: false
publicHoistPattern:
  - "*storybook*"
pmOnFail: ignore
confirmModulesPurge: false
minimumReleaseAge: $MIN_RELEASE_MIN
EOF

  if [[ -n "$MINIMUM_RELEASE_AGE_EXCLUDE" ]]; then
    echo "minimumReleaseAgeExclude:"
    IFS=',' read -ra exclude_entries <<<"$MINIMUM_RELEASE_AGE_EXCLUDE"
    for entry in "${exclude_entries[@]}"; do
      entry="${entry#"${entry%%[![:space:]]*}"}"
      entry="${entry%"${entry##*[![:space:]]}"}"
      [[ -n "$entry" ]] && printf '  - "%s"\n' "$entry"
    done
  fi

  cat <<EOF
trustPolicy: no-downgrade
trustPolicyIgnoreAfter: $TRUST_POLICY_IGNORE_AFTER_MIN
EOF
} > pnpm-workspace.yaml

echo "Writing pnpm workspace overrides..."
node <<'NODE'
const fs = require("fs");

const file = "package.json";
const workspaceFile = "pnpm-workspace.yaml";
const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
const version = process.env.UA_PARSER_JS_OVERRIDE;
let changed = false;

if (!pkg.overrides || typeof pkg.overrides !== "object" || Array.isArray(pkg.overrides)) {
  pkg.overrides = {};
  changed = true;
}

if (version && pkg.overrides["ua-parser-js"] !== version) {
  pkg.overrides["ua-parser-js"] = version;
  changed = true;
}

if (changed) {
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
}

const entries = Object.entries(pkg.overrides)
  .filter(([, value]) => typeof value === "string")
  .sort(([a], [b]) => a.localeCompare(b));

const trustedDependencies = Array.isArray(pkg.trustedDependencies)
  ? [
      ...new Set(
        pkg.trustedDependencies.filter((value) => typeof value === "string" && value.trim()),
      ),
    ].sort((a, b) => a.localeCompare(b))
  : [];

if (trustedDependencies.length > 0) {
  const lines = [
    "",
    "allowBuilds:",
    ...trustedDependencies.map((name) => `  ${JSON.stringify(name)}: true`),
  ];
  fs.appendFileSync(workspaceFile, `${lines.join("\n")}\n`);
}

if (entries.length > 0) {
  const lines = [
    "",
    "overrides:",
    ...entries.map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`),
  ];
  fs.appendFileSync(workspaceFile, `${lines.join("\n")}\n`);
}
NODE

echo "Normalizing local workspace dependency specs..."
node - "${PACKAGE_FILES[@]}" <<'NODE'
const fs = require("fs");

const files = process.argv.slice(2);
const sections = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
const workspacePackages = new Set();

for (const file of files) {
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));

  if (typeof pkg.name === "string" && pkg.name.length > 0) {
    workspacePackages.add(pkg.name);
  }
}

for (const file of files) {
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  let changed = false;

  for (const section of sections) {
    const deps = pkg[section];
    if (!deps || typeof deps !== "object") continue;

    for (const [name, spec] of Object.entries(deps)) {
      if (name === pkg.name || !workspacePackages.has(name)) continue;
      if (typeof spec !== "string" || spec.startsWith("workspace:")) continue;

      deps[name] = "workspace:*";
      changed = true;
      console.log(`${file}: ${name} ${spec} -> workspace:*`);
    }
  }

  if (changed) {
    fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
  }
}
NODE

if [[ "$UPDATE_MANIFESTS" == "1" ]]; then
  echo "Normalizing manifest specs to newest versions outside the ${COOLDOWN_DAYS}-day cooldown..."
  node - "${PACKAGE_FILES[@]}" <<'NODE'
const fs = require("fs");

const files = process.argv.slice(2);
const cooldownDays = Number(process.env.COOLDOWN_DAYS || "14");
const cutoff = Date.now() - cooldownDays * 24 * 60 * 60 * 1000;
const sections = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
const rejected = new Set(
  (process.env.NPM_CHECK_UPDATES_REJECT || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);
const cache = new Map();

function isRegistrySpec(spec) {
  return typeof spec === "string" &&
    !spec.startsWith("workspace:") &&
    !spec.startsWith("file:") &&
    !spec.startsWith("link:") &&
    !spec.startsWith("portal:") &&
    !spec.startsWith("catalog:") &&
    !spec.startsWith("github:") &&
    !spec.startsWith("git+") &&
    !spec.startsWith("http:") &&
    !spec.startsWith("https:") &&
    !spec.startsWith("ssh:");
}

function hasPrerelease(version) {
  return version.includes("-");
}

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(version);
  if (!match) return null;
  return {
    version,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || "",
  };
}

function compareSemver(a, b) {
  for (const key of ["major", "minor", "patch"]) {
    if (a[key] !== b[key]) return a[key] - b[key];
  }
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && !b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease, undefined, { numeric: true });
}

function rangePrefix(spec) {
  if (spec.startsWith("^")) return "^";
  if (spec.startsWith("~")) return "~";
  if (/^\d+\.\d+\.\d+/.test(spec)) return "";
  return "^";
}

function versionFromSpec(spec) {
  const match = /^(?:[\^~])?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/.exec(spec);
  return match ? match[1] : null;
}

async function packument(name) {
  if (cache.has(name)) return cache.get(name);
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${name}: registry returned HTTP ${res.status}`);
  const json = await res.json();
  cache.set(name, json);
  return json;
}

async function newestMatureVersion(name, currentSpec) {
  const meta = await packument(name);
  const times = meta.time || {};
  const latest = parseSemver(meta["dist-tags"] && meta["dist-tags"].latest);
  const candidates = Object.keys(times)
    .filter((version) => version !== "created" && version !== "modified")
    .filter((version) => Date.parse(times[version]) <= cutoff)
    .map(parseSemver)
    .filter(Boolean)
    .filter((candidate) => !latest || compareSemver(candidate, latest) <= 0);

  if (candidates.length === 0) return null;

  if (latest && candidates.some((candidate) => candidate.version === latest.version)) {
    return latest.version;
  }

  const stable = latest && latest.prerelease
    ? []
    : candidates.filter((candidate) => !hasPrerelease(candidate.version));
  const pool = stable.length > 0 ? stable : candidates;
  pool.sort(compareSemver);
  return pool[pool.length - 1].version;
}

async function main() {
  let changed = false;

  for (const file of files) {
    const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
    let fileChanged = false;

    for (const section of sections) {
      const deps = pkg[section];
      if (!deps || typeof deps !== "object") continue;

      for (const [name, spec] of Object.entries(deps)) {
        if (rejected.has(name)) continue;
        if (!isRegistrySpec(spec)) continue;

        try {
          const version = await newestMatureVersion(name, spec);
          if (!version) {
            console.warn(`${file}: keeping ${name}@${spec}; no mature registry version found`);
            continue;
          }

          const currentVersion = versionFromSpec(spec);
          const current = currentVersion ? parseSemver(currentVersion) : null;
          const mature = parseSemver(version);
          if (current && mature && compareSemver(current, mature) >= 0) {
            continue;
          }

          const nextSpec = `${rangePrefix(spec)}${version}`;
          if (deps[name] !== nextSpec) {
            console.log(`${file}: ${name} ${deps[name]} -> ${nextSpec}`);
            deps[name] = nextSpec;
            fileChanged = true;
          }
        } catch (error) {
          console.warn(`${file}: keeping ${name}@${spec}; ${error.message}`);
        }
      }
    }

    if (fileChanged) {
      fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
      changed = true;
    }
  }

  if (!changed) {
    console.log("No manifest specs needed cooldown normalization.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
else
  echo "Skipping broad manifest updates; set UPDATE_MANIFESTS=1 to enable cooldown-normalized package upgrades."
fi

install_args=(
  install
  --no-frozen-lockfile
  --ignore-scripts
  --trust-policy-ignore-after "$TRUST_POLICY_IGNORE_AFTER_MIN"
)

if [[ "$MATERIALIZE_NODE_MODULES" == "1" ]]; then
  echo "Installing with lifecycle scripts disabled..."
else
  echo "Refreshing pnpm lockfile without materializing node_modules or running lifecycle scripts..."
  install_args+=(--lockfile-only)
fi

timeout "$INSTALL_TIMEOUT_SECONDS" env PNPM_CONFIG_PM_ON_FAIL="$PNPM_CONFIG_PM_ON_FAIL" "${PNPM_CMD[@]}" "${install_args[@]}"
if ! timeout "$PEER_CHECK_TIMEOUT_SECONDS" env PNPM_CONFIG_PM_ON_FAIL="$PNPM_CONFIG_PM_ON_FAIL" "${PNPM_CMD[@]}" peers check --lockfile-only; then
  if [[ "$FAIL_ON_PEER_ISSUES" == "1" ]]; then
    exit 1
  fi

  echo "WARN: peer dependency issues found or the check timed out; continuing because FAIL_ON_PEER_ISSUES is not 1." >&2
fi

tmp="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp"
}
trap cleanup EXIT

echo "Fetching latest Bumblebee threat intel..."
git clone --depth 1 https://github.com/perplexityai/bumblebee.git "$tmp/bumblebee" >/dev/null
go_cmd build -C "$tmp/bumblebee" -o "$tmp/bumblebee-bin" ./cmd/bumblebee
"$tmp/bumblebee-bin" selftest

scan_output_dir="${SCAN_OUTPUT_DIR:-$REPO/.security-scan}"
mkdir -p "$scan_output_dir"

findings_file="$scan_output_dir/bumblebee-findings.ndjson"
ioc_hits_file="$scan_output_dir/shai-hulud-ioc-hits.txt"
rm -f "$findings_file" "$ioc_hits_file"

"$tmp/bumblebee-bin" scan \
  --profile deep \
  --root "$REPO" \
  --exposure-catalog "$tmp/bumblebee/threat_intel" \
  --findings-only \
  --max-duration "$MAX_SCAN_DURATION" \
  --output file \
  --output-file "$findings_file"

find . -type f \
  \( -name 'package.json' -o -name 'package-lock.json' -o -name 'npm-shrinkwrap.json' -o -name 'pnpm-lock.yaml' -o -name 'yarn.lock' -o -name 'bun.lock' -o -name 'tasks.json' -o -name 'codeql.yml' -o -name 'settings.json' -o -name '*.yml' -o -name '*.yaml' -o -name '*.js' -o -name '*.cjs' -o -name '*.mjs' \) \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/.security-scan/*' \
  -not -path '*/.next/*' \
  -not -path '*/.turbo/*' \
  -print0 |
  xargs -0 grep -nE 't\.m-kosche\.com|bun run index\.js|@antv/setup|github:antvis/G2#(1916faa365f2788b6e193514872d51a242876569|7cb42f57561c321ecb09b4552802ae0ac55b3a7a)|router_init\.js|tanstack_runner\.js|gh-token-monitor|kitty-monitor|niagA oG eW ereH :duluH-iahS|setup_bun\.js|bun_environment\.js|Sha1-Hulud: The Second Coming|Shai-Hulud Migration|/tmp/processor\.sh|/tmp/migrate-repos\.sh|webhook(\[?\.\]?|\\\.)site/bb8ca5f6-4175-45d2-b042-fc9ebb8170b7|46faab8ab153fae6e80e7cca38eab363075bb524edd79e42269217a083628f09' \
    > "$ioc_hits_file" || true

if grep -q '"record_type":"finding"' "$findings_file"; then
  echo "Bumblebee found known package exposures: $findings_file" >&2
  exit 66
fi

if [[ -s "$ioc_hits_file" ]]; then
  echo "Shai-Hulud indicator strings found: $ioc_hits_file" >&2
  exit 67
fi

echo "OK: pnpm security settings written, install completed, no Bumblebee findings, no indicator strings found."
echo "Bumblebee output: $findings_file"
echo "Indicator output: $ioc_hits_file"
