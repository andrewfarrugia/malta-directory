import {
  loadCloudflareConfig,
  logConfigSummary,
  normalizeEnvironment,
  parseArgs,
  updateProjectEnvVars,
} from "./cf-pages-api.mjs";

const args = parseArgs(process.argv.slice(2));
const key = String(args.key || "").trim();
const value = args.value === undefined ? "" : String(args.value);
const type = String(args.type || "plain_text").trim();
const dryRun = args["dry-run"] === true;

if (!key) {
  console.error("[cf:env:set] Missing required argument: --key");
  process.exit(1);
}
if (!["plain_text", "secret_text"].includes(type)) {
  console.error('[cf:env:set] Invalid --type value. Use "plain_text" or "secret_text".');
  process.exit(1);
}

const main = async () => {
  const environment = normalizeEnvironment(args.env);
  const config = await loadCloudflareConfig();
  logConfigSummary(config);

  const result = await updateProjectEnvVars({
    config,
    environment,
    dryRun,
    mutator: (existing) => ({
      ...existing,
      [key]: { type, value },
    }),
  });

  if (dryRun) {
    console.log(
      `[cf:env:set] dry-run: would set ${key} on ${environment} (${type}). totalKeys=${result.keyCount}`
    );
    console.log(JSON.stringify(result.body, null, 2));
    return;
  }

  console.log(`[cf:env:set] set ${key} on ${environment} (${type}).`);
};

main().catch((error) => {
  console.error(`[cf:env:set] ${error.message}`);
  process.exit(1);
});
