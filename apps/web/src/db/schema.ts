import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, serial, integer, pgEnum, uuid } from "drizzle-orm/pg-core";

export const paymentMethodEnum = pgEnum("payment_method", ["card", "cod"])

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
  balance: integer("balance").default(0),
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

// ── Wallet (legacy, balance moved to user.balance) ───────────────────────────

export const wallet = pgTable("wallet", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  balance: integer("balance").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export const walletTransactionTypeEnum = pgEnum("wallet_transaction_type", ["credit", "debit"])

export const walletHistory = pgTable("wallet_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  type: walletTransactionTypeEnum("type").notNull(),
  description: text("description"),
  balanceAfter: integer("balance_after"),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("wallet_history_userId_idx").on(table.userId)]);

// ── Orders (history only — no temp OTP fields) ───────────────────────────────

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "awaiting_otp",
  "confirmed",
  "failed",
  "cancelled",
]);

export const platformEnum = pgEnum("platform", ["flipkart", "instamart", "blinkit"]);

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
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("card"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
  },
  (table) => [index("order_userId_idx").on(table.userId)],
);

export const orderHistory = pgTable("order_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  platform: platformEnum("platform").notNull(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  amount: integer("amount").notNull(),
  status: orderStatusEnum("status").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull().default("card"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("order_history_userId_idx").on(table.userId)]);

// Temp OTP session — one-time fields for confirm_order, TTL 10m
export const orderPaymentSession = pgTable("order_payment_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: text("order_id").notNull().unique().references(() => order.id, { onDelete: "cascade" }),
  sbiTransactionId: text("sbi_transaction_id").notNull(),
  sbiNonce: text("sbi_nonce").notNull(),
  sbiTimestamp: text("sbi_timestamp").notNull(),
  sbiSignature: text("sbi_signature").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [index("order_payment_session_orderId_idx").on(table.orderId)]);

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
  orderHistory: many(orderHistory),
  wallet: one(wallet),
  walletHistory: many(walletHistory),
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

export const walletHistoryRelations = relations(walletHistory, ({ one }) => ({
  user: one(user, { fields: [walletHistory.userId], references: [user.id] }),
}));

export const orderRelations = relations(order, ({ one }) => ({
  user: one(user, { fields: [order.userId], references: [user.id] }),
}));

export const orderHistoryRelations = relations(orderHistory, ({ one }) => ({
  user: one(user, { fields: [orderHistory.userId], references: [user.id] }),
}));

export const orderPaymentSessionRelations = relations(orderPaymentSession, ({ one }) => ({
  order: one(order, { fields: [orderPaymentSession.orderId], references: [order.id] }),
}));

// ── User Addresses (multiple per user, e.g. Home, Office) ─────────────

export const userAddress = pgTable("user_address", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  label: text("label").notNull().default("Home"), // "Home", "Office", etc.
  recipientName: text("recipient_name").notNull(),
  recipientPhone: text("recipient_phone").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  landmark: text("landmark"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  pincode: text("pincode").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [index("user_address_userId_idx").on(table.userId)]);

export const userAddressRelations = relations(userAddress, ({ one }) => ({
  user: one(user, { fields: [userAddress.userId], references: [user.id] }),
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
export type WalletHistory = typeof walletHistory.$inferSelect
export type Order = typeof order.$inferSelect
export type OrderHistory = typeof orderHistory.$inferSelect
export type OrderPaymentSession = typeof orderPaymentSession.$inferSelect
export type ApiKey = typeof apiKey.$inferSelect
export type UserAddress = typeof userAddress.$inferSelect
export type NewUserAddress = typeof userAddress.$inferInsert
export type NewOrder = typeof order.$inferInsert
export type OrderStatus = Order["status"]
export type Platform = Order["platform"]

