CREATE TABLE `bill_items` (
	`id` text PRIMARY KEY NOT NULL,
	`bill_id` text NOT NULL,
	`name` text NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`qty` real DEFAULT 1 NOT NULL,
	`line_total_cents` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bi_bill_idx` ON `bill_items` (`bill_id`);--> statement-breakpoint
CREATE TABLE `bill_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`bill_id` text NOT NULL,
	`person_id` text,
	`name_snapshot` text NOT NULL,
	`subtotal_cents` integer DEFAULT 0 NOT NULL,
	`tax_extras_cents` integer DEFAULT 0 NOT NULL,
	`total_cents` integer DEFAULT 0 NOT NULL,
	`cent_adjustment` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `bp_bill_idx` ON `bill_participants` (`bill_id`);--> statement-breakpoint
CREATE TABLE `bills` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`engine` text DEFAULT 'EXACT_CODE' NOT NULL,
	`receipt_image_url` text,
	`currency` text DEFAULT 'USD' NOT NULL,
	`subtotal_cents` integer DEFAULT 0 NOT NULL,
	`tax_cents` integer DEFAULT 0 NOT NULL,
	`service_cents` integer DEFAULT 0 NOT NULL,
	`tip_cents` integer DEFAULT 0 NOT NULL,
	`extras_cents` integer DEFAULT 0 NOT NULL,
	`discount_cents` integer DEFAULT 0 NOT NULL,
	`grand_total_cents` integer DEFAULT 0 NOT NULL,
	`sum_check_match` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bills_user_status_idx` ON `bills` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `bills_user_created_idx` ON `bills` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `item_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`bill_item_id` text NOT NULL,
	`bill_participant_id` text NOT NULL,
	`share_cents` integer NOT NULL,
	FOREIGN KEY (`bill_item_id`) REFERENCES `bill_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bill_participant_id`) REFERENCES `bill_participants`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ia_item_idx` ON `item_assignments` (`bill_item_id`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `people_user_idx` ON `people` (`user_id`);--> statement-breakpoint
CREATE TABLE `presets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`member_ids` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `presets_user_idx` ON `presets` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);