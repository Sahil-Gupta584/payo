CREATE TABLE "order_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"platform" "platform" NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"amount" integer NOT NULL,
	"status" "order_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_payment_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" text NOT NULL,
	"sbi_transaction_id" text NOT NULL,
	"sbi_nonce" text NOT NULL,
	"sbi_timestamp" text NOT NULL,
	"sbi_signature" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "order_payment_session_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
ALTER TABLE "order_history" ADD CONSTRAINT "order_history_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_payment_session" ADD CONSTRAINT "order_payment_session_order_id_order_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."order"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_history_userId_idx" ON "order_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "order_payment_session_orderId_idx" ON "order_payment_session" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "order" DROP COLUMN "solari_session_id";--> statement-breakpoint
ALTER TABLE "order" DROP COLUMN "solari_ws_endpoint";--> statement-breakpoint
ALTER TABLE "order" DROP COLUMN "otp_page_url";--> statement-breakpoint
ALTER TABLE "order" DROP COLUMN "sbi_transaction_id";--> statement-breakpoint
ALTER TABLE "order" DROP COLUMN "sbi_nonce";--> statement-breakpoint
ALTER TABLE "order" DROP COLUMN "sbi_timestamp";--> statement-breakpoint
ALTER TABLE "order" DROP COLUMN "sbi_signature";
