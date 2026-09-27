import 'server-only'
import type { Locale } from '@/src/i18n/config'
import { renderEmailShell, renderParagraph, escapeHtml, CUSTOMER_EMAIL_THEME } from '../layout'

export type RequestRecoveryCodeEmailData = {
  code: string
  locale: Locale
  expiresInMinutes: number
}

const COPY = {
  fr: {
    subject: 'Votre code de vérification Dakar Auto',
    title: 'Code de vérification',
    intro: 'Vous avez demandé à retrouver une demande Dakar Auto depuis notre assistant. Voici votre code de vérification :',
    expiry: (minutes: number) => `Ce code est valable ${minutes} minutes et ne peut être utilisé qu’une seule fois.`,
    ignore: 'Si vous n’êtes pas à l’origine de cette demande, ignorez simplement cet email : aucune information n’a été communiquée.',
    footer: 'Dakar Auto — ne partagez jamais ce code avec qui que ce soit, y compris un membre de notre équipe.',
  },
  en: {
    subject: 'Your Dakar Auto verification code',
    title: 'Verification code',
    intro: 'You asked our assistant to find a Dakar Auto request. Here is your verification code:',
    expiry: (minutes: number) => `This code is valid for ${minutes} minutes and can only be used once.`,
    ignore: 'If you didn’t ask for this, just ignore this email — no information has been shared.',
    footer: 'Dakar Auto — never share this code with anyone, including a member of our team.',
  },
} as const

// Only the code — no request number, status, name or other request data,
// so a mistyped or shared inbox learns nothing about the request.
export function buildRequestRecoveryCodeEmail({ code, locale, expiresInMinutes }: RequestRecoveryCodeEmailData) {
  const t = COPY[locale]
  const codeBlock = `
    <p style="margin:8px 0 20px 0;font-family:'SFMono-Regular',Consolas,monospace;font-size:32px;font-weight:800;letter-spacing:0.3em;color:#111113;">${escapeHtml(code)}</p>`
  const body = [renderParagraph(escapeHtml(t.intro)), codeBlock, renderParagraph(escapeHtml(t.expiry(expiresInMinutes))), renderParagraph(escapeHtml(t.ignore))].join('')

  return {
    subject: t.subject,
    html: renderEmailShell({ preheader: t.title, title: t.subject, body, footer: escapeHtml(t.footer), theme: CUSTOMER_EMAIL_THEME }),
  }
}
