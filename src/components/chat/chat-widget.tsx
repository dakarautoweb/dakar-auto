'use client'

import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, ChevronLeft, LayoutGrid, RotateCcw, ArrowRight } from 'lucide-react'
import type { Dictionary } from '@/src/i18n/dictionaries'
import type { PublicFaqItem } from '@/src/services/faq/types'
import type { PublicSiteSettings } from '@/src/services/site-settings/types'
import type { AssistantAction, ChatErrorCode, ChatMessage, QuickAction } from '@/src/lib/chat/types'
import { CHAT_ROUTES, type ChatRouteId } from '@/src/lib/chat/routes'
import { buildAiHistory } from '@/src/lib/chat/history'
import { postChatMessage } from '@/src/lib/chat/client'
import { MailIcon, PhoneIcon, WhatsAppIcon } from '@/src/components/home/icons'
import { normalizePhoneDigits, buildWhatsAppLinkFrom } from '@/src/lib/contact-info'
import { buildQuickActions } from './quick-actions'
import { ChatComposer } from './chat-composer'
import { RecoveryControls } from './recovery-controls'
import { useRequestRecovery } from './use-request-recovery'

// Session-only: whether the attention dot has already been dismissed, so it
// doesn't reappear on every page while the visitor browses (no
// history/database persistence, just enough state to not be annoying).
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

// Mobile keyboards shrink the visual viewport but not the layout viewport
// that position:fixed and dvh follow (iOS, and Android Chrome by default).
// While the panel is open, track how much of the bottom is covered so the
// panel can sit above the keyboard and fit in what remains visible.
type VisibleViewport = { height: number; bottomInset: number }

function useVisibleViewport(active: boolean): VisibleViewport | null {
  const [viewport, setViewport] = useState<VisibleViewport | null>(null)
  useEffect(() => {
    const visual = window.visualViewport
    if (!active || !visual) return
    function update() {
      if (!visual) return
      // Pinch-zoom also shrinks the visual viewport — only follow the
      // unzoomed (keyboard) case.
      if (visual.scale > 1.01) return setViewport(null)
      setViewport({ height: visual.height, bottomInset: Math.max(0, window.innerHeight - visual.height - visual.offsetTop) })
    }
    update()
    visual.addEventListener('resize', update)
    visual.addEventListener('scroll', update)
    return () => {
      visual.removeEventListener('resize', update)
      visual.removeEventListener('scroll', update)
      setViewport(null)
    }
  }, [active])
  return viewport
}

type Stage = 'menu' | 'chat' | 'faq-list' | 'faq-answer' | 'contact' | 'recovery'

let messageSeq = 0
function nextMessageId() {
  messageSeq += 1
  return `chat-message-${messageSeq}`
}

const ROUTE_LABEL_KEYS: Record<string, ChatRouteId> = Object.fromEntries(
  Object.entries(CHAT_ROUTES).map(([id, href]) => [href, id as ChatRouteId]),
)

function errorMessage(dict: Dictionary['chatWidget'], error: ChatErrorCode): string {
  if (error === 'too_many_requests') return dict.errors.tooManyRequests
  if (error === 'invalid_request') return dict.errors.invalidRequest
  return dict.errors.unavailable
}

const chipClass =
  'inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-accent/40 bg-card px-3 py-1.5 text-left text-xs font-semibold text-accent transition duration-200 hover:border-accent-hover hover:bg-accent-soft/50 hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:min-h-0'

const menuItemClass =
  'flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-xs leading-snug font-medium text-foreground transition duration-200 hover:border-accent-hover hover:bg-accent-soft/50 hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:min-h-10'

const contactLinkClass = 'inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium transition duration-200 sm:min-h-9'

// Public-site floating chat widget: the original guided quick actions, FAQ
// and contact views, plus free-text questions answered by the Dakar Auto
// Assistant (/api/chat) and a secure lost-request recovery flow
// (/api/chat/recovery, never AI). Mounted once in app/(site)/layout.tsx, so
// it never renders inside /admin. FAQ items and contact settings come from
// the server-component layout as props.
//
// The conversation lives in this component's state only — nothing is
// persisted, and only the last few non-recovery turns are sent to the AI
// (see buildAiHistory).
export function ChatWidget({
  dict,
  faqItems,
  settings,
  locale,
  aiEnabled,
}: {
  dict: Dictionary['chatWidget']
  faqItems: PublicFaqItem[]
  settings: PublicSiteSettings
  locale: string
  aiEnabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const attentionSeen = useSyncExternalStore(subscribeToNothing, readAttentionSeen, attentionSeenOnServer)
  const [attentionDismissed, setAttentionDismissed] = useState(false)
  const showAttention = !attentionSeen && !attentionDismissed
  const [fieldFocused, setFieldFocused] = useState(false)
  const [stage, setStage] = useState<Stage>('menu')
  const [messages, setMessages] = useState<ChatMessage[]>(() => [{ id: 'welcome', role: 'assistant', content: dict.welcome }])
  const [pending, setPending] = useState(false)
  const requestRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const viewport = useVisibleViewport(open)
  const pathname = usePathname()

  const quickActions = buildQuickActions(dict)
  const hasContact = Boolean(settings.whatsapp || settings.phone || settings.email)

  function pushMessages(...entries: Omit<ChatMessage, 'id'>[]) {
    setMessages((prev) => [...prev, ...entries.map((entry) => ({ ...entry, id: nextMessageId() }))])
  }

  const recovery = useRequestRecovery({
    dict,
    locale,
    push: pushMessages,
    onFinished: () => setStage(aiEnabled ? 'chat' : 'menu'),
  })

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Click/tap outside closes. The press must both start and end outside the
  // panel (and the launcher, which toggles on its own): a touch that turns
  // into a page scroll is cancelled by the browser, and a text selection
  // dragged out of the panel doesn't count. Capture phase, so page handlers
  // that stop propagation can't swallow it. Focus is left where the visitor
  // clicked rather than pulled back to the launcher.
  useEffect(() => {
    if (!open) return
    let pressedOutside: number | null = null
    function isOutside(target: EventTarget | null) {
      return target instanceof Node && !panelRef.current?.contains(target) && !toggleRef.current?.contains(target)
    }
    function onPointerDown(event: PointerEvent) {
      pressedOutside = event.isPrimary && event.button === 0 && isOutside(event.target) ? event.pointerId : null
    }
    function onPointerUp(event: PointerEvent) {
      if (pressedOutside !== null && pressedOutside === event.pointerId && isOutside(event.target)) setOpen(false)
      pressedOutside = null
    }
    function onPointerCancel() {
      pressedOutside = null
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('pointercancel', onPointerCancel, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('pointercancel', onPointerCancel, true)
    }
  }, [open])

  useEffect(() => {
    if (open) panelRef.current?.focus()
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, pending])

  // An in-flight AI call is cancelled if the widget unmounts.
  useEffect(() => () => requestRef.current?.abort(), [])

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

  function startRecovery() {
    setStage('recovery')
    void recovery.start()
  }

  async function requestReply(conversation: ChatMessage[]) {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setPending(true)
    const result = await postChatMessage({ messages: buildAiHistory(conversation), locale, pathname }, controller.signal)
    if (controller.signal.aborted) return
    setPending(false)

    if (!result.ok) {
      pushMessages({ role: 'assistant', content: errorMessage(dict, result.error), failed: true })
      return
    }
    pushMessages({ role: 'assistant', content: result.reply.message, action: result.reply.action?.type === 'start_recovery' ? null : result.reply.action })
    if (result.reply.action?.type === 'start_recovery') startRecovery()
  }

  function sendMessage(text: string) {
    if (pending) return
    const conversation = [...messages, { id: nextMessageId(), role: 'user' as const, content: text }]
    setMessages(conversation)
    setStage('chat')
    void requestReply(conversation)
  }

  function retry() {
    if (pending) return
    const conversation = messages.filter((m) => !m.failed)
    setMessages(conversation)
    void requestReply(conversation)
  }

  function selectFaq(item: PublicFaqItem) {
    pushMessages({ role: 'user', content: item.question }, { role: 'assistant', content: item.answer })
    setStage('faq-answer')
  }

  function showFaq() {
    pushMessages({ role: 'assistant', content: faqItems.length > 0 ? dict.faq.intro : dict.faq.empty })
    setStage('faq-list')
  }

  function showContact() {
    pushMessages({ role: 'assistant', content: hasContact ? dict.contact.intro : dict.contact.empty })
    setStage('contact')
  }

  function selectAction(action: QuickAction) {
    if (action.kind === 'link') {
      setOpen(false)
      return
    }
    if (action.kind === 'recovery') {
      pushMessages({ role: 'user', content: action.label, channel: 'recovery' })
      startRecovery()
      return
    }
    pushMessages({ role: 'user', content: action.label })
    if (action.kind === 'faq') showFaq()
    else showContact()
  }

  function actionLabel(message: ChatMessage, action: AssistantAction): string {
    if (action.type === 'contact') return dict.actions.contact
    if (action.type === 'faq') return dict.actions.faq
    if (action.type === 'start_recovery') return dict.actions.startRecovery
    if (message.actionLabel) return message.actionLabel
    const routeId = ROUTE_LABEL_KEYS[action.href]
    return routeId ? dict.actions[routeId] : dict.actions.vehicleDetail
  }

  function renderAction(message: ChatMessage) {
    const action = message.action
    if (!action) return null
    const label = actionLabel(message, action)
    if (action.type === 'link') {
      return (
        <Link href={action.href} onClick={() => setOpen(false)} className={chipClass}>
          {label}
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />
        </Link>
      )
    }
    const onClick = action.type === 'contact' ? showContact : action.type === 'faq' ? showFaq : startRecovery
    return (
      <button type="button" onClick={onClick} disabled={stage === 'recovery'} className={`${chipClass} disabled:opacity-50`}>
        {label}
      </button>
    )
  }

  const lastMessage = messages[messages.length - 1]
  const showComposer = aiEnabled && stage !== 'recovery'

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
          style={viewport ? ({ '--chat-vh': `${viewport.height}px`, '--chat-kb': `${viewport.bottomInset}px` } as CSSProperties) : undefined}
          className="animate-[fade-in_200ms_ease-out] fixed inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom),var(--chat-kb,0px))+0.75rem)] z-50 flex max-h-[min(85dvh,calc(var(--chat-vh,100dvh)-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card-hover outline-none sm:inset-x-auto sm:right-6 sm:bottom-24 sm:max-h-[min(38rem,calc(100dvh-8rem))] sm:w-[24rem]"
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
              className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition duration-200 hover:bg-accent-soft/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 sm:mr-0 sm:h-9 sm:w-9"
            >
              <X className="h-[18px] w-[18px]" strokeWidth={2} />
            </button>
          </div>

          <div className="min-h-20 flex-1 shrink-[100] space-y-2 overflow-y-auto overscroll-contain px-4 py-3 sm:min-h-32" aria-live="polite" aria-relevant="additions">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex animate-[fade-in_200ms_ease-out] flex-col gap-1.5 ${message.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <p
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line [overflow-wrap:anywhere] ${
                    message.role === 'user'
                      ? 'bg-accent text-accent-foreground'
                      : message.failed
                        ? 'border border-red-500/30 bg-red-500/5 text-foreground'
                        : 'bg-surface text-foreground'
                  }`}
                >
                  {message.content}
                </p>
                {renderAction(message)}
                {message.failed && message === lastMessage && (
                  <button type="button" onClick={retry} disabled={pending} className={`${chipClass} disabled:opacity-50`}>
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.25} />
                    {dict.retry}
                  </button>
                )}
              </div>
            ))}
            {pending && (
              <div role="status" className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                <span className="flex gap-1 rounded-2xl bg-surface px-3 py-2.5" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </span>
                <span className="sr-only">{dict.typing}</span>
              </div>
            )}
            {messages.length === 1 && <p className="px-1 text-xs text-muted-foreground">{aiEnabled ? dict.guidedNotice : dict.guidedOnlyNotice}</p>}
            <div ref={messagesEndRef} />
          </div>

          {/* Controls keep their size and the thread scrolls; they only shrink
              (and scroll) when even the thread is at its minimum, e.g. with
              the mobile keyboard open. */}
          {stage === 'recovery' && recovery.state ? (
            <div className="min-h-0 overflow-y-auto overscroll-contain border-t border-border">
              <RecoveryControls
                dict={dict}
                state={recovery.state}
                onSubmitText={recovery.submitText}
                onChoose={recovery.chooseDiscriminator}
                onChooseRequest={recovery.chooseRequest}
                locale={locale}
                onResend={recovery.resend}
                onCancel={recovery.cancel}
                onRestart={recovery.start}
                onContact={() => {
                  recovery.exit()
                  showContact()
                }}
                onExit={recovery.exit}
                hasContact={hasContact}
              />
            </div>
          ) : (
            stage !== 'chat' && (
              <div className="max-h-56 min-h-0 overflow-y-auto overscroll-contain border-t border-border px-4 py-2.5 sm:max-h-64">
                {stage !== 'menu' && (
                  <button
                    type="button"
                    onClick={() => setStage('menu')}
                    className="-mt-1.5 mb-0.5 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover sm:mt-0 sm:mb-2 sm:min-h-0"
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
                          className={menuItemClass}
                        >
                          <action.icon className="h-4 w-4 shrink-0 text-accent" />
                          <span className="min-w-0">{action.label}</span>
                        </Link>
                      ) : (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => selectAction(action)}
                          className={menuItemClass}
                        >
                          <action.icon className="h-4 w-4 shrink-0 text-accent" />
                          <span className="min-w-0">{action.label}</span>
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
                        className="block min-h-11 w-full rounded-xl border border-border px-3 py-2.5 text-left text-xs leading-snug font-medium text-foreground transition duration-200 hover:border-accent-hover hover:bg-accent-soft/50 hover:text-accent-hover"
                      >
                        {item.question}
                      </button>
                    ))}
                    <Link href="/faq" onClick={() => setOpen(false)} className="block px-1 py-3.5 text-xs font-semibold text-accent hover:text-accent-hover sm:pb-0 sm:pt-1">
                      {dict.faq.viewAll}
                    </Link>
                  </div>
                )}

                {stage === 'faq-answer' && (
                  <Link href="/faq" onClick={() => setOpen(false)} className="block px-1 py-3.5 text-xs font-semibold text-accent hover:text-accent-hover sm:py-0">
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
                        className={`${contactLinkClass} hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400`}
                      >
                        <WhatsAppIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        {dict.contact.whatsapp}
                      </a>
                    )}
                    {settings.phone && (
                      <a
                        href={`tel:${normalizePhoneDigits(settings.phone)}`}
                        className={`${contactLinkClass} hover:border-blue-500/40 hover:text-blue-600 dark:hover:text-blue-400`}
                      >
                        <PhoneIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        {dict.contact.phone}
                      </a>
                    )}
                    {settings.email && (
                      <a
                        href={`mailto:${settings.email}`}
                        className={`${contactLinkClass} hover:border-accent-gold/40 hover:text-accent-gold`}
                      >
                        <MailIcon className="h-4 w-4 text-accent-gold" />
                        {dict.contact.email}
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          )}

          {stage === 'chat' && (
            <div className="shrink-0 border-t border-border px-4 pt-1 sm:pt-2">
              <button
                type="button"
                onClick={() => setStage('menu')}
                className="-my-1 inline-flex min-h-11 items-center gap-1.5 text-xs sm:my-0 sm:min-h-0 font-semibold text-accent hover:text-accent-hover"
              >
                <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2.25} />
                {dict.menu}
              </button>
            </div>
          )}

          {showComposer && <ChatComposer dict={dict} disabled={pending} onSend={sendMessage} />}
        </div>
      )}
    </>
  )
}
