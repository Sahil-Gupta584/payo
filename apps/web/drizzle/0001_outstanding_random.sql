ALTER TABLE "order" RENAME COLUMN "amount_paise" TO "amount";--> statement-breakpoint
ALTER TABLE "wallet" RENAME COLUMN "balance_paise" TO "balance";--> statement-breakpoint
ALTER TABLE "order" ALTER COLUMN "platform" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."platform";--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('flipkart', 'instamart');--> statement-breakpoint
ALTER TABLE "order" ALTER COLUMN "platform" SET DATA TYPE "public"."platform" USING "platform"::"public"."platform";