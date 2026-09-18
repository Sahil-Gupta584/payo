# Payo MCP Server (`apps/mcp`)

Dedicated long-running Node.js & Express server for Payo's Model Context Protocol (MCP) service and browser automation.

## Features
- **MCP Protocol**: Full JSON-RPC 2.0 endpoint at `POST /mcp`.
- **Browser Automation**: Powered by Solari (`@solarisdk/browser`) for Blinkit, Flipkart, and Swiggy Instamart checkout.
- **Direct SBI 3DS/ACS OTP**: Headless, instant OTP settlement via direct HTTPS requests.
- **Shared DB**: Reuses `@repo/db` across the monorepo for atomic wallet debits and order tracking.
- **Docker-Ready**: Complete Dockerfile with Chromium dependencies for Railway, Fly.io, Render, or VPS deployment.

## Development

```bash
cd apps/mcp
cp .env.example .env
npm run dev
```

Server will run on `http://localhost:4000`.

## Endpoints

- `GET /health` — Health check
- `POST /mcp` — JSON-RPC MCP endpoint (requires `Authorization: Bearer YOUR_PAYO_API_KEY`)
