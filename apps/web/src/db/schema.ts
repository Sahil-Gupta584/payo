import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, serial, integer, pgEnum } from "drizzle-orm/pg-core";

export const todos = pgTable('todos', {
  id: serial().primaryKey(),
  title: text().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// ── Wallet ────────────────────────────────────────────────────────────────────

export const wallet = pgTable("wallet", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  balance: integer("balance").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

// ── Orders ────────────────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "awaiting_otp",
  "confirmed",
  "failed",
  "cancelled",
]);

export const platformEnum = pgEnum("platform", ["flipkart", "instamart"]);

export const order = pgTable(
  "order",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    platform: platformEnum("platform").notNull(),
    productId: text("product_id").notNull(),
    productName: text("product_name").notNull(),
    amount: integer("amount").notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    solariSessionId: text("solari_session_id"),
    solariWsEndpoint: text("solari_ws_endpoint"),
    otpPageUrl: text("otp_page_url"),
    sbiTransactionId: text("sbi_transaction_id"),
    sbiNonce: text("sbi_nonce"),
    sbiTimestamp: text("sbi_timestamp"),
    sbiSignature: text("sbi_signature"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index("order_userId_idx").on(table.userId)],
);

// ── API Keys (for MCP auth) ───────────────────────────────────────────────────

export const apiKey = pgTable(
  "api_key",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    keyHash: text("key_hash").notNull().unique(),
    name: text("name").notNull().default("default"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [index("api_key_userId_idx").on(table.userId)],
);

// ── Relations ─────────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  orders: many(order),
  wallet: one(wallet),
  apiKeys: many(apiKey),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const walletRelations = relations(wallet, ({ one }) => ({
  user: one(user, { fields: [wallet.userId], references: [user.id] }),
}));

export const orderRelations = relations(order, ({ one }) => ({
  user: one(user, { fields: [order.userId], references: [user.id] }),
}));

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  user: one(user, { fields: [apiKey.userId], references: [user.id] }),
}));

// ── Invite allowlist ──────────────────────────────────────────────────────────

export const invite = pgTable("invite", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export type Invite = typeof invite.$inferSelect

export type User = typeof user.$inferSelect
export type Wallet = typeof wallet.$inferSelect
export type Order = typeof order.$inferSelect
export type ApiKey = typeof apiKey.$inferSelect
export type NewOrder = typeof order.$inferInsert
export type OrderStatus = Order["status"]
export type Platform = Order["platform"]

