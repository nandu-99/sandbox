import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const setupRequests = sqliteTable("setup_requests", {
  id: text("id").primaryKey(),
  projectTemplate: text("project_template").notNull(),
  repositoryId: text("repository_id").notNull(),
  targetEnvironment: text("target_environment").notNull(),
  requestedPermission: text("requested_permission").notNull(),
  seedProfile: text("seed_profile").notNull(),
  status: text("status").notNull().default("DRAFT"),
  evidenceJson: text("evidence_json"),
  planJson: text("plan_json"),
  manifestJson: text("manifest_json"),
  reviewedBy: text("reviewed_by"),
  approvedPlanVersion: integer("approved_plan_version"),
  approvedPlanJson: text("approved_plan_json"),
  approvedAt: integer("approved_at", { mode: "timestamp" }),
  rejectedAt: integer("rejected_at", { mode: "timestamp" }),
  rejectionReason: text("rejection_reason"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sandboxes = sqliteTable("sandboxes", {
  id: text("id").primaryKey(),
  requestId: text("request_id")
    .notNull()
    .references(() => setupRequests.id),
  repositoryName: text("repository_name").notNull(),
  assignedRole: text("assigned_role").notNull(),
  status: text("status").notNull().default("READY"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const executions = sqliteTable("executions", {
  id: text("id").primaryKey(),
  requestId: text("request_id")
    .notNull()
    .references(() => setupRequests.id),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  resultJson: text("result_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  requestId: text("request_id")
    .notNull()
    .unique()
    .references(() => setupRequests.id),
  status: text("status").notNull(),
  resultJson: text("result_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const testCaseRuns = sqliteTable("test_case_runs", {
  id: text("id").primaryKey(),
  testCase: text("test_case").notNull(),
  expectedResult: text("expected_result").notNull(),
  actualResult: text("actual_result"),
  evidenceJson: text("evidence_json"),
  status: text("status").notNull().default("PENDING"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
