ALTER TABLE `setup_requests` ADD `reviewed_by` text;--> statement-breakpoint
ALTER TABLE `setup_requests` ADD `approved_plan_version` integer;--> statement-breakpoint
ALTER TABLE `setup_requests` ADD `approved_plan_json` text;--> statement-breakpoint
ALTER TABLE `setup_requests` ADD `rejected_at` integer;--> statement-breakpoint
ALTER TABLE `setup_requests` ADD `rejection_reason` text;