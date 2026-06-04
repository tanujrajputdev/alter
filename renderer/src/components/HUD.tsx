import React, { useState, useEffect, useRef, useCallback } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ClipboardIcon,
  ArrowRight02Icon,
  TickDouble01Icon,
  AlertCircleIcon,
  Search01Icon,
  Settings01Icon,
  PinLocation01Icon,
  RotateClockwiseIcon,
  ClipboardCopyIcon,
  ClipboardPasteIcon,
  Loading03Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons'
import type { HudState, Preset, Settings } from '../types'
import { getPresetIcon } from '../icons'

export default function HUD() {
  const [clipboardText, setClipboardText]   = useState('')
  const [command, setCommand]               = useState('')
  const [state, setState]                   = useState<HudState>('idle')
  const [result, setResult]                 = useState('')
  const [errorMsg, setErrorMsg]             = useState('')
  const [progress, setProgress]             = useState(0)
  const [appContext, setAppContext]         = useState<string | null>(null)
  const [presets, setPresets]               = useState<Preset[]>([])
  const [showAllPresets, setShowAllPresets] = useState(false)
  const [pasteNotice, setPasteNotice]       = useState(false)

  const inputRef    = useRef<HTMLInputElement>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rootRef     = useRef<HTMLDivElement>(null)

  // ── Setup ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    window.electronAPI.getSettings().then((s: Settings) => setPresets(s.presets ?? []))

    const unsub = window.electronAPI.onHudShow(({ clipboardText: t, appContext: ctx }) => {
      setClipboardText(t)
      setAppContext(ctx)
      setCommand('')
      setResult('')
      setErrorMsg('')
      setShowAllPresets(false)
      setPasteNotice(false)
      setState(t ? 'populated' : 'idle')
      window.electronAPI.getSettings().then((s: Settings) => setPresets(s.presets ?? []))
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        rootRef.current?.classList.remove('hud-enter')
        void rootRef.current?.offsetWidth
        rootRef.current?.classList.add('hud-enter')
      })
    })

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAllPresets) setShowAllPresets(false)
        else window.electronAPI.hideHud()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowAllPresets(v => !v)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && state === 'result') {
        e.preventDefault()
        handleAccept()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => { unsub(); window.removeEventListener('keydown', onKey) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, result, showAllPresets])

  // Resize HUD by state
  useEffect(() => {
    let h = 210
    if (state === 'result') h = 360
    else if (state === 'error') h = 230
    else if (showAllPresets) h = 410
    window.electronAPI.resizeHud(h)
  }, [state, showAllPresets])

  // ── Progress ──────────────────────────────────────────────────────────────

  const startProgress = useCallback(() => {
    setProgress(0)
    let val = 0
    progressRef.current = setInterval(() => {
      val = Math.min(val + (Math.random() * 4), 88)
      setProgress(val)
    }, 80)
  }, [])

  const stopProgress = useCallback(() => {
    if (progressRef.current) clearInterval(progressRef.current)
    setProgress(100)
  }, [])

  // ── Transform ─────────────────────────────────────────────────────────────

  const runTransform = useCallback(async (cmd: string) => {
    if (!clipboardText.trim() || !cmd.trim()) return
    setShowAllPresets(false)
    setCommand(cmd)
    setState('loading')
    startProgress()
    try {
      const res = await window.electronAPI.transformText(clipboardText, cmd)
      stopProgress()
      if (res.success && res.result) {
        setResult(res.result)
        setState('result')
      } else {
        setErrorMsg(res.error ?? 'Something went wrong.')
        setState('error')
      }
    } catch {
      stopProgress()
      setErrorMsg('Could not reach Groq. Check your internet connection.')
      setState('error')
    }
  }, [clipboardText, startProgress, stopProgress])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (command.trim()) runTransform(command)
  }

  const handleAccept = async () => {
    const res = await window.electronAPI.acceptResult(result)
    if (!res?.accessibility) {
      // HUD already hid — re-show with a clear notice
      setPasteNotice(true)
    }
  }

  const handleCopy = async () => {
    await window.electronAPI.setClipboard(result)
  }

  const handleRetry = () => {
    setState('populated')
    setResult('')
    setErrorMsg('')
    setPasteNotice(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isEmpty       = !clipboardText
  const isLoading     = state === 'loading'
  const pinnedPresets = presets.filter(p => p.pinned).slice(0, 4)
  const showCommandUI = state === 'idle' || state === 'populated'

  return (
    <div ref={rootRef} style={s.root} className="hud-enter">
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <HugeiconsIcon icon={ClipboardIcon} size={13} strokeWidth={1.8} color="var(--text-2)" />
          <span style={s.sourceLabel}>
            {isEmpty ? 'Clipboard is empty — copy text first' : truncate(clipboardText, 64)}
          </span>
        </div>
        <div style={s.headerRight}>
          {appContext && !isEmpty && (
            <span style={s.contextBadge} title={`Context: ${appContext}`}>
              <span style={s.contextDot} />
              {appContext}
            </span>
          )}
          <span className="kbd">esc</span>
        </div>
      </div>

      {/* Command input */}
      {showCommandUI && (
        <form onSubmit={handleSubmit} style={s.inputRow}>
          <HugeiconsIcon icon={Search01Icon} size={15} strokeWidth={1.8} color="var(--text-3)" />
          <input
            ref={inputRef}
            style={s.cmdInput}
            value={command}
            onChange={e => setCommand(e.target.value)}
            placeholder={isEmpty ? 'Copy some text, then press ⌥ Space' : 'Tell me what to do…'}
            disabled={isEmpty}
            autoFocus
          />
          {command.trim() && (
            <button type="submit" style={s.submitBtn} aria-label="Run transform">
              <span style={s.submitChip}>
                <HugeiconsIcon icon={ArrowRight02Icon} size={11} strokeWidth={2} color="var(--accent)" />
              </span>
            </button>
          )}
        </form>
      )}

      {/* Pinned chips */}
      {showCommandUI && !isEmpty && !showAllPresets && (
        <div style={s.chipsRow}>
          {pinnedPresets.map(p => (
            <Chip
              key={p.id}
              iconName={p.icon}
              label={p.name}
              onClick={() => runTransform(p.command)}
            />
          ))}
          <button style={s.moreBtn} onClick={() => setShowAllPresets(true)}>
            <span>All presets</span>
            <span className="kbd">⌘K</span>
          </button>
        </div>
      )}

      {/* Preset library */}
      {showCommandUI && showAllPresets && (
        <div style={s.presetGrid}>
          {presets.map(p => (
            <PresetCard
              key={p.id}
              preset={p}
              onClick={() => runTransform(p.command)}
            />
          ))}
          <button
            onClick={() => window.electronAPI.openDashboard('presets')}
            style={s.editPresets}
          >
            <HugeiconsIcon icon={Settings01Icon} size={12} strokeWidth={1.8} color="var(--text-2)" />
            Manage presets in Dashboard
            <HugeiconsIcon icon={ArrowRight02Icon} size={11} strokeWidth={1.8} color="var(--text-2)" />
          </button>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <>
          <div style={s.loadingHint}>
            <HugeiconsIcon icon={Loading03Icon} size={13} strokeWidth={2} color="var(--accent)"
              style={{ animation: 'spin 0.9s linear infinite' }} />
            <span>Transforming…</span>
            <span style={s.loadingCmd}>{truncate(command, 44)}</span>
          </div>
          <div style={s.loadingBar}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'var(--text-0)',
              borderRadius: 2,
              transition: 'width 0.08s linear',
            }} />
          </div>
        </>
      )}

      {/* Result */}
      {state === 'result' && (
        <div style={s.resultBody}>
          <div style={s.resultLabel}>
            <HugeiconsIcon icon={TickDouble01Icon} size={12} strokeWidth={2.4} color="var(--success)" />
            <span>READY TO PASTE</span>
            <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-3)', letterSpacing: 0 }}>
              {result.length} chars
            </span>
          </div>
          <div style={s.resultText}>{result}</div>

          {pasteNotice && (
            <div style={s.pasteNotice}>
              <HugeiconsIcon icon={InformationCircleIcon} size={13} strokeWidth={1.8} color="var(--warning)" />
              <span>
                Result is on your clipboard. Auto-paste needs Accessibility access —
                <button style={s.linkInline} onClick={() => window.electronAPI.requestAccessibility()}>
                  enable it
                </button>
                or press ⌘V to paste.
              </span>
            </div>
          )}

          <div style={s.actions}>
            <ActionButton primary onClick={handleAccept} icon={ClipboardPasteIcon}>
              Accept & Paste
              <span className="kbd" style={{ background: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.2)', color: '#fff', boxShadow: 'none' }}>⌘↵</span>
            </ActionButton>
            <ActionButton onClick={handleCopy} icon={ClipboardCopyIcon}>Copy</ActionButton>
            <ActionButton onClick={handleRetry} icon={RotateClockwiseIcon}>Try again</ActionButton>
          </div>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div style={s.errorBody}>
          <div style={s.errorText}>
            <HugeiconsIcon icon={AlertCircleIcon} size={14} strokeWidth={1.8} color="var(--danger)" />
            <span>{errorMsg}</span>
          </div>
          <div style={s.actions}>
            <ActionButton onClick={handleRetry} icon={RotateClockwiseIcon}>Try again</ActionButton>
            <ActionButton onClick={() => window.electronAPI.openDashboard('keys')} icon={Settings01Icon}>
              Open Dashboard
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chip({ iconName, label, onClick }: { iconName: string; label: string; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  const Icon = getPresetIcon(iconName)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 500,
        padding: '6px 11px 6px 9px',
        borderRadius: 8,
        border: `0.5px solid ${hover ? 'var(--accent)' : 'var(--border-medium)'}`,
        background: hover ? 'var(--accent-soft)' : 'var(--surface-1)',
        color: hover ? 'var(--accent-pressed)' : 'var(--text-0)',
        transition: 'all 0.12s ease',
        cursor: 'pointer',
        boxShadow: hover ? 'none' : 'var(--shadow-xs)',
      }}
    >
      <HugeiconsIcon icon={Icon} size={13} strokeWidth={1.8}
        color={hover ? 'var(--accent)' : 'var(--text-1)'} />
      {label}
    </button>
  )
}

function PresetCard({ preset, onClick }: { preset: Preset; onClick: () => void }) {
  const [hover, setHover] = useState(false)
  const Icon = getPresetIcon(preset.icon)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 9,
        background: hover ? 'var(--accent-soft)' : 'var(--surface-1)',
        border: `0.5px solid ${hover ? 'var(--accent)' : 'var(--border-soft)'}`,
        cursor: 'pointer',
        transition: 'all 0.12s ease',
        textAlign: 'left',
        boxShadow: hover ? 'none' : 'var(--shadow-xs)',
      }}
    >
      <span style={{
        width: 28, height: 28,
        borderRadius: 7,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? '#fff' : 'var(--surface-2)',
        border: '0.5px solid var(--border-soft)',
        flexShrink: 0,
      }}>
        <HugeiconsIcon icon={Icon} size={15} strokeWidth={1.8}
          color={hover ? 'var(--accent)' : 'var(--text-1)'} />
      </span>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-0)', marginBottom: 2 }}>
          {preset.name}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--text-2)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {preset.command}
        </div>
      </div>
      {preset.pinned && (
        <HugeiconsIcon icon={PinLocation01Icon} size={11} strokeWidth={2} color="var(--accent)" />
      )}
    </button>
  )
}

function ActionButton({
  children, onClick, primary, icon
}: {
  children: React.ReactNode
  onClick: () => void
  primary?: boolean
  icon?: any
}) {
  const [hover, setHover] = useState(false)
  const base: React.CSSProperties = primary ? {
    background: hover ? 'var(--accent-hover)' : 'var(--accent)',
    color: '#fff',
    border: '0.5px solid var(--accent-pressed)',
    boxShadow: hover ? '0 4px 14px var(--accent-glow)' : '0 1px 2px rgba(0,0,0,0.08)',
    fontWeight: 600,
  } : {
    background: hover ? 'var(--surface-2)' : 'var(--surface-1)',
    color: 'var(--text-0)',
    border: '0.5px solid var(--border-medium)',
    fontWeight: 500,
    boxShadow: 'var(--shadow-xs)',
  }
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: primary ? 1.7 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        padding: '9px 12px',
        borderRadius: 9,
        fontSize: 12.5,
        transition: 'all 0.12s ease',
        cursor: 'pointer',
        ...base,
      }}
    >
      {icon && (
        <HugeiconsIcon icon={icon} size={13} strokeWidth={1.8}
          color={primary ? '#fff' : 'var(--text-1)'} />
      )}
      {children}
    </button>
  )
}

function truncate(str: string, maxLen: number): string {
  if (!str) return ''
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  root: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    background: '#ffffff',
    border: '0.5px solid rgba(15, 15, 25, 0.12)',
    boxShadow: '0 24px 60px rgba(15, 15, 25, 0.18), 0 6px 20px rgba(15, 15, 25, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    color: 'var(--text-0)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    borderBottom: '0.5px solid var(--border-soft)',
    minHeight: 38,
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: 8,
    flex: 1, overflow: 'hidden',
    fontSize: 11.5, fontWeight: 500,
    color: 'var(--text-2)',
  },
  sourceLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  contextBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 10.5,
    fontWeight: 500,
    color: 'var(--accent-pressed)',
    padding: '3px 8px',
    borderRadius: 6,
    background: 'var(--accent-soft)',
    border: '0.5px solid var(--border-medium)',
  },
  contextDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: 'var(--accent)',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '13px 18px',
    borderBottom: '0.5px solid var(--border-soft)',
  },
  cmdInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: 400,
    background: 'transparent',
    color: 'var(--text-0)',
    caretColor: 'var(--accent)',
    letterSpacing: '-0.01em',
    padding: '2px 4px',
  },
  submitBtn: { padding: 0, background: 'transparent', border: 'none' },
  submitChip: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, borderRadius: 6,
    background: 'var(--accent-soft)',
  },
  chipsRow: {
    padding: '10px 12px 12px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  moreBtn: {
    marginLeft: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    fontSize: 11,
    fontWeight: 500,
    color: 'var(--text-2)',
    borderRadius: 8,
    border: '0.5px solid var(--border-soft)',
    background: 'transparent',
  },
  presetGrid: {
    padding: '10px 12px 12px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
    overflowY: 'auto',
    flex: 1,
  },
  editPresets: {
    gridColumn: '1 / -1',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '9px',
    fontSize: 11.5,
    fontWeight: 500,
    color: 'var(--text-2)',
    borderRadius: 8,
    border: '0.5px dashed var(--border-medium)',
    background: 'transparent',
    cursor: 'pointer',
  },
  loadingHint: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 16px',
    fontSize: 12.5,
    fontWeight: 500,
    color: 'var(--text-1)',
  },
  loadingCmd: {
    marginLeft: 'auto',
    color: 'var(--text-3)',
    fontSize: 11,
    fontFamily: 'var(--font-mono)',
  },
  loadingBar: {
    height: 2,
    background: 'var(--surface-3)',
    overflow: 'hidden',
  },
  resultBody: {
    padding: '12px 16px 14px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  resultLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--success)',
    marginBottom: 10,
  },
  resultText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 1.6,
    color: 'var(--text-0)',
    marginBottom: 12,
    overflowY: 'auto',
    padding: '2px',
    letterSpacing: '-0.005em',
    userSelect: 'text',
    cursor: 'text',
  },
  pasteNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '8px 10px',
    fontSize: 11.5,
    color: 'var(--warning)',
    background: 'var(--warning-soft)',
    border: '0.5px solid rgba(217,119,6,0.2)',
    borderRadius: 8,
    lineHeight: 1.5,
    marginBottom: 10,
  },
  linkInline: {
    color: 'var(--accent)',
    fontWeight: 600,
    padding: '0 4px',
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  },
  errorBody: {
    padding: '14px 16px',
  },
  errorText: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    fontSize: 12.5,
    lineHeight: 1.55,
    color: 'var(--danger)',
    marginBottom: 12,
    padding: '10px 12px',
    borderRadius: 8,
    background: 'var(--danger-soft)',
    border: '0.5px solid rgba(220,38,38,0.18)',
  },
  actions: {
    display: 'flex',
    gap: 6,
  },
}
