import {
  loadCloudflareConfig,
  logConfigSummary,
  normalizeEnvironment,
  parseArgs,
  updateProjectEnvVars,
} from "./cf-pages-api.mjs";

const args = parseArgs(process.argv.slice(2));
const key = String(args.key || "").trim();
const dryRun = args["dry-run"] === true;

if (!key) {
  console.error("[cf:env:unset] Missing required argument: --key");
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
    mutator: (existing) => {
      const next = { ...existing };
      delete next[key];
      return next;
    },
  });

  if (dryRun) {
    console.log(`[cf:env:unset] dry-run: would remove ${key} from ${environment}. totalKeys=${result.keyCount}`);
    console.log(JSON.stringify(result.body, null, 2));
    return;
  }

  console.log(`[cf:env:unset] removed ${key} from ${environment} (no-op if absent).`);
};

main().catch((error) => {
  console.error(`[cf:env:unset] ${error.message}`);
  process.exit(1);
});
