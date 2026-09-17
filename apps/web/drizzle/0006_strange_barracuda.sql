CREATE TYPE "public"."payment_method" AS ENUM('card', 'cod');--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "payment_method" "payment_method" DEFAULT 'card' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_history" ADD COLUMN "payment_method" "payment_method" DEFAULT 'card' NOT NULL;