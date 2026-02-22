import fs from "node:fs/promises";
import path from "node:path";

const VALID_ENVIRONMENTS = new Set(["production", "preview"]);
const API_BASE = "https://api.cloudflare.com/client/v4";
const IMPORTANT_KEY_PREFIXES = ["IMAGE_QUALITY_", "PEXELS_MIN_"];

const stripWrappingQuotes = (value) => {
  if (value.length >= 2 && ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1);
  }
  return value;
};

const parseEnvText = (text) => {
  const vars = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = stripWrappingQuotes(line.slice(eqIndex + 1).trim());
    if (key) vars[key] = value;
  }
  return vars;
};

const loadEnvFile = async (fileName) => {
  try {
    const filePath = path.join(process.cwd(), fileName);
    const text = await fs.readFile(filePath, "utf8");
    const parsed = parseEnvText(text);
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch (error) {
    if (error && error.code !== "ENOENT") throw error;
  }
};

export const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
};

export const normalizeEnvironment = (value) => {
  const env = String(value || "").trim().toLowerCase();
  if (!VALID_ENVIRONMENTS.has(env)) {
    throw new Error(`Invalid --env value "${value}". Use one of: production, preview.`);
  }
  return env;
};

const maskToken = (value) => {
  if (!value) return "<missing>";
  if (value.length <= 8) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

export const loadCloudflareConfig = async () => {
  await loadEnvFile(".env.cloudflare");
  await loadEnvFile(".env");

  const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || "";
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || "";
  const projectName = process.env.CLOUDFLARE_PAGES_PROJECT || "";
  const missing = [];
  if (!token) missing.push("CLOUDFLARE_API_TOKEN");
  if (!accountId) missing.push("CLOUDFLARE_ACCOUNT_ID");
  if (!projectName) missing.push("CLOUDFLARE_PAGES_PROJECT");
  if (missing.length > 0) {
    throw new Error(
      `Missing required Cloudflare credentials: ${missing.join(", ")}. Add them to .env.cloudflare or your shell environment.`
    );
  }

  return { token, accountId, projectName };
};

const requestJson = async (config, method, route, body) => {
  const url = `${API_BASE}${route}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.success === false) {
    const errors = Array.isArray(payload?.errors) ? payload.errors.map((e) => e.message || JSON.stringify(e)).join("; ") : "";
    const reason = errors || payload?.message || `HTTP ${response.status}`;
    throw new Error(`Cloudflare API ${method} ${route} failed: ${reason}`);
  }

  return payload?.result ?? payload;
};

export const getProject = async (config) =>
  requestJson(config, "GET", `/accounts/${config.accountId}/pages/projects/${config.projectName}`);

const ensureEnvVarShape = (envVars = {}) => {
  const normalized = {};
  for (const [key, entry] of Object.entries(envVars)) {
    if (entry && typeof entry === "object" && "value" in entry) {
      normalized[key] = {
        type: entry.type || "plain_text",
        value: String(entry.value),
      };
      continue;
    }
    normalized[key] = {
      type: "plain_text",
      value: String(entry ?? ""),
    };
  }
  return normalized;
};

export const updateProjectEnvVars = async ({ config, environment, mutator, dryRun = false }) => {
  const env = normalizeEnvironment(environment);
  const project = await getProject(config);
  const deploymentConfigs = project.deployment_configs || {};
  const envConfig = deploymentConfigs[env] || {};
  const existing = ensureEnvVarShape(envConfig.env_vars || {});
  const nextEnvVars = mutator(existing);

  const body = {
    deployment_configs: {
      [env]: {
        ...envConfig,
        env_vars: nextEnvVars,
      },
    },
  };

  if (dryRun) {
    return {
      dryRun: true,
      environment: env,
      keyCount: Object.keys(nextEnvVars).length,
      body,
    };
  }

  return requestJson(config, "PATCH", `/accounts/${config.accountId}/pages/projects/${config.projectName}`, body);
};

export const triggerProductionDeployment = async (config) =>
  requestJson(config, "POST", `/accounts/${config.accountId}/pages/projects/${config.projectName}/deployments`, {
    branch: "main",
  });

export const getDeployment = async (config, deploymentId) =>
  requestJson(config, "GET", `/accounts/${config.accountId}/pages/projects/${config.projectName}/deployments/${deploymentId}`);

export const formatEnvVarsForOutput = (envVars = {}) => {
  const rows = Object.entries(envVars).map(([key, entry]) => ({
    key,
    type: entry?.type || "plain_text",
    value: entry?.type === "secret_text" ? "<redacted>" : entry?.value ?? "",
  }));
  rows.sort((a, b) => a.key.localeCompare(b.key));

  const priority = [];
  const normal = [];
  for (const row of rows) {
    if (IMPORTANT_KEY_PREFIXES.some((prefix) => row.key.startsWith(prefix))) priority.push(row);
    else normal.push(row);
  }
  return [...priority, ...normal];
};

export const logConfigSummary = (config) => {
  console.log(
    `[cf] account=${config.accountId} project=${config.projectName} token=${maskToken(config.token)}`
  );
};
