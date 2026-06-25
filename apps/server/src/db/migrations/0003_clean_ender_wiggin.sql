CREATE TABLE "metric_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric" varchar(64) NOT NULL,
	"value" bigint NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "metric_samples_metric_captured_idx" ON "metric_samples" USING btree ("metric","captured_at");