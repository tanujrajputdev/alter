import React, { useState, useEffect, useCallback } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  SparklesIcon,
  TimeQuarter02Icon,
  Settings01Icon,
  Key01Icon,
  Search01Icon,
  PinLocation01Icon,
  PinOffIcon,
  PencilEdit01Icon,
  Delete02Icon,
  PlusSignIcon,
  ViewIcon,
  ViewOffIcon,
  ArrowRight02Icon,
  TickDouble01Icon,
  AlertCircleIcon,
  Cancel01Icon,
  InformationCircleIcon,
  Shield01Icon,
  ShieldUserIcon,
  ClipboardPasteIcon,
  Tick01Icon,
  ComputerIcon,
  Mouse02Icon,
} from '@hugeicons/core-free-icons'
import type { Settings, Preset, RecentTransform } from '../types'
import { getPresetIcon, PRESET_ICON_OPTIONS, type PresetIconName } from '../icons'

type Tab = 'presets' | 'history' | 'settings' | 'keys'

export default function Dashboard() {
  const params = new URLSearchParams(window.location.search)
  const initialTab = (params.get('tab') as Tab) || 'settings'

  const [tab, setTab]                     = useState<Tab>(initialTab)
  const [settings, setSettings]           = useState<Settings | null>(null)
  const [apiKey, setApiKey]               = useState('')
  const [accessibility, setAccessibility] = useState<boolean | null>(null)

  const reload = useCallback(() => {
    Promise.all([
      window.electronAPI.getSettings(),
      window.electronAPI.getApiKey(),
      window.electronAPI.checkAccessibility(),
    ]).then(([s, k, a]) => {
      setSettings(s)
      setApiKey(k ?? '')
      setAccessibility(a)
    })
  }, [])

  useEffect(() => { reload() }, [reload])

  if (!settings) return <div style={S.loading}>Loading…</div>

  return (
    <div style={S.root}>
      <div style={S.titleBar} className="drag-handle" />

      <div style={S.layout}>
        <aside style={S.sidebar}>
          <div style={S.brand}>
            <div style={S.wordmark}>alter</div>
            <div style={S.tagline}>Copy. Command. Paste.</div>
          </div>

          <nav style={S.nav}>
            <NavItem icon={SparklesIcon}      label="Presets"  active={tab === 'presets'}  onClick={() => setTab('presets')} />
            <NavItem icon={TimeQuarter02Icon} label="History"  active={tab === 'history'}  onClick={() => setTab('history')} />
            <NavItem icon={Settings01Icon}    label="Settings" active={tab === 'settings'} onClick={() => setTab('settings')} />
            <NavItem icon={Key01Icon}         label="API Key"  active={tab === 'keys'}     onClick={() => setTab('keys')} />
          </nav>

          <div style={S.proTip}>
            <div style={S.proTipTitle}>
              <HugeiconsIcon icon={SparklesIcon} size={11} strokeWidth={1.8} color="var(--text-1)" />
              Pro tip
            </div>
            <div style={S.proTipBody}>
              Press <span className="kbd">⌥</span> <span className="kbd">Space</span> anywhere to summon the HUD.
            </div>
          </div>
        </aside>

        <main style={S.content} className="fade-in" key={tab}>
          <div style={S.contentInner}>
            {tab === 'presets'  && <PresetsTab  settings={settings} reload={reload} />}
            {tab === 'history'  && <HistoryTab  history={settings.recentTransforms ?? []} />}
            {tab === 'settings' && <SettingsTab settings={settings} reload={reload} accessibility={accessibility} />}
            {tab === 'keys'     && <KeysTab     initialKey={apiKey} onSaved={reload} />}
          </div>
        </main>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// SETTINGS — the marquee page
// ────────────────────────────────────────────────────────────────────────────

function SettingsTab({
  settings, reload, accessibility
}: { settings: Settings; reload: () => void; accessibility: boolean | null }) {
  const [model, setModel]   = useState(settings.model)
  const [appCtx, setAppCtx] = useState(settings.appContextEnabled)
  const [launch, setLaunch] = useState(settings.launchAtLogin)
  const [saved, setSaved]   = useState(false)
  const dirty = model !== settings.model ||
                appCtx !== settings.appContextEnabled ||
                launch !== settings.launchAtLogin

  const handleSave = async () => {
    await window.electronAPI.saveSettings({
      model, appContextEnabled: appCtx, launchAtLogin: launch
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
    reload()
  }

  return (
    <div>
      <h1 style={S.pageTitle}>Settings</h1>

      <SectionLabel icon={Shield01Icon}>PERMISSIONS</SectionLabel>
      <Card>
        <PermRow
          icon={accessibility ? Tick01Icon : AlertCircleIcon}
          status={accessibility ? 'granted' : 'pending'}
          title="Accessibility"
          desc="Lets Alter paste at your cursor after a transform. Required."
          action={!accessibility ? {
            label: 'Open System Settings',
            onClick: async () => { await window.electronAPI.requestAccessibility(); setTimeout(reload, 600) }
          } : undefined}
        />
        <Divider />
        <PermRow
          icon={ComputerIcon}
          status="info"
          title="Hotkey"
          desc="Global ⌥ Space summons the HUD from any app."
          hint="DEFAULT"
        />
        <Divider />
        <PermRow
          icon={SparklesIcon}
          status="info"
          title="App-aware tone"
          desc="Drafts in Mail get email tone. Chats in Slack stay casual. Code stays code."
          hint={appCtx ? 'ON' : 'OFF'}
          rightSlot={
            <Toggle checked={appCtx} onChange={setAppCtx} />
          }
        />
      </Card>

      <SectionLabel icon={Settings01Icon}>MODEL</SectionLabel>
      <Card>
        <div style={S.fieldRow}>
          <div style={{ flex: 1 }}>
            <div style={S.fieldTitle}>Groq model</div>
            <div style={S.fieldDesc}>Higher quality models are slower. The default balances both.</div>
          </div>
          <select style={S.select} value={model} onChange={e => setModel(e.target.value)}>
            <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
            <option value="llama-3.1-70b-versatile">llama-3.1-70b-versatile</option>
            <option value="llama3-8b-8192">llama3-8b-8192 (fast)</option>
            <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
          </select>
        </div>
      </Card>

      <SectionLabel icon={ComputerIcon}>SYSTEM</SectionLabel>
      <Card>
        <PermRow
          icon={ComputerIcon}
          status="info"
          title="Launch at login"
          desc="Open Alter silently when you log in. Lives in your menu bar."
          rightSlot={<Toggle checked={launch} onChange={setLaunch} />}
        />
      </Card>

      {dirty && (
        <div style={S.stickyBar}>
          <span style={{ fontSize: 12, color: 'var(--text-2)' }}>You have unsaved changes</span>
          <button style={S.primaryBtn} onClick={handleSave}>
            {saved
              ? <><HugeiconsIcon icon={TickDouble01Icon} size={13} strokeWidth={2.4} color="#fff" /> Saved</>
              : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// PRESETS
// ────────────────────────────────────────────────────────────────────────────

function PresetsTab({ settings, reload }: { settings: Settings; reload: () => void }) {
  const [editing, setEditing] = useState<Preset | null>(null)
  const presets = settings.presets ?? []
  const pinnedCount = presets.filter(p => p.pinned).length

  const handleSave = async (preset: Omit<Preset, 'id'> & { id?: string }) => {
    await window.electronAPI.savePreset(preset)
    setEditing(null)
    reload()
  }

  return (
    <div>
      <div style={S.pageHeader}>
        <h1 style={S.pageTitle}>Presets</h1>
        <button
          style={S.primaryBtn}
          onClick={() => setEditing({ id: '', name: '', icon: 'sparkles', command: '', pinned: false })}
        >
          <HugeiconsIcon icon={PlusSignIcon} size={13} strokeWidth={2.4} color="#fff" />
          New preset
        </button>
      </div>
      <p style={S.pageSub}>
        {presets.length} {presets.length === 1 ? 'preset' : 'presets'} ·{' '}
        {pinnedCount}/4 pinned to the HUD
      </p>

      <SectionLabel icon={PinLocation01Icon}>PINNED · QUICK PICKS</SectionLabel>
      <Card padding={0}>
        {presets.filter(p => p.pinned).map((p, i, arr) => (
          <React.Fragment key={p.id}>
            <PresetRow
              preset={p}
              onEdit={() => setEditing(p)}
              onDelete={async () => { await window.electronAPI.deletePreset(p.id); reload() }}
              onTogglePin={async () => { await window.electronAPI.togglePinPreset(p.id); reload() }}
            />
            {i < arr.length - 1 && <Divider />}
          </React.Fragment>
        ))}
        {presets.filter(p => p.pinned).length === 0 && (
          <div style={S.emptyRow}>No pins yet — pin up to 4 below.</div>
        )}
      </Card>

      <SectionLabel icon={SparklesIcon}>ALL PRESETS</SectionLabel>
      <Card padding={0}>
        {presets.filter(p => !p.pinned).map((p, i, arr) => (
          <React.Fragment key={p.id}>
            <PresetRow
              preset={p}
              onEdit={() => setEditing(p)}
              onDelete={async () => { await window.electronAPI.deletePreset(p.id); reload() }}
              onTogglePin={async () => { await window.electronAPI.togglePinPreset(p.id); reload() }}
            />
            {i < arr.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </Card>

      {editing && (
        <PresetEditor
          preset={editing}
          onCancel={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

function PresetRow({
  preset, onEdit, onDelete, onTogglePin
}: {
  preset: Preset
  onEdit: () => void
  onDelete: () => void
  onTogglePin: () => void
}) {
  const Icon = getPresetIcon(preset.icon)
  return (
    <div style={S.rowFlex}>
      <span style={S.rowIconBadge}>
        <HugeiconsIcon icon={Icon} size={16} strokeWidth={1.8} color="var(--text-0)" />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.rowTitle}>{preset.name}</div>
        <div style={S.rowDesc}>{preset.command}</div>
      </div>
      <div style={S.rowActions}>
        <IconBtn icon={preset.pinned ? PinLocation01Icon : PinOffIcon}
                 label={preset.pinned ? 'Unpin' : 'Pin'}
                 active={preset.pinned}
                 onClick={onTogglePin} />
        <IconBtn icon={PencilEdit01Icon} label="Edit" onClick={onEdit} />
        {!preset.builtin && (
          <IconBtn icon={Delete02Icon} label="Delete" danger onClick={onDelete} />
        )}
      </div>
    </div>
  )
}

function PresetEditor({
  preset, onCancel, onSave
}: {
  preset: Preset
  onCancel: () => void
  onSave: (p: Omit<Preset, 'id'> & { id?: string }) => void
}) {
  const [name, setName]       = useState(preset.name)
  const [icon, setIcon]       = useState<string>(preset.icon || 'sparkles')
  const [command, setCommand] = useState(preset.command)
  const [pinned, setPinned]   = useState(preset.pinned)

  const canSave = name.trim() && command.trim()

  return (
    <div style={S.modalBackdrop} onClick={onCancel}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>{preset.id ? 'Edit preset' : 'New preset'}</h2>
          <button style={S.modalClose} onClick={onCancel}>
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.8} color="var(--text-2)" />
          </button>
        </div>

        <Field label="Icon">
          <div style={S.iconPicker}>
            {PRESET_ICON_OPTIONS.map(opt => {
              const Icon = getPresetIcon(opt.name)
              const active = icon === opt.name
              return (
                <button
                  key={opt.name}
                  type="button"
                  onClick={() => setIcon(opt.name as PresetIconName)}
                  style={{
                    width: 36, height: 36,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 9,
                    background: active ? 'var(--text-0)' : 'var(--surface-1)',
                    border: `0.5px solid ${active ? 'var(--text-0)' : 'var(--border-medium)'}`,
                    cursor: 'pointer',
                  }}
                  title={opt.label}
                >
                  <HugeiconsIcon icon={Icon} size={16} strokeWidth={1.8}
                    color={active ? '#fff' : 'var(--text-1)'} />
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Name">
          <input
            style={S.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Polish email"
            autoFocus
          />
        </Field>

        <Field label="Command (what to tell the AI)">
          <textarea
            style={{ ...S.input, minHeight: 84, resize: 'vertical' }}
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder="Rewrite this as a professional, warm email reply…"
          />
        </Field>

        <label style={S.checkboxRow}>
          <input
            type="checkbox"
            checked={pinned}
            onChange={e => setPinned(e.target.checked)}
            style={S.checkbox}
          />
          <span>Pin to HUD quick-picks (max 4)</span>
        </label>

        <div style={S.modalActions}>
          <button style={S.secondaryBtn} onClick={onCancel}>Cancel</button>
          <button
            style={{ ...S.primaryBtn, opacity: canSave ? 1 : 0.4 }}
            disabled={!canSave}
            onClick={() => onSave({
              id: preset.id || undefined,
              name: name.trim(),
              icon,
              command: command.trim(),
              pinned,
              builtin: preset.builtin
            })}
          >
            {preset.id ? 'Save changes' : 'Create preset'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// HISTORY
// ────────────────────────────────────────────────────────────────────────────

function HistoryTab({ history }: { history: RecentTransform[] }) {
  const [query, setQuery] = useState('')

  const safe = history.filter(Boolean).map(h => ({
    id:            h.id ?? `${h.timestamp ?? 0}-${Math.random()}`,
    command:       h.command ?? '',
    inputSnippet:  h.inputSnippet ?? '',
    resultSnippet: h.resultSnippet ?? '',
    appContext:    h.appContext,
    timestamp:     h.timestamp ?? Date.now(),
  }))

  const filtered = safe.filter(h => {
    if (!query) return true
    const q = query.toLowerCase()
    return h.command.toLowerCase().includes(q) ||
           h.inputSnippet.toLowerCase().includes(q) ||
           h.resultSnippet.toLowerCase().includes(q)
  })

  return (
    <div>
      <h1 style={S.pageTitle}>History</h1>
      <p style={S.pageSub}>
        {safe.length} recent {safe.length === 1 ? 'transform' : 'transforms'} · stored locally
      </p>

      <div style={S.searchRow}>
        <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={1.8} color="var(--text-3)" />
        <input
          style={S.searchInput}
          placeholder="Search transforms…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div style={S.emptyState}>
          <HugeiconsIcon icon={InformationCircleIcon} size={22} strokeWidth={1.6} color="var(--text-3)" />
          <div style={{ marginTop: 12 }}>
            {safe.length === 0
              ? 'No transforms yet — press ⌥ Space to make your first one.'
              : 'No matches for that search.'}
          </div>
        </div>
      ) : (
        <Card padding={0}>
          {filtered.map((t, i) => (
            <React.Fragment key={t.id}>
              <HistoryRow item={t} />
              {i < filtered.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Card>
      )}
    </div>
  )
}

function HistoryRow({ item }: { item: RecentTransform }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ ...S.rowCol, cursor: 'pointer' }} onClick={() => setExpanded(v => !v)}>
      <div style={S.historyTop}>
        <span style={S.historyCmd}>{item.command || '(no command)'}</span>
        <span style={S.historyTime}>{relativeTime(new Date(item.timestamp))}</span>
      </div>
      {item.appContext && (
        <div style={{ marginBottom: 4 }}>
          <span style={S.tag}>{item.appContext}</span>
        </div>
      )}
      <div style={S.historyBody}>
        <div style={S.historyKVRow}>
          <span style={S.historyKey}>FROM</span>
          <span style={S.historyVal}>{expanded ? item.inputSnippet : truncate(item.inputSnippet, 90)}</span>
        </div>
        <div style={S.historyKVRow}>
          <span style={S.historyKey}>TO</span>
          <span style={{ ...S.historyVal, color: 'var(--text-0)', fontWeight: 500 }}>
            {expanded ? item.resultSnippet : truncate(item.resultSnippet, 90)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// API KEY
// ────────────────────────────────────────────────────────────────────────────

function KeysTab({ initialKey, onSaved }: { initialKey: string; onSaved: () => void }) {
  const [key, setKey]         = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  const hasKey = initialKey.length > 0
  const masked = hasKey ? `gsk_••••${initialKey.slice(-4)}` : ''

  const handleSave = async () => {
    if (key && !key.startsWith('gsk_')) {
      setError('Groq keys start with "gsk_"')
      return
    }
    if (!key) return
    setError('')
    setSaving(true)
    try {
      await window.electronAPI.setApiKey(key)
      setKey('')
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    await window.electronAPI.deleteApiKey()
    onSaved()
  }

  return (
    <div>
      <h1 style={S.pageTitle}>API Key</h1>
      <p style={S.pageSub}>Stored encrypted in your macOS Keychain. Never leaves your machine.</p>

      <SectionLabel icon={Key01Icon}>GROQ API KEY</SectionLabel>
      <Card>
        <div style={S.keyCardInner}>
          {hasKey ? (
            <div style={S.keyConnectedRow}>
              <span style={S.connectedDot} />
              <span style={S.connectedLabel}>Connected</span>
              <span style={S.maskedKey}>{showKey ? initialKey : masked}</span>
              <div style={S.keyConnectedActions}>
                <button style={S.linkAction} onClick={() => setShowKey(v => !v)}>
                  <HugeiconsIcon icon={showKey ? ViewOffIcon : ViewIcon} size={13} strokeWidth={1.8} color="currentColor" />
                  {showKey ? 'Hide' : 'Show'}
                </button>
                <button style={{ ...S.linkAction, color: 'var(--danger)' }} onClick={handleRemove}>Remove</button>
              </div>
            </div>
          ) : (
            <div style={S.emptyKey}>
              <HugeiconsIcon icon={AlertCircleIcon} size={16} strokeWidth={1.8} color="var(--warning)" />
              <span>No key on file. Add one below to enable transforms.</span>
            </div>
          )}

          <div style={S.keyInputRow}>
            <input
              style={{ ...S.input, flex: 1, minWidth: 0, fontFamily: 'var(--font-mono)' }}
              type="password"
              value={key}
              onChange={e => { setKey(e.target.value); setError('') }}
              placeholder={hasKey ? 'Paste a new key to replace' : 'gsk_••••••••••••••••••••'}
            />
            <button
              style={{
                ...S.primaryBtn,
                opacity: saving || !key ? 0.4 : 1,
                background: saved ? 'var(--success)' : undefined,
                flexShrink: 0,
              }}
              onClick={handleSave}
              disabled={saving || !key}
            >
              {saving ? 'Saving…' : saved
                ? <><HugeiconsIcon icon={TickDouble01Icon} size={13} strokeWidth={2.4} color="#fff" /> Saved</>
                : 'Save'}
            </button>
          </div>
          {error && (
            <p style={S.fieldError}>
              <HugeiconsIcon icon={AlertCircleIcon} size={12} strokeWidth={1.8} color="var(--danger)" />
              {error}
            </p>
          )}
          <p style={S.muted}>
            Get a free API key →{' '}
            <a href="https://console.groq.com/keys">console.groq.com/keys</a>
          </p>
        </div>
      </Card>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Building blocks
// ────────────────────────────────────────────────────────────────────────────

function Card({ children, padding = 0 }: { children: React.ReactNode; padding?: number }) {
  return (
    <div style={{
      background: 'var(--surface-1)',
      border: '0.5px solid var(--border-soft)',
      borderRadius: 16,
      boxShadow: 'var(--shadow-xs)',
      padding,
      overflow: 'hidden',
      marginBottom: 24,
    }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 0, borderTop: '0.5px solid var(--border-soft)' }} />
}

function SectionLabel({ icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div style={S.sectionLabel}>
      <HugeiconsIcon icon={icon} size={12} strokeWidth={1.8} color="var(--text-2)" />
      {children}
    </div>
  )
}

function PermRow({
  icon, status, title, desc, action, hint, rightSlot
}: {
  icon: any
  status: 'granted' | 'pending' | 'recommended' | 'info'
  title: string
  desc: string
  action?: { label: string; onClick: () => void }
  hint?: string
  rightSlot?: React.ReactNode
}) {
  const badge = status === 'granted'
    ? { label: 'GRANTED', color: 'var(--success-ink)', bg: 'var(--success-soft)' }
    : status === 'pending'
    ? { label: 'REQUIRED', color: 'var(--warning)', bg: 'var(--warning-soft)' }
    : status === 'recommended'
    ? { label: hint || 'RECOMMENDED', color: 'var(--text-2)', bg: 'var(--surface-3)' }
    : { label: hint || '', color: 'var(--text-2)', bg: 'var(--surface-3)' }

  const iconBg = status === 'granted' ? 'var(--success-soft)'
              : status === 'pending'  ? 'var(--warning-soft)'
              : 'var(--surface-3)'
  const iconColor = status === 'granted' ? 'var(--success)'
                  : status === 'pending'  ? 'var(--warning)'
                  : 'var(--text-1)'

  return (
    <div style={S.permRow}>
      <span style={{
        ...S.permIconBadge,
        background: iconBg,
        border: '0.5px solid ' + (status === 'granted' ? 'rgba(17,122,77,0.18)'
                               : status === 'pending'  ? 'rgba(165,90,20,0.18)'
                               : 'var(--border-soft)'),
      }}>
        <HugeiconsIcon icon={icon} size={16} strokeWidth={2} color={iconColor} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.permRowTop}>
          <span style={S.permTitle}>{title}</span>
          {badge.label && (
            <span style={{ ...S.statusPill, color: badge.color, background: badge.bg }}>
              {badge.label}
            </span>
          )}
        </div>
        <div style={S.permDesc}>{desc}</div>
        {action && (
          <button style={S.pillBtn} onClick={action.onClick}>{action.label}</button>
        )}
      </div>
      {rightSlot && <div style={{ flexShrink: 0 }}>{rightSlot}</div>}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 38, height: 22, borderRadius: 12,
        background: checked ? 'var(--text-0)' : 'var(--surface-3)',
        border: 'none',
        position: 'relative',
        transition: 'background 0.15s ease',
        flexShrink: 0,
        cursor: 'pointer',
      }}
    >
      <span style={{
        position: 'absolute',
        top: 2, left: checked ? 18 : 2,
        width: 18, height: 18,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.15s ease',
      }} />
    </button>
  )
}

function NavItem({ icon, label, active, onClick }: {
  icon: any; label: string; active: boolean; onClick: () => void
}) {
  const [hover, setHover] = useState(false)
  const showHover = hover && !active
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="no-drag"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: active ? 'var(--text-0)' : 'var(--text-1)',
        background: active ? 'var(--surface-1)' : showHover ? 'var(--canvas-soft)' : 'transparent',
        border: active ? '0.5px solid var(--border-medium)' : '0.5px solid transparent',
        boxShadow: active ? 'var(--shadow-xs)' : 'none',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        width: '100%',
      }}
    >
      <HugeiconsIcon icon={icon} size={14} strokeWidth={1.8}
        color={active ? 'var(--text-0)' : 'var(--text-2)'} />
      <span>{label}</span>
    </button>
  )
}

function IconBtn({ icon, label, onClick, active, danger }: {
  icon: any; label: string; onClick: () => void; active?: boolean; danger?: boolean
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28,
        borderRadius: 7,
        background: active ? 'var(--text-0)' : hover ? 'var(--surface-3)' : 'transparent',
        color: active ? '#fff' : danger ? 'var(--danger)' : 'var(--text-2)',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.12s ease',
      }}
    >
      <HugeiconsIcon icon={icon} size={13} strokeWidth={1.8} color="currentColor" />
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return date.toLocaleDateString()
}

function truncate(str: string, n: number) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  root: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--canvas)',
    color: 'var(--text-0)',
    overflow: 'hidden',
  },
  titleBar: { height: 38, flexShrink: 0, background: 'transparent' },
  loading: { padding: 24, fontSize: 13, color: 'var(--text-2)' },

  layout: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '240px 1fr',
    overflow: 'hidden',
  },
  sidebar: {
    padding: '4px 14px 16px',
    display: 'flex',
    flexDirection: 'column',
    background: 'transparent',
  },
  brand: {
    padding: '8px 10px 20px',
    borderBottom: '0.5px solid var(--border-soft)',
    marginBottom: 14,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.04em',
    fontFamily: 'var(--font-display)',
    color: 'var(--text-0)',
  },
  tagline: {
    fontSize: 11,
    color: 'var(--text-2)',
    marginTop: 4,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  proTip: {
    marginTop: 12,
    padding: '12px 14px',
    background: 'var(--surface-1)',
    border: '0.5px solid var(--border-soft)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-xs)',
  },
  proTipTitle: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 11, fontWeight: 600,
    color: 'var(--text-1)',
    marginBottom: 6,
  },
  proTipBody: {
    fontSize: 11.5,
    color: 'var(--text-2)',
    lineHeight: 1.55,
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },

  content: {
    overflowY: 'auto',
  },
  contentInner: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '8px 40px 80px',
  },

  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: '-0.025em',
    color: 'var(--text-0)',
    fontFamily: 'var(--font-display)',
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 12.5,
    color: 'var(--text-2)',
    marginBottom: 28,
  },

  sectionLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-2)',
    letterSpacing: '0.08em',
    marginBottom: 12,
  },

  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    fontSize: 12.5,
    fontWeight: 600,
    borderRadius: 10,
    background: 'var(--text-0)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.12s ease',
  },
  secondaryBtn: {
    padding: '8px 14px',
    fontSize: 12.5,
    fontWeight: 500,
    borderRadius: 10,
    background: 'var(--surface-1)',
    color: 'var(--text-0)',
    border: '0.5px solid var(--border-medium)',
    boxShadow: 'var(--shadow-xs)',
    cursor: 'pointer',
  },
  pillBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: '7px 14px',
    fontSize: 12,
    fontWeight: 500,
    borderRadius: 999,
    background: 'var(--surface-1)',
    border: '0.5px solid var(--border-medium)',
    color: 'var(--text-0)',
    cursor: 'pointer',
  },
  linkAction: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-1)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 6px',
    borderRadius: 6,
  },

  // Rows used inside cards
  permRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '16px 18px',
  },
  permIconBadge: {
    width: 32, height: 32,
    borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  permRowTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  permTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-0)',
    letterSpacing: '-0.01em',
  },
  permDesc: {
    fontSize: 12.5,
    color: 'var(--text-2)',
    lineHeight: 1.55,
  },
  statusPill: {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: '0.08em',
    padding: '3px 8px',
    borderRadius: 5,
  },

  rowFlex: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 18px',
  },
  rowCol: {
    display: 'flex',
    flexDirection: 'column',
    padding: '14px 18px',
  },
  rowIconBadge: {
    width: 36, height: 36,
    borderRadius: 10,
    background: 'var(--surface-3)',
    border: '0.5px solid var(--border-soft)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: 600,
    color: 'var(--text-0)',
    marginBottom: 2,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  rowDesc: {
    fontSize: 11.5,
    color: 'var(--text-2)',
    lineHeight: 1.55,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
  rowActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },

  // Model row
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '16px 18px',
  },
  fieldTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-0)',
    marginBottom: 2,
  },
  fieldDesc: {
    fontSize: 11.5,
    color: 'var(--text-2)',
    lineHeight: 1.55,
  },
  select: {
    padding: '8px 12px',
    fontSize: 12.5,
    borderRadius: 10,
    background: 'var(--surface-1)',
    border: '0.5px solid var(--border-medium)',
    color: 'var(--text-0)',
    cursor: 'pointer',
    minWidth: 240,
    fontWeight: 500,
  },

  // Sticky save bar
  stickyBar: {
    position: 'sticky',
    bottom: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 14px 10px 18px',
    background: 'var(--surface-1)',
    border: '0.5px solid var(--border-medium)',
    borderRadius: 12,
    boxShadow: 'var(--shadow-md)',
    marginTop: 12,
  },

  // Empty/info rows
  emptyRow: {
    padding: '20px 18px',
    fontSize: 12,
    color: 'var(--text-2)',
    textAlign: 'center',
  },
  emptyState: {
    padding: '52px 20px',
    textAlign: 'center',
    fontSize: 12.5,
    color: 'var(--text-2)',
    background: 'var(--surface-1)',
    borderRadius: 16,
    border: '0.5px dashed var(--border-medium)',
  },

  // Modal
  modalBackdrop: {
    position: 'fixed', inset: 0,
    background: 'var(--surface-overlay)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    width: 460,
    background: 'var(--surface-1)',
    border: '0.5px solid var(--border-medium)',
    borderRadius: 16,
    padding: 24,
    boxShadow: 'var(--shadow-lg)',
  },
  modalHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: { fontSize: 16, fontWeight: 600, color: 'var(--text-0)' },
  modalClose: {
    width: 28, height: 28, borderRadius: 7,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--surface-2)', border: '0.5px solid var(--border-soft)',
    cursor: 'pointer',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 18,
  },

  fieldLabel: {
    fontSize: 11, fontWeight: 600,
    color: 'var(--text-1)',
    letterSpacing: '0.04em',
    marginBottom: 6,
    display: 'block',
  },
  fieldError: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11.5, color: 'var(--danger)', marginTop: 6,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 13,
    borderRadius: 10,
    background: 'var(--surface-1)',
    border: '0.5px solid var(--border-medium)',
    color: 'var(--text-0)',
    boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.02)',
  },
  iconPicker: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  checkbox: { accentColor: 'var(--text-0)' },
  checkboxRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 12.5, color: 'var(--text-1)',
    marginTop: 6,
  },

  muted: { fontSize: 11.5, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.6 },

  // Search
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 16px',
    borderRadius: 12,
    background: 'var(--surface-1)',
    border: '0.5px solid var(--border-medium)',
    marginBottom: 14,
    boxShadow: 'var(--shadow-xs)',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    background: 'transparent',
    color: 'var(--text-0)',
    padding: '2px 4px',
  },

  // History
  historyTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  historyCmd: { fontSize: 13, fontWeight: 600, color: 'var(--text-0)' },
  historyTime: { fontSize: 11, color: 'var(--text-3)' },
  historyBody: { display: 'flex', flexDirection: 'column', gap: 2 },
  historyKVRow: { display: 'flex', gap: 10, fontSize: 12, lineHeight: 1.6, padding: '2px 0' },
  historyKey: {
    fontSize: 9.5, fontWeight: 700,
    color: 'var(--text-3)',
    width: 34, flexShrink: 0,
    letterSpacing: '0.06em',
    marginTop: 2,
  },
  historyVal: { color: 'var(--text-1)', flex: 1 },
  tag: {
    display: 'inline-block',
    fontSize: 10, fontWeight: 600,
    padding: '2px 7px', borderRadius: 4,
    background: 'var(--surface-3)',
    color: 'var(--text-1)',
    letterSpacing: '0.02em',
  },

  // Key tab
  keyCardInner: {
    padding: '16px 18px',
    minWidth: 0,
  },
  keyConnectedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    background: 'var(--surface-2)',
    border: '0.5px solid var(--border-soft)',
    borderRadius: 10,
    minWidth: 0,
  },
  connectedDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'var(--success)',
    boxShadow: '0 0 0 3px var(--success-soft)',
    flexShrink: 0,
  },
  connectedLabel: {
    fontSize: 12.5, fontWeight: 600,
    color: 'var(--text-0)',
    flexShrink: 0,
  },
  maskedKey: {
    flex: 1,
    minWidth: 0,
    fontSize: 12.5,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-1)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  keyConnectedActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
  },
  keyInputRow: {
    marginTop: 14,
    display: 'flex',
    gap: 8,
    minWidth: 0,
  },
  emptyKey: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 14px',
    fontSize: 12.5,
    color: 'var(--text-1)',
    background: 'var(--warning-soft)',
    border: '0.5px solid rgba(165,90,20,0.18)',
    borderRadius: 10,
  },
}
