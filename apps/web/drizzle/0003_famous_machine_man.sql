ALTER TABLE "order" ADD COLUMN "sbi_transaction_id" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "sbi_nonce" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "sbi_timestamp" text;--> statement-breakpoint
ALTER TABLE "order" ADD COLUMN "sbi_signature" text;