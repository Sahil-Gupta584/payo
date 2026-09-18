ALTER TABLE "order" ALTER COLUMN "payment_method" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "order" ALTER COLUMN "payment_method" SET DEFAULT 'wallet'::text;--> statement-breakpoint
ALTER TABLE "order_history" ALTER COLUMN "payment_method" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "order_history" ALTER COLUMN "payment_method" SET DEFAULT 'wallet'::text;--> statement-breakpoint
DROP TYPE "public"."payment_method";--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('wallet', 'cod');--> statement-breakpoint
ALTER TABLE "order" ALTER COLUMN "payment_method" SET DEFAULT 'wallet'::"public"."payment_method";--> statement-breakpoint
ALTER TABLE "order" ALTER COLUMN "payment_method" SET DATA TYPE "public"."payment_method" USING "payment_method"::"public"."payment_method";--> statement-breakpoint
ALTER TABLE "order_history" ALTER COLUMN "payment_method" SET DEFAULT 'wallet'::"public"."payment_method";--> statement-breakpoint
ALTER TABLE "order_history" ALTER COLUMN "payment_method" SET DATA TYPE "public"."payment_method" USING "payment_method"::"public"."payment_method";