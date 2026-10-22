CREATE TABLE `executions` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`result_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `setup_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `executions_idempotency_key_unique` ON `executions` (`idempotency_key`);--> statement-breakpoint
CREATE TABLE `sandboxes` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`repository_name` text NOT NULL,
	`assigned_role` text NOT NULL,
	`status` text DEFAULT 'READY' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `setup_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `setup_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`project_template` text NOT NULL,
	`target_environment` text NOT NULL,
	`requested_permission` text NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`evidence_json` text,
	`plan_json` text,
	`manifest_json` text,
	`approved_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `test_case_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`test_case` text NOT NULL,
	`expected_result` text NOT NULL,
	`actual_result` text,
	`evidence_json` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` integer NOT NULL
);
