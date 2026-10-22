CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`status` text NOT NULL,
	`result_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `setup_requests`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verifications_request_id_unique` ON `verifications` (`request_id`);