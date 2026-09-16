import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc } from '#/orpc/client'
import { Copy, Trash2, Key, Plus } from 'lucide-react'

export const Route = createFileRoute('/_protected/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const { data: keys = [], isLoading } = useQuery(orpc.apiKeys.list.queryOptions())

  const createMut = useMutation(
    orpc.apiKeys.create.mutationOptions({
      onSuccess: (data) => {
        setNewKey(data.key)
        setName('')
        qc.invalidateQueries({ queryKey: orpc.apiKeys.list.key() })
      },
    }),
  )

  const revokeMut = useMutation(
    orpc.apiKeys.revoke.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: orpc.apiKeys.list.key() }),
    }),
  )

  const copyOpencode = (key: string) => {
    const snippet = `opencode mcp add payo --url ${window.location.origin}/mcp --header "Authorization=Bearer ${key}"`
    navigator.clipboard.writeText(snippet)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage your API keys for the Payo MCP.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Key className="h-4 w-4" /> API Keys
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Create a key and add it to your OpenCode CLI config. Keys are shown once — copy immediately.
        </p>

        <div className="mt-4 flex gap-2">
          <input
            placeholder="Key name (e.g. opencode)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600"
          />
          <button
            onClick={() => createMut.mutate({ name: name || 'default' })}
            disabled={createMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Create
          </button>
        </div>

        {newKey && (
          <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950/40 p-3">
            <p className="text-xs font-medium text-emerald-400">New key — copy now, you won&apos;t see it again</p>
            <code className="mt-1 block break-all rounded bg-black px-2 py-1.5 text-xs text-emerald-300">{newKey}</code>
            <button
              onClick={() => copyOpencode(newKey)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-800 bg-emerald-900/40 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-900/60"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied === newKey ? 'Copied!' : 'Copy opencode command'}
            </button>
          </div>
        )}

        <div className="mt-6 space-y-2">
          {isLoading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-zinc-500">No keys yet. Create one above.</p>
          ) : (
            keys.map((k: any) => (
              <div
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-white">{k.name}</p>
                  <p className="text-xs text-zinc-500">
                    Created {new Date(k.createdAt).toLocaleDateString()} · Last used{' '}
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'never'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => revokeMut.mutate({ id: k.id })}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-red-400"
                    title="Revoke"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 rounded-lg bg-black p-3">
          <p className="text-xs font-medium text-zinc-400">OpenCode config example</p>
          <pre className="mt-1 overflow-x-auto text-xs text-zinc-500">
            {`opencode mcp add payo --url ${typeof window !== 'undefined' ? window.location.origin : 'https://payo.so'}/mcp \\\n  --header "Authorization=Bearer YOUR_KEY"`}
          </pre>
        </div>
      </div>
    </div>
  )
}
