import { formatEnvVarsForOutput, getProject, loadCloudflareConfig, logConfigSummary, parseArgs } from "./cf-pages-api.mjs";

const args = parseArgs(process.argv.slice(2));
const asJson = args.json === true;

const printRows = (environment, rows) => {
  console.log(`\n[cf:env:get] ${environment}`);
  if (rows.length === 0) {
    console.log("(no variables configured)");
    return;
  }
  console.table(rows);
};

const main = async () => {
  const config = await loadCloudflareConfig();
  logConfigSummary(config);
  const project = await getProject(config);

  const productionVars = project?.deployment_configs?.production?.env_vars || {};
  const previewVars = project?.deployment_configs?.preview?.env_vars || {};
  const productionRows = formatEnvVarsForOutput(productionVars);
  const previewRows = formatEnvVarsForOutput(previewVars);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          production: productionRows,
          preview: previewRows,
        },
        null,
        2
      )
    );
    return;
  }

  printRows("production", productionRows);
  printRows("preview", previewRows);
};

main().catch((error) => {
  console.error(`[cf:env:get] ${error.message}`);
  process.exit(1);
});
