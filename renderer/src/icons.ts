import {
  SparklesIcon,
  ScissorIcon,
  QuillWrite02Icon,
  Globe02Icon,
  BulbIcon,
  ReplyAll as ReplyAllIcon,
  ClipboardCheckIcon,
  TextWrapIcon,
  MagicWand01Icon,
  Mail01Icon,
  Notebook01Icon,
  SourceCodeCircleIcon,
  TerminalIcon,
  StarIcon,
  PencilEdit01Icon,
} from '@hugeicons/core-free-icons'

/**
 * Named registry for preset icons. Stored as a string in user settings —
 * users pick from a fixed set. Falls back to Sparkles if missing.
 */
export const PRESET_ICONS = {
  sparkles: SparklesIcon,
  scissor: ScissorIcon,
  quill: QuillWrite02Icon,
  globe: Globe02Icon,
  bulb: BulbIcon,
  reply: ReplyAllIcon,
  check: ClipboardCheckIcon,
  wrap: TextWrapIcon,
  wand: MagicWand01Icon,
  mail: Mail01Icon,
  notebook: Notebook01Icon,
  code: SourceCodeCircleIcon,
  terminal: TerminalIcon,
  star: StarIcon,
  edit: PencilEdit01Icon,
} as const

export type PresetIconName = keyof typeof PRESET_ICONS

export const PRESET_ICON_OPTIONS: { name: PresetIconName; label: string }[] = [
  { name: 'sparkles', label: 'Sparkles' },
  { name: 'scissor',  label: 'Scissor' },
  { name: 'quill',    label: 'Quill' },
  { name: 'globe',    label: 'Globe' },
  { name: 'bulb',     label: 'Bulb' },
  { name: 'reply',    label: 'Reply' },
  { name: 'check',    label: 'Check' },
  { name: 'wrap',     label: 'Wrap' },
  { name: 'wand',     label: 'Wand' },
  { name: 'mail',     label: 'Mail' },
  { name: 'notebook', label: 'Notebook' },
  { name: 'code',     label: 'Code' },
  { name: 'terminal', label: 'Terminal' },
  { name: 'star',     label: 'Star' },
  { name: 'edit',     label: 'Edit' },
]

export function getPresetIcon(name: string | undefined) {
  if (!name) return PRESET_ICONS.sparkles
  return (PRESET_ICONS as Record<string, typeof SparklesIcon>)[name] ?? PRESET_ICONS.sparkles
}
