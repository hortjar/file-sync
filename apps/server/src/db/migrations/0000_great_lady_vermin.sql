CREATE TYPE "public"."platform" AS ENUM('windows', 'macos', 'linux');--> statement-breakpoint
CREATE TYPE "public"."conflict_resolution" AS ENUM('keep_local', 'keep_remote', 'keep_both');--> statement-breakpoint
CREATE TABLE "conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_entry_id" uuid NOT NULL,
	"sync_folder_id" uuid NOT NULL,
	"relative_path" text NOT NULL,
	"local_hash" varchar(64) NOT NULL,
	"remote_hash" varchar(64) NOT NULL,
	"local_mtime" timestamp with time zone NOT NULL,
	"remote_mtime" timestamp with time zone NOT NULL,
	"local_device_name" varchar(255) NOT NULL,
	"remote_device_name" varchar(255) NOT NULL,
	"resolution" "conflict_resolution",
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "device_folder_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"sync_folder_id" uuid NOT NULL,
	"local_path" text NOT NULL,
	CONSTRAINT "device_folder_unique" UNIQUE("device_id","sync_folder_id")
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"platform" "platform" NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_blobs" (
	"content_hash" varchar(64) PRIMARY KEY NOT NULL,
	"size" integer NOT NULL,
	"compressed" boolean DEFAULT false NOT NULL,
	"ref_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sync_folder_id" uuid NOT NULL,
	"relative_path" text NOT NULL,
	"content_hash" varchar(64),
	"size" integer DEFAULT 0 NOT NULL,
	"mtime" timestamp with time zone NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by_device_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "file_entry_unique" UNIQUE("sync_folder_id","relative_path")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "sync_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_file_entry_id_file_entries_id_fk" FOREIGN KEY ("file_entry_id") REFERENCES "public"."file_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conflicts" ADD CONSTRAINT "conflicts_sync_folder_id_sync_folders_id_fk" FOREIGN KEY ("sync_folder_id") REFERENCES "public"."sync_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_folder_links" ADD CONSTRAINT "device_folder_links_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_folder_links" ADD CONSTRAINT "device_folder_links_sync_folder_id_sync_folders_id_fk" FOREIGN KEY ("sync_folder_id") REFERENCES "public"."sync_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_entries" ADD CONSTRAINT "file_entries_sync_folder_id_sync_folders_id_fk" FOREIGN KEY ("sync_folder_id") REFERENCES "public"."sync_folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_entries" ADD CONSTRAINT "file_entries_content_hash_file_blobs_content_hash_fk" FOREIGN KEY ("content_hash") REFERENCES "public"."file_blobs"("content_hash") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_entries" ADD CONSTRAINT "file_entries_updated_by_device_id_devices_id_fk" FOREIGN KEY ("updated_by_device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_folders" ADD CONSTRAINT "sync_folders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conflicts_sync_folder_id_idx" ON "conflicts" USING btree ("sync_folder_id");--> statement-breakpoint
CREATE INDEX "conflicts_resolved_idx" ON "conflicts" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "device_folder_links_sync_folder_id_idx" ON "device_folder_links" USING btree ("sync_folder_id");--> statement-breakpoint
CREATE INDEX "devices_user_id_idx" ON "devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "file_entries_sync_folder_id_idx" ON "file_entries" USING btree ("sync_folder_id");--> statement-breakpoint
CREATE INDEX "file_entries_content_hash_idx" ON "file_entries" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sync_folders_user_id_idx" ON "sync_folders" USING btree ("user_id");