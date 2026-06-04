import React, { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ClipboardPasteIcon,
  Key01Icon,
  ShieldUserIcon,
  TickDouble01Icon,
  ArrowRight02Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons'

type Step = 'welcome' | 'apikey' | 'permission' | 'done'

export default function Onboarding() {
  const [step, setStep]       = useState<Step>('welcome')
  const [apiKey, setApiKey]   = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const handleSaveKey = async () => {
    if (!apiKey.startsWith('gsk_') || apiKey.length < 20) {
      setError('Groq keys start with "gsk_" — get one free at console.groq.com/keys')
      return
    }
    setSaving(true)
    setError('')
    try {
      await window.electronAPI.setApiKey(apiKey.trim())
      setStep('permission')
    } catch {
      setError('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={S.root}>
      <div style={S.titleBar} className="drag-handle" />

      <div style={S.body}>
        {step === 'welcome' && (
          <div className="fade-in" style={S.center}>
            <div style={S.brandMark}>
              <HugeiconsIcon icon={ClipboardPasteIcon} size={26} strokeWidth={1.8} color="#fff" />
            </div>
            <h1 style={S.title}>Alter</h1>
            <p style={S.tagline}>
              AI that lives in your clipboard.<br />
              Press <span className="kbd">⌥</span> <span className="kbd">Space</span> from
              anywhere to transform what you just copied.
            </p>

            <div style={S.demoRow}>
              <DemoStep n={1} label="Copy text" />
              <Arrow />
              <DemoStep n={2} label="⌥ Space" />
              <Arrow />
              <DemoStep n={3} label="Tell it what to do" />
              <Arrow />
              <DemoStep n={4} label="Auto-pasted" highlight />
            </div>

            <button style={S.primary} onClick={() => setStep('apikey')}>
              Get started · 60 seconds
              <HugeiconsIcon icon={ArrowRight02Icon} size={13} strokeWidth={2} color="#fff" />
            </button>
            <p style={S.smallNote}>You'll need a free Groq API key (we'll show you where).</p>
          </div>
        )}

        {step === 'apikey' && (
          <div className="fade-in">
            <div style={S.stepHead}>
              <span style={S.stepIcon}>
                <HugeiconsIcon icon={Key01Icon} size={16} strokeWidth={1.8} color="var(--accent)" />
              </span>
              <span style={S.stepBadge}>STEP 1 of 2</span>
            </div>
            <h2 style={S.h2}>Add your Groq API key</h2>
            <p style={S.desc}>
              Free at <a href="https://console.groq.com/keys">console.groq.com/keys</a>.
              Stored encrypted in your macOS Keychain — never leaves your machine
              except to talk to Groq.
            </p>

            <input
              style={S.input}
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setError('') }}
              placeholder="gsk_••••••••••••••••••••"
              onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
              autoFocus
            />
            {error && (
              <p style={S.errorText}>
                <HugeiconsIcon icon={AlertCircleIcon} size={12} strokeWidth={1.8} color="var(--danger)" />
                {error}
              </p>
            )}

            <button
              style={{ ...S.primary, opacity: saving || !apiKey ? 0.4 : 1, marginTop: 14 }}
              onClick={handleSaveKey}
              disabled={saving || !apiKey}
            >
              {saving ? 'Saving…' : (
                <>Save key <HugeiconsIcon icon={ArrowRight02Icon} size={13} strokeWidth={2} color="#fff" /></>
              )}
            </button>
          </div>
        )}

        {step === 'permission' && (
          <div className="fade-in">
            <div style={S.stepHead}>
              <span style={S.stepIcon}>
                <HugeiconsIcon icon={ShieldUserIcon} size={16} strokeWidth={1.8} color="var(--accent)" />
              </span>
              <span style={S.stepBadge}>STEP 2 of 2</span>
            </div>
            <h2 style={S.h2}>Enable auto-paste</h2>
            <p style={S.desc}>
              Alter needs Accessibility permission so it can paste the
              transformed text into your active app. Without it, the result still
              lands on your clipboard — you'd just press ⌘V manually.
            </p>

            <div style={S.permissionCard}>
              <div style={S.permRow}>
                <span style={S.permNum}>1</span>
                <span>Click <strong>Open System Settings</strong> below</span>
              </div>
              <div style={S.permRow}>
                <span style={S.permNum}>2</span>
                <span>Toggle <strong>Alter</strong> on under Accessibility</span>
              </div>
              <div style={S.permRow}>
                <span style={S.permNum}>3</span>
                <span>Come back here and continue</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button
                style={S.secondary}
                onClick={() => window.electronAPI.requestAccessibility()}
              >
                Open System Settings
              </button>
              <button style={{ ...S.primary, flex: 1 }} onClick={() => setStep('done')}>
                Continue
                <HugeiconsIcon icon={ArrowRight02Icon} size={13} strokeWidth={2} color="#fff" />
              </button>
            </div>
            <p style={S.smallNote}>
              You can skip this and grant it later from the Dashboard.
            </p>
          </div>
        )}

        {step === 'done' && (
          <div className="fade-in" style={S.center}>
            <div style={S.successMark}>
              <HugeiconsIcon icon={TickDouble01Icon} size={26} strokeWidth={2.2} color="var(--success)" />
            </div>
            <h1 style={S.title}>You're set</h1>
            <p style={S.tagline}>
              Press <span className="kbd">⌥</span> <span className="kbd">Space</span> from
              any app to summon the HUD.<br />
              Open the Dashboard from your menu bar for presets, history, and settings.
            </p>
            <button style={S.primary} onClick={() => window.close()}>
              Let's go
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DemoStep({ n, label, highlight }: { n: number; label: string; highlight?: boolean }) {
  return (
    <div style={{
      ...S.demoStep,
      borderColor: highlight ? 'var(--accent)' : 'var(--border-medium)',
      background: highlight ? 'var(--accent-soft)' : 'var(--surface-1)',
      boxShadow: highlight ? 'none' : 'var(--shadow-xs)',
    }}>
      <span style={{
        ...S.demoNum,
        background: highlight ? 'var(--accent)' : 'var(--surface-2)',
        color: highlight ? '#fff' : 'var(--text-2)',
      }}>{n}</span>
      <span style={{
        fontSize: 11,
        color: highlight ? 'var(--accent-pressed)' : 'var(--text-1)',
        fontWeight: highlight ? 600 : 500,
      }}>{label}</span>
    </div>
  )
}

function Arrow() {
  return (
    <HugeiconsIcon icon={ArrowRight02Icon} size={11} strokeWidth={1.8} color="var(--text-3)" />
  )
}

const S: Record<string, React.CSSProperties> = {
  root: {
    height: '100vh',
    background: 'var(--canvas)',
    color: 'var(--text-0)',
    display: 'flex',
    flexDirection: 'column',
  },
  titleBar: { height: 36, flexShrink: 0 },
  body: {
    flex: 1,
    padding: '22px 38px 32px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },

  brandMark: {
    width: 60, height: 60,
    margin: '0 auto 18px',
    borderRadius: 16,
    background: 'linear-gradient(135deg, #2a2620, #000000)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 12px 32px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.2)',
  },
  successMark: {
    width: 60, height: 60,
    margin: '0 auto 18px',
    borderRadius: 30,
    background: 'var(--success-soft)',
    border: '0.5px solid rgba(17,122,77,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8, color: 'var(--text-0)' },
  tagline: { fontSize: 13, color: 'var(--text-1)', lineHeight: 1.7, marginBottom: 26 },

  stepHead: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  stepIcon: {
    width: 32, height: 32, borderRadius: 9,
    background: 'var(--accent-softer)',
    border: '0.5px solid var(--border-soft)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  stepBadge: {
    fontSize: 10, fontWeight: 700,
    letterSpacing: '0.08em',
    padding: '4px 8px',
    borderRadius: 5,
    background: 'var(--accent-soft)',
    color: 'var(--accent-pressed)',
  },
  h2: { fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 10, color: 'var(--text-0)' },
  desc: {
    fontSize: 13,
    color: 'var(--text-1)',
    lineHeight: 1.7,
    marginBottom: 18,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    background: 'var(--surface-1)',
    border: '0.5px solid var(--border-medium)',
    borderRadius: 10,
    color: 'var(--text-0)',
    boxShadow: 'var(--shadow-xs)',
  },
  errorText: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 11.5,
    color: 'var(--danger)',
    marginTop: 8,
  },
  primary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: '11px 14px',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 10,
    background: 'var(--accent)',
    color: '#fff',
    border: '0.5px solid var(--accent-pressed)',
    boxShadow: '0 4px 14px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.18)',
    cursor: 'pointer',
  },
  secondary: {
    padding: '11px 16px',
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 10,
    background: 'var(--surface-1)',
    color: 'var(--text-0)',
    border: '0.5px solid var(--border-medium)',
    boxShadow: 'var(--shadow-xs)',
    cursor: 'pointer',
  },
  smallNote: {
    fontSize: 11,
    color: 'var(--text-2)',
    marginTop: 12,
    lineHeight: 1.6,
    textAlign: 'center',
  },
  demoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  demoStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '10px 8px',
    width: 80,
    borderRadius: 9,
    border: '0.5px solid',
  },
  demoNum: {
    width: 20, height: 20,
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700,
  },
  permissionCard: {
    padding: '14px',
    background: 'var(--surface-1)',
    border: '0.5px solid var(--border-soft)',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: 'var(--shadow-xs)',
  },
  permRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 12.5,
    color: 'var(--text-1)',
    lineHeight: 1.5,
  },
  permNum: {
    width: 20, height: 20,
    borderRadius: 10,
    background: 'var(--accent-soft)',
    color: 'var(--accent-pressed)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700,
    flexShrink: 0,
  },
}
