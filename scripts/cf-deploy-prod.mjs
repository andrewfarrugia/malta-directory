import { getDeployment, loadCloudflareConfig, logConfigSummary, parseArgs, triggerProductionDeployment } from "./cf-pages-api.mjs";

const args = parseArgs(process.argv.slice(2));
const shouldWait = args.wait === true;
const timeoutMs = Number(args.timeoutMs || 10 * 60 * 1000);
const intervalMs = Number(args.intervalMs || 8 * 1000);

const terminalStates = new Set(["success", "failure", "canceled", "cancelled", "skipped"]);

const inferStatus = (deployment) => {
  const latestStage = Array.isArray(deployment?.latest_stage)
    ? deployment.latest_stage[deployment.latest_stage.length - 1]
    : deployment?.latest_stage;
  return (
    latestStage?.status ||
    latestStage?.name ||
    deployment?.status ||
    deployment?.deployment_trigger?.metadata?.status ||
    "unknown"
  );
};

const waitForDeployment = async (config, deploymentId) => {
  const startedAt = Date.now();
  for (;;) {
    const deployment = await getDeployment(config, deploymentId);
    const status = String(inferStatus(deployment)).toLowerCase();
    const url = deployment?.url || deployment?.aliases?.[0] || "";
    console.log(`[cf:deploy:prod] status=${status}${url ? ` url=${url}` : ""}`);

    if (terminalStates.has(status)) {
      if (status !== "success") {
        throw new Error(`Deployment finished with non-success status: ${status}`);
      }
      return deployment;
    }

    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs}ms waiting for deployment ${deploymentId}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

const main = async () => {
  const config = await loadCloudflareConfig();
  logConfigSummary(config);

  const deployment = await triggerProductionDeployment(config);
  const deploymentId = deployment?.id || deployment?.deployment_id || "";
  const deploymentUrl = deployment?.url || deployment?.aliases?.[0] || "";
  console.log(
    `[cf:deploy:prod] triggered production deployment${deploymentId ? ` id=${deploymentId}` : ""}${
      deploymentUrl ? ` url=${deploymentUrl}` : ""
    }`
  );

  if (!shouldWait || !deploymentId) return;
  await waitForDeployment(config, deploymentId);
};

main().catch((error) => {
  console.error(`[cf:deploy:prod] ${error.message}`);
  process.exit(1);
});
