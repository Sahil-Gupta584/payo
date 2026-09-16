CREATE TYPE "public"."wallet_transaction_type" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TABLE "wallet_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"type" "wallet_transaction_type" NOT NULL,
	"description" text,
	"balance_after" integer,
	"reference_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallet" ALTER COLUMN "balance" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "balance" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "wallet_history" ADD CONSTRAINT "wallet_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wallet_history_userId_idx" ON "wallet_history" USING btree ("user_id");