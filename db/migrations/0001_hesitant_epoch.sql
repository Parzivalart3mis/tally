ALTER TABLE `bills` ADD `paid_by_name` text;--> statement-breakpoint
ALTER TABLE `bills` ADD `tags` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `color` text;--> statement-breakpoint
ALTER TABLE `people` ADD `note` text;--> statement-breakpoint
ALTER TABLE `users` ADD `self_person_id` text;