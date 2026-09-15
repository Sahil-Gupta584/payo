import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { user } = Route.useRouteContext()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">Welcome back, {user.name ?? user.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Wallet balance" value="$0.00" />
        <StatCard label="Orders placed" value="0" />
        <StatCard label="API key" value="Not generated" />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-1 text-sm font-semibold">MCP Setup</h2>
        <p className="mb-4 text-xs text-zinc-400">Add this to your Claude Desktop config to start shopping with your agent.</p>
        <pre className="overflow-x-auto rounded-lg bg-black p-4 text-xs text-zinc-300">{`{
  "mcpServers": {
    "payi": {
      "type": "http",
      "url": "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}</pre>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-1 text-sm font-semibold">Top up wallet</h2>
        <p className="text-xs text-zinc-400">Coming soon — Dodo Payments integration.</p>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}
