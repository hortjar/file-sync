CREATE TABLE "device_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"level" varchar(16) DEFAULT 'error' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"line_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "metric_samples" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "device_events" ADD CONSTRAINT "device_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_events" ADD CONSTRAINT "device_events_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_logs" ADD CONSTRAINT "device_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_logs" ADD CONSTRAINT "device_logs_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_events_user_id_idx" ON "device_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "device_events_device_id_idx" ON "device_events" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "device_logs_user_id_idx" ON "device_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "device_logs_device_id_idx" ON "device_logs" USING btree ("device_id");--> statement-breakpoint
ALTER TABLE "metric_samples" ADD CONSTRAINT "metric_samples_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "metric_samples_user_metric_captured_idx" ON "metric_samples" USING btree ("user_id","metric","captured_at");--> statement-breakpoint
-- Drop pre-existing server-wide samples so charts only show clean per-account data.
DELETE FROM "metric_samples";