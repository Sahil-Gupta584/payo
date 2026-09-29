# Payo — Powering AI to shop online

Payo is an **MCP server** that lets AI agents (Claude, OpenCode, ChatGPT, etc.) shop online on behalf of users. The agent searches products, places orders via browser automation, and pays from the user's wallet (OTP) or cash on delivery.

```
User: "order me dark fantasy" → search_products → initiate_order → OTP → confirm_order
```

## Architecture

```
┌──────────┐      ┌─────────────────────────────────────────┐
│  Agent   │─────▶│ apps/mcp (Express, port 4000)           │
│ (Claude, │ MCP  │  POST /mcp  (Bearer API key)            │
│ OpenCode)│◀─────│  StreamableHTTP transport               │
└──────────┘      │   ├─ search_products  (QuickCommerce)   │
                  │   ├─ initiate_order   (Solari browser)  │
                  │   ├─ confirm_order    (SBI OTP submit)  │
                  │   ├─ list_orders / list_addresses       │
                  │   └─ get_wallet_balance                 │
                  └──────────────┬──────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌───────────────┐   ┌────────────────────┐   ┌────────────────────┐
│ QuickCommerce │   │ Solari browser     │   │ packages/db        │
│ API (search,  │   │ (residential IN IP)│   │ Drizzle + Postgres │
│ price verify) │   │  ├─ Blinkit       │   │ (Supabase)         │
└───────────────┘   │  │  └─ Juspay/SBI │   └────────────────────┘
                    │  └─ Zepto         │
                    │     └─ Juspay/SBI │
                    └────────────────────┘

┌─────────────────────────────────────────┐
│ apps/web (TanStack Start, port 3000)    │  Vercel (serverless)
│  Dashboard: wallet, orders, addresses,  │
│  API keys, settings                     │
│  Auth: magic link + Google (better-auth)│
│  Top-up: Dodo Payments → webhook credit │
└─────────────────────────────────────────┘
```

Long-running browser automation lives in `apps/mcp` (own host/Docker — can't run on Vercel serverless). Fast dashboard + API lives in `apps/web` (Vercel).

## What's live

| Feature | Status |
|---|---|
| Blinkit search → checkout → OTP → confirm | ✅ wallet + COD |
| Zepto search → checkout → OTP → confirm | ✅ wallet only — **COD explicitly blocked** (Zepto has no cash flow; running one would mislabel a card charge) |
| MCP tools: `search_products`, `initiate_order`, `confirm_order`, `list_orders`, `list_addresses`, `get_wallet_balance` | ✅ |
| Dashboard: wallet balance, top-up (Dodo), orders + OTP submit, addresses, API keys, total spent | ✅ |
| Auth: magic link + Google OAuth, open signup | ✅ |
| Landing: launch video (Mux Player), OG image | ✅ |
| Rich-client responses (ChatGPT): markdown + product images; CLI gets compact JSON | ✅ |

## What's disabled (code kept)

| Feature | State |
|---|---|
| Swiggy Instamart checkout | Hidden from agents (single cart per account — can't serve concurrent users). Code in `apps/mcp/src/lib/solari/instamart.ts`, untouched. |
| `wallet.topup` instant-credit route | **Deleted** (was a money-minting backdoor). Top-up is Dodo-only via webhook. |
| Invite-only signup + waitlist | Removed. Open signup; `invite` table dropped. |

## Platform notes

- **Blinkit**: per-order carts (`createOrder` → fresh cart each call, concurrent-safe). CVV must be recached (`winecellar recache`) before `makePayment` or 3DS fails. Payment phone = shared account phone from `localStorage.auth`, not the delivery phone.
- **Zepto**: client-side carts (multiple concurrent orders OK). `storeProductId` is read from the server-rendered product HTML (watch out: RSC escapes quotes as `\"`). Address is created per order via `add-address` using the user's saved details.
- **QuickCommerce `sla` is unreliable** for store open/closed status (stale cache). `available`/`inventory` is accurate. Zepto ETA falls back to 10 min when `sla` is unparseable.
- **One shared platform account per service** (Blinkit, Zepto). User delivery addresses live in our DB; payment always goes through the platform card (`PLATFORM_CARD_*`).
- **tsx `keepNames` bug**: `const f = () =>` inside `page.evaluate` breaks in-browser (`__name is not defined`). Use method-shorthand objects + plain loops, no inner arrow-consts.

## Repo map

```
apps/web/                  Dashboard + oRPC API (Vercel)
  src/routes/              index.tsx (landing), login.tsx, _protected/
  src/orpc/router/         wallet.ts, orders.ts, addresses.ts, apiKeys.ts, user.ts, waitlist.ts
  src/lib/auth.ts          better-auth (magic link + Google)
  src/components/          launch-video.tsx (Mux Player), ui/ (shadcn)
apps/mcp/                  MCP server + browser automation (long-running host)
  src/index.ts             Express + StreamableHTTPServerTransport, client detection
  src/mcp-server.ts        Tool definitions (search/order/confirm/wallet)
  src/lib/quickcommerce.ts Search + price verification (Blinkit + Zepto)
  src/lib/solari/
    index.ts               launchBrowser (IN residential proxy), step()
    blinkit.ts             Blinkit checkout flow
    zepto.ts               Zepto checkout flow (card only)
    instamart.ts           Instamart flow (disabled, kept)
    sbi-otp.ts             SBI OTP scrape + submit
  src/lib/currency.ts      INR→USD-cents, service-fee tiers
  src/lib/order-settlement.ts  Atomic wallet debit + OTP verification
packages/db/               Shared Drizzle schema + client (@repo/db)
  src/schema.ts            user, wallet_history, order, order_history,
                           order_payment_session, user_address, platform enum
```

## Setup

```bash
npm install
```

**1. Env** — copy examples and fill in:
- `apps/web/.env` → see `apps/web/.env.example` (DB, better-auth, Resend, Dodo, Google OAuth)
- `apps/mcp/.env` → see `apps/mcp/.env.example` (DB, Solari, platform card, QuickCommerce, `ZEPTO_CARD_INSTRUMENT_CODE` = saved-card code from Zepto `payment-listing-api`)

**2. Google OAuth** (Cloud Console → Credentials → Web client):
- Redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/google` (dev: `http://localhost:3000/...`, plus production URL)

**3. Database** (never `db:push`):
```bash
npm run db:generate   # from schema changes
npm run db:migrate     # apply migrations
```

**4. Solari profiles** — create profile in console, then log in via the API-launched session (profile editor uses datacenter IP and gets geo-blocked):
- Blinkit: default proxy works
- Zepto: needs `tier: 'residential'` (CloudFront 403 otherwise), then persist cookies via `client.profiles.save(profileId, storageState)`

**5. Run**:
```bash
npm run dev        # everything
npm run dev:w      # web only — port 3000
npm run dev:m      # mcp only — port 4000
```

**6. Connect an agent**:
```bash
# OpenCode (global)
opencode mcp add payo --url https://<mcp-host>/mcp --header "Authorization=Bearer YOUR_API_KEY" --global

# Claude Code
claude mcp add --transport http payo https://<mcp-host>/mcp --header "Authorization: Bearer YOUR_API_KEY" --scope user
```
API keys are created in Dashboard → Settings → API keys.

## Conventions

1. **Amounts**: all money in USD cents in DB/code (`$0.00` display). Source prices are INR via QuickCommerce, converted with live rate in `currency.ts`. Search results show INR only.
2. **MCP is COD + wallet**: `initiate_order` takes `wallet | cod`. Zepto rejects COD.
3. **Addresses**: created on dashboard only, never via MCP. Lat/lon required.
4. **No `process.env` in web** — import from `#/env`. MCP uses `src/env.ts`.
5. **Routing**: flat directory nesting (`_protected/settings.tsx`), never edit `routeTree.gen.ts` (run `generate-routes`).
6. **Forms** (3+ inputs): react-hook-form + Zod, schema at top of file.
7. **Solari**: one file per platform in `src/lib/solari/`, shared helpers in `index.ts`.
8. **Ask, don't assume** — unclear intent or multiple valid fixes → ask first.
9. **Never commit without asking.**
