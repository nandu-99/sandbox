export type SourceEvidence = {
  sourceId: string;
  sourceType: "repo_dashboard" | "sandbox_dashboard";
  sourceUrl: string;
  retrievedAt: string;
};

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  requiredServices: string[];
  source: SourceEvidence;
};

export type DemoRepository = {
  id: string;
  name: string;
  defaultBranch: string;
  templateId: string;
  visibility: "private";
  source: SourceEvidence;
};

export type DemoSandbox = {
  id: string;
  name: string;
  repositoryId: string;
  environment: "sandbox";
  status: "ready";
  source: SourceEvidence;
};

export type SeedProfile = {
  id: string;
  name: string;
  description: string;
  recordCount: number;
  synthetic: true;
  source: SourceEvidence;
};

const source = (
  sourceType: SourceEvidence["sourceType"],
  resource: string,
): SourceEvidence => ({
  sourceId: `${sourceType}:${resource}`,
  sourceType,
  sourceUrl: `mock://${sourceType.replace("_", "-")}/${resource}`,
  retrievedAt: new Date().toISOString(),
});

export function getProjectTemplates(): ProjectTemplate[] {
  return [
    {
      id: "tpl-node-api",
      name: "Node.js API",
      description: "Express API with SQLite and a smoke-test user.",
      requiredServices: ["node", "sqlite"],
      source: source("repo_dashboard", "templates/tpl-node-api"),
    },
    {
      id: "tpl-next-web",
      name: "Next.js web application",
      description: "Next.js frontend configured against a demo API.",
      requiredServices: ["node", "web"],
      source: source("repo_dashboard", "templates/tpl-next-web"),
    },
  ];
}

export function getRepositories(): DemoRepository[] {
  return [
    {
      id: "repo-payments-api",
      name: "payments-api-demo",
      defaultBranch: "main",
      templateId: "tpl-node-api",
      visibility: "private",
      source: source("repo_dashboard", "repositories/repo-payments-api"),
    },
    {
      id: "repo-catalog-web",
      name: "catalog-web-demo",
      defaultBranch: "main",
      templateId: "tpl-next-web",
      visibility: "private",
      source: source("repo_dashboard", "repositories/repo-catalog-web"),
    },
  ];
}

export function getSandboxes(): DemoSandbox[] {
  return [
    {
      id: "sbx-catalog-001",
      name: "catalog-web-sandbox",
      repositoryId: "repo-catalog-web",
      environment: "sandbox",
      status: "ready",
      source: source("sandbox_dashboard", "sandboxes/sbx-catalog-001"),
    },
  ];
}

export function getSeedProfiles(): SeedProfile[] {
  return [
    {
      id: "seed-demo-customers",
      name: "Demo customers",
      description: "Five fictional customer records for login and list checks.",
      recordCount: 5,
      synthetic: true,
      source: source("sandbox_dashboard", "seed-profiles/seed-demo-customers"),
    },
    {
      id: "seed-empty",
      name: "Empty environment",
      description: "Creates no domain records; only the smoke-test user is available.",
      recordCount: 0,
      synthetic: true,
      source: source("sandbox_dashboard", "seed-profiles/seed-empty"),
    },
  ];
}
