'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { MessageCircle, X, ChevronLeft } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { PublicFaqItem } from '@/src/services/faq/types'
import type { PublicSiteSettings } from '@/src/services/site-settings/types'
import type { ChatMessage, QuickAction } from '@/src/lib/chat/types'
import { MailIcon, PhoneIcon, WhatsAppIcon } from '@/src/components/home/icons'
import { normalizePhoneDigits, buildWhatsAppLinkFrom } from '@/src/lib/contact-info'
import { buildQuickActions } from './quick-actions'

// Session-only: whether the attention dot has already been dismissed, so it
// doesn't reappear on every page while the visitor browses (spec item 10 —
// no history/database persistence, just enough state to not be annoying).
const ATTENTION_SEEN_KEY = 'dakar-auto-chat-attention-seen'

// Read through useSyncExternalStore rather than a setState-in-effect: the
// server snapshot (and hydration) reports "seen" so the dot never renders in
// SSR HTML, then the client snapshot takes over right after hydration.
// Blocked storage also reports "seen" — the dot just never shows, no
// functional loss. No subscription needed: in-tab dismissal is tracked by
// component state, and other tabs writing the key is irrelevant here.
function subscribeToNothing() {
  return () => {}
}
function readAttentionSeen() {
  try {
    return Boolean(sessionStorage.getItem(ATTENTION_SEEN_KEY))
  } catch {
    return true
  }
}
function attentionSeenOnServer() {
  return true
}

type Stage = 'menu' | 'faq-list' | 'faq-answer' | 'contact'

let messageSeq = 0
function nextMessageId() {
  messageSeq += 1
  return `chat-message-${messageSeq}`
}

// Public-site floating chat/help widget — guided quick actions only, no AI
// and no free-text input (spec items 1 and 8). Mounted once in
// app/(site)/layout.tsx, so it never renders inside /admin (a separate
// layout tree entirely). FAQ items and contact settings are fetched by the
// server-component layout and passed in as props rather than re-queried
// here, so this stays a plain client component with no data-fetching logic
// of its own to duplicate.
export function ChatWidget({ dict, faqItems, settings }: { dict: Dictionary['chatWidget']; faqItems: PublicFaqItem[]; settings: PublicSiteSettings }) {
  const [open, setOpen] = useState(false)
  const attentionSeen = useSyncExternalStore(subscribeToNothing, readAttentionSeen, attentionSeenOnServer)
  const [attentionDismissed, setAttentionDismissed] = useState(false)
  const showAttention = !attentionSeen && !attentionDismissed
  const [fieldFocused, setFieldFocused] = useState(false)
  const [stage, setStage] = useState<Stage>('menu')
  const [messages, setMessages] = useState<ChatMessage[]>(() => [{ id: 'welcome', role: 'assistant', content: dict.welcome }])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  const quickActions = buildQuickActions(dict)
  const hasContact = Boolean(settings.whatsapp || settings.phone || settings.email)

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  // Mobile only (applied via max-sm: below): step the launcher out of the way
  // while the visitor is typing in a page form field, where it would otherwise
  // sit on top of inputs/submit buttons above the on-screen keyboard.
  useEffect(() => {
    function isFormField(target: EventTarget | null) {
      return target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable="true"]')
    }
    function onFocusIn(event: FocusEvent) {
      if (isFormField(event.target)) setFieldFocused(true)
    }
    function onFocusOut(event: FocusEvent) {
      if (!isFormField(event.relatedTarget)) setFieldFocused(false)
    }
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
    }
  }, [])

  function openWidget() {
    setOpen(true)
    if (showAttention) {
      setAttentionDismissed(true)
      try {
        sessionStorage.setItem(ATTENTION_SEEN_KEY, '1')
      } catch {
        // Nothing to persist to if storage is unavailable — safe to ignore.
      }
    }
  }

  function close() {
    setOpen(false)
    // On mobile the launcher is display:none while the panel is open, so wait
    // for it to be shown again before returning focus to it.
    requestAnimationFrame(() => toggleRef.current?.focus())
  }

  function pushMessages(...entries: Omit<ChatMessage, 'id'>[]) {
    setMessages((prev) => [...prev, ...entries.map((entry) => ({ ...entry, id: nextMessageId() }))])
  }

  function selectFaq(item: PublicFaqItem) {
    pushMessages({ role: 'user', content: item.question }, { role: 'assistant', content: item.answer })
    setStage('faq-answer')
  }

  function selectAction(action: QuickAction) {
    if (action.kind === 'link') {
      setOpen(false)
      return
    }
    pushMessages({ role: 'user', content: action.label })
    if (action.kind === 'faq') {
      pushMessages({ role: 'assistant', content: faqItems.length > 0 ? dict.faq.intro : dict.faq.empty })
      setStage('faq-list')
    } else {
      pushMessages({ role: 'assistant', content: hasContact ? dict.contact.intro : dict.contact.empty })
      setStage('contact')
    }
  }

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        onClick={() => (open ? close() : openWidget())}
        aria-label={open ? dict.closeLabel : dict.openLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`fixed right-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-glow active:translate-y-0 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:right-6 sm:bottom-6 sm:h-14 sm:w-14 ${open ? 'ring-2 ring-accent/40 ring-offset-2 ring-offset-background max-sm:hidden' : ''} ${fieldFocused ? 'max-sm:hidden' : ''}`}
      >
        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
        {showAttention && !open && (
          <span
            aria-hidden="true"
            className="absolute top-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-accent-gold sm:h-3.5 sm:w-3.5"
          />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="animate-[fade-in_200ms_ease-out] fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-50 flex max-h-[80dvh] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card-hover outline-none sm:inset-x-auto sm:right-6 sm:bottom-24 sm:max-h-[32rem] sm:w-[23rem]"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3.5">
            <div className="min-w-0">
              <p id={titleId} className="truncate font-bold text-foreground">
                {dict.title}
              </p>
              <p className="text-xs text-muted-foreground">{dict.status}</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={dict.closeLabel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition duration-200 hover:bg-accent-soft/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              <X className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {messages.map((message) => (
              <div key={message.id} className={`flex animate-[fade-in_200ms_ease-out] ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
                    message.role === 'user' ? 'bg-accent text-accent-foreground' : 'bg-surface text-foreground'
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))}
            {messages.length === 1 && <p className="px-1 text-xs text-muted-foreground">{dict.guidedNotice}</p>}
            <div ref={messagesEndRef} />
          </div>

          <div className="max-h-56 shrink-0 overflow-y-auto border-t border-border px-4 py-2.5 sm:max-h-64">
            {stage !== 'menu' && (
              <button
                type="button"
                onClick={() => setStage('menu')}
                className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} />
                {dict.backToMenu}
              </button>
            )}

            {stage === 'menu' && (
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) =>
                  action.kind === 'link' ? (
                    <Link
                      key={action.id}
                      href={action.href}
                      onClick={() => selectAction(action)}
                      className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-medium text-foreground transition duration-200 hover:border-accent-hover hover:bg-accent-soft/50 hover:text-accent-hover"
                    >
                      <action.icon className="h-4 w-4 shrink-0 text-accent" />
                      <span className="truncate">{action.label}</span>
                    </Link>
                  ) : (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => selectAction(action)}
                      className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-left text-xs font-medium text-foreground transition duration-200 hover:border-accent-hover hover:bg-accent-soft/50 hover:text-accent-hover"
                    >
                      <action.icon className="h-4 w-4 shrink-0 text-accent" />
                      <span className="truncate">{action.label}</span>
                    </button>
                  ),
                )}
              </div>
            )}

            {stage === 'faq-list' && (
              <div className="space-y-1.5">
                {faqItems.map((item) => (
                  <button
                    key={item.question}
                    type="button"
                    onClick={() => selectFaq(item)}
                    className="block w-full rounded-xl border border-border px-3 py-2.5 text-left text-xs font-medium text-foreground transition duration-200 hover:border-accent-hover hover:bg-accent-soft/50 hover:text-accent-hover"
                  >
                    {item.question}
                  </button>
                ))}
                <Link href="/faq" onClick={() => setOpen(false)} className="block px-1 pt-1 text-xs font-semibold text-accent hover:text-accent-hover">
                  {dict.faq.viewAll}
                </Link>
              </div>
            )}

            {stage === 'faq-answer' && (
              <Link href="/faq" onClick={() => setOpen(false)} className="block px-1 text-xs font-semibold text-accent hover:text-accent-hover">
                {dict.faq.viewAll}
              </Link>
            )}

            {stage === 'contact' && hasContact && (
              <div className="flex flex-wrap gap-2">
                {settings.whatsapp && (
                  <a
                    href={buildWhatsAppLinkFrom(settings.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium transition duration-200 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400"
                  >
                    <WhatsAppIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    {dict.contact.whatsapp}
                  </a>
                )}
                {settings.phone && (
                  <a
                    href={`tel:${normalizePhoneDigits(settings.phone)}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium transition duration-200 hover:border-blue-500/40 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <PhoneIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    {dict.contact.phone}
                  </a>
                )}
                {settings.email && (
                  <a
                    href={`mailto:${settings.email}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium transition duration-200 hover:border-accent-gold/40 hover:text-accent-gold"
                  >
                    <MailIcon className="h-4 w-4 text-accent-gold" />
                    {dict.contact.email}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
