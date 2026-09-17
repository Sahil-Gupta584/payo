import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc } from '#/orpc/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Badge } from '#/components/ui/badge'
import { Separator } from '#/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import {
  User,
  Key,
  MapPin,
  Copy,
  Trash2,
  Plus,
  CheckCircle2,
  Loader2,
  Phone,
  Building,
  Home,
  Briefcase,
  AlertCircle,
} from 'lucide-react'

export const Route = createFileRoute('/_protected/settings')({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search.tab === 'string' ? search.tab : undefined,
  }),
  component: SettingsPage,
})

function SettingsPage() {
  const { user } = Route.useRouteContext()
  const { tab } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const currentTab = tab || 'general'

  const setTab = (newTab: string) => {
    navigate({ search: { tab: newTab } })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account profile, API credentials, and delivery addresses.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Left Vertical Tabs */}
        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          <TabButton
            active={currentTab === 'general'}
            onClick={() => setTab('general')}
            icon={<User className="h-4 w-4" />}
            label="General"
          />
          <TabButton
            active={currentTab === 'api-keys'}
            onClick={() => setTab('api-keys')}
            icon={<Key className="h-4 w-4" />}
            label="API Keys"
          />
          <TabButton
            active={currentTab === 'addresses'}
            onClick={() => setTab('addresses')}
            icon={<MapPin className="h-4 w-4" />}
            label="Addresses"
          />
        </nav>

        {/* Right Content Area */}
        <div className="min-w-0">
          {currentTab === 'general' && <GeneralTab user={user} />}
          {currentTab === 'api-keys' && <ApiKeysTab />}
          {currentTab === 'addresses' && <AddressesTab />}
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left w-full whitespace-nowrap ${
        active
          ? 'bg-white text-foreground font-semibold shadow-xs border border-border'
          : 'text-muted-foreground hover:bg-white/70 hover:text-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

// -----------------------------------------------------------------------------
// 1. General Tab (Profile & Edit Name)
// -----------------------------------------------------------------------------
function GeneralTab({ user }: { user: any }) {
  const [name, setName] = useState(user.name ?? '')
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const updateMut = useMutation(
    orpc.user.updateName.mutationOptions({
      onSuccess: () => {
        setSavedSuccess(true)
        setErrorMsg(null)
        setTimeout(() => setSavedSuccess(false), 3000)
      },
      onError: (err: any) => {
        setErrorMsg(err.message || 'Failed to update name')
        setSavedSuccess(false)
      },
    }),
  )

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('Name cannot be empty')
      return
    }
    updateMut.mutate({ name: name.trim() })
  }

  const initials = (name || user.email || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profile Information</CardTitle>
          <CardDescription>Update your personal details and display name.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {user.image && <AvatarImage src={user.image} alt={name} />}
                <AvatarFallback className="text-base">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user.email}</p>
                <Badge variant="outline" className="mt-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[11px]">
                  Verified Account
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <label htmlFor="name-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Display Name
              </label>
              <Input
                id="name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="max-w-md"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <Input
                value={user.email}
                disabled
                className="max-w-md opacity-60 cursor-not-allowed bg-muted/50"
              />
              <p className="text-[11px] text-muted-foreground">
                Email address cannot be changed (used for passwordless magic links).
              </p>
            </div>

            {savedSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs font-medium text-emerald-500 border border-emerald-500/20 max-w-md">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Profile name updated successfully!</span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-xs font-medium text-red-500 border border-red-500/20 max-w-md">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button type="submit" disabled={updateMut.isPending} size="sm">
              {updateMut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Account Identifier</CardTitle>
          <CardDescription>Your unique user reference for platform orders and DB records.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3 font-mono text-xs max-w-md">
            <span className="truncate text-muted-foreground">{user.id}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={() => navigator.clipboard.writeText(user.id)}
              title="Copy User ID"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 2. API Keys Tab
// -----------------------------------------------------------------------------
function ApiKeysTab() {
  const qc = useQueryClient()
  const [keyName, setKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [copiedSnippet, setCopiedSnippet] = useState(false)

  const { data: keys = [], isLoading } = useQuery(orpc.apiKeys.list.queryOptions())

  const createMut = useMutation(
    orpc.apiKeys.create.mutationOptions({
      onSuccess: (data) => {
        setNewKey(data.key)
        setKeyName('')
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
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://payo.so'
    const snippet = `opencode mcp add payo --url ${origin}/mcp --header "Authorization=Bearer ${key}"`
    navigator.clipboard.writeText(snippet)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const copyClaudeJson = (key: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://payo.so'
    const json = JSON.stringify(
      {
        mcpServers: {
          payo: {
            type: 'http',
            url: `${origin}/mcp`,
            headers: {
              Authorization: `Bearer ${key}`,
            },
          },
        },
      },
      null,
      2,
    )
    navigator.clipboard.writeText(json)
    setCopiedSnippet(true)
    setTimeout(() => setCopiedSnippet(false), 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Keys</CardTitle>
          <CardDescription>
            Generate Bearer tokens for your MCP clients (Claude Desktop, OpenCode CLI, Cursor).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Create API Key Form */}
          <div className="flex gap-2">
            <Input
              placeholder="Key label (e.g. claude-desktop, work-laptop)"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              className="max-w-md"
            />
            <Button
              onClick={() => createMut.mutate({ name: keyName || 'default' })}
              disabled={createMut.isPending}
            >
              {createMut.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-4 w-4" />
              )}
              Create Key
            </Button>
          </div>

          {/* New Key Reveal Banner */}
          {newKey && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>API Key generated — Copy it now. You won&apos;t be able to view it again!</span>
              </div>
              <code className="mt-2 block break-all rounded-md bg-black/60 p-2.5 font-mono text-xs text-emerald-300">
                {newKey}
              </code>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50"
                  onClick={() => copyOpencode(newKey)}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {copiedKey === newKey ? 'Copied CLI Command!' : 'Copy OpenCode CLI Command'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/50"
                  onClick={() => copyClaudeJson(newKey)}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  {copiedSnippet ? 'Copied JSON Config!' : 'Copy Claude Desktop JSON'}
                </Button>
              </div>
            </div>
          )}

          {/* Keys list */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Keys
            </h3>
            {isLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading keys...
              </div>
            ) : keys.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No API keys created yet. Create one above to connect your agent.
              </p>
            ) : (
              <div className="divide-y divide-border rounded-lg border">
                {keys.map((k: any) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between p-3.5 hover:bg-muted/20 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-semibold">{k.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(k.createdAt).toLocaleDateString()} · Last used{' '}
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Revoke key "${k.name}"? This action cannot be undone.`)) {
                            revokeMut.mutate({ id: k.id })
                          }
                        }}
                        disabled={revokeMut.isPending}
                        title="Revoke key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Claude Desktop Config Instructions */}
      <Card className="border-border/60 bg-secondary/20">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Claude Desktop Configuration</CardTitle>
          <CardDescription>
            Add this to your <code className="text-xs">claude_desktop_config.json</code>:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-black/60 p-4 font-mono text-xs text-foreground/80">{`{
  "mcpServers": {
    "payo": {
      "type": "http",
      "url": "${typeof window !== 'undefined' ? window.location.origin : 'https://payo.so'}/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}</pre>
        </CardContent>
      </Card>
    </div>
  )
}

// -----------------------------------------------------------------------------
// 3. Addresses Tab (Manage Delivery Addresses)
// -----------------------------------------------------------------------------
function AddressesTab() {
  const qc = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)

  const { data: addresses = [], isLoading } = useQuery(orpc.addresses.list.queryOptions())

  const deleteMut = useMutation(
    orpc.addresses.delete.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: orpc.addresses.list.key() }),
    }),
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Delivery Addresses</CardTitle>
            <CardDescription>
              Saved destinations for autonomous quick-commerce shopping (Blinkit, Flipkart, etc.).
            </CardDescription>
          </div>
          {!showAddForm && (
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Address
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Address Form Accordion/Panel */}
          {showAddForm && (
            <AddAddressForm
              onClose={() => setShowAddForm(false)}
              onSuccess={() => {
                setShowAddForm(false)
                qc.invalidateQueries({ queryKey: orpc.addresses.list.key() })
              }}
            />
          )}

          {/* Address List */}
          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading addresses...
            </div>
          ) : addresses.length === 0 && !showAddForm ? (
            <div className="flex flex-col items-center justify-center py-10 text-center border rounded-xl border-dashed">
              <div className="rounded-full bg-secondary/80 p-3 text-muted-foreground mb-3">
                <MapPin className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold">No addresses saved yet</h4>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                AI shopping agents need a valid delivery address and coordinates to fulfill grocery and product orders.
              </p>
              <Button size="sm" className="mt-4" onClick={() => setShowAddForm(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add your first address
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {addresses.map((addr: any) => (
                <div
                  key={addr.id}
                  className="relative rounded-xl border border-border/70 bg-card/60 p-4 transition-all hover:border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                        {addr.label.toLowerCase() === 'home' ? (
                          <Home className="h-3.5 w-3.5 text-primary" />
                        ) : addr.label.toLowerCase() === 'office' ? (
                          <Briefcase className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Building className="h-3.5 w-3.5 text-primary" />
                        )}
                        {addr.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete address "${addr.label}"?`)) {
                            deleteMut.mutate({ id: addr.id })
                          }
                        }}
                        disabled={deleteMut.isPending}
                        title="Delete address"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-foreground">
                    {addr.recipientName}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" />
                    +91 {addr.recipientPhone}
                  </p>

                  <div className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
                    <p>{addr.line1}</p>
                    {addr.line2 && <p>{addr.line2}</p>}
                    {addr.landmark && <p className="italic text-[11px]">Landmark: {addr.landmark}</p>}
                    <p className="font-medium text-foreground/80 mt-0.5">
                      {addr.city}, {addr.state} - {addr.pincode}
                    </p>
                  </div>

                  {/* Lat/Long indicator */}
                  <div className="mt-3 flex items-center gap-1 rounded bg-secondary/60 px-2 py-1 text-[10px] text-muted-foreground font-mono">
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    <span>
                      {addr.latitude}, {addr.longitude}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AddAddressForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [label, setLabel] = useState('Home')
  const [recipientName, setRecipientName] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [landmark, setLandmark] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const createMut = useMutation(
    orpc.addresses.create.mutationOptions({
      onSuccess: () => {
        onSuccess()
      },
      onError: (err: any) => {
        setErrorMsg(err.message || 'Failed to create address')
      },
    }),
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!recipientName.trim()) {
      setErrorMsg('Recipient name is required')
      return
    }
    if (recipientPhone.trim().length < 10) {
      setErrorMsg('Enter a valid 10-digit phone number')
      return
    }
    if (!line1.trim()) {
      setErrorMsg('Address line 1 is required')
      return
    }
    if (!city.trim() || !state.trim() || !pincode.trim()) {
      setErrorMsg('City, state, and pincode are required')
      return
    }
    if (!latitude.trim() || !longitude.trim()) {
      setErrorMsg('Latitude and longitude coordinates are required for quick-commerce store routing')
      return
    }

    createMut.mutate({
      label,
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      line1: line1.trim(),
      line2: line2.trim() || undefined,
      landmark: landmark.trim() || undefined,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      latitude: latitude.trim(),
      longitude: longitude.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-primary/30 bg-secondary/20 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">New Delivery Address</h3>
        <div className="flex items-center gap-1.5">
          {['Home', 'Office', 'Other'].map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLabel(l)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                label === l ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Recipient Name *</label>
          <Input
            placeholder="Recipient full name"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Phone Number *</label>
          <Input
            placeholder="10-digit mobile number"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, ''))}
            maxLength={10}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Flat / House No. / Building / Floor *</label>
        <Input
          placeholder="e.g. Flat 302, Building 4B, Sunrise Heights"
          value={line1}
          onChange={(e) => setLine1(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Street / Sector / Area</label>
          <Input
            placeholder="e.g. Indiranagar, Sector 14"
            value={line2}
            onChange={(e) => setLine2(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Landmark (Optional)</label>
          <Input
            placeholder="e.g. Near Metro Station"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">City *</label>
          <Input
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">State *</label>
          <Input
            placeholder="State"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Pincode *</label>
          <Input
            placeholder="6-digit pincode"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            maxLength={6}
          />
        </div>
      </div>

      {/* Geocoding coordinates */}
      <div className="rounded-lg bg-black/40 p-3 space-y-2 border border-border/50">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>Coordinates (required by Blinkit & Flipkart store routers)</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Latitude (e.g. 19.1851092)"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            className="font-mono text-xs"
          />
          <Input
            placeholder="Longitude (e.g. 72.9949806)"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
      </div>


      {errorMsg && (
        <div className="text-xs text-red-400 bg-red-950/20 border border-red-500/30 p-2.5 rounded-lg">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={createMut.isPending}>
          {createMut.isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...
            </>
          ) : (
            'Save Address'
          )}
        </Button>
      </div>
    </form>
  )
}
