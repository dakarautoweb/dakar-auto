import 'server-only'

const ACCENT = '#1d4ed8'
const TEXT = '#1a1a1a'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'
const SURFACE = '#f8fafc'

// Dakar Auto customer-brand theme: dark graphite header with a thin orange
// accent border, orange CTA buttons. Opt-in via `theme` on renderEmailShell /
// renderCta — the four customer confirmation/status templates pass this;
// templates that don't (admin-report, vehicle request admin notification)
// keep rendering with the original blue DEFAULT_THEME below, unchanged.
export const CUSTOMER_EMAIL_THEME = {
  headerBg: '#111113',
  accent: '#f97316',
}

type EmailTheme = { headerBg: string; accent: string }
const DEFAULT_THEME: EmailTheme = { headerBg: ACCENT, accent: ACCENT }

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export type EmailRow = { label: string; value: string }

export function renderInfoCard(title: string, rows: EmailRow[]): string {
  const rowsHtml = rows
    .map(
      (row) => `
        <tr>
          <td style="padding:6px 0;font-size:13px;color:${MUTED};white-space:nowrap;vertical-align:top;">${escapeHtml(row.label)}</td>
          <td style="padding:6px 0 6px 16px;font-size:14px;color:${TEXT};font-weight:500;">${row.value}</td>
        </tr>`
    )
    .join('')

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE};border:1px solid ${BORDER};border-radius:12px;padding:16px 20px;margin:16px 0;">
      <tr><td style="font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${MUTED};padding-bottom:8px;">${escapeHtml(title)}</td></tr>
      <tr><td>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
      </td></tr>
    </table>`
}

export function renderParagraph(text: string): string {
  return `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${TEXT};">${text}</p>`
}

export function renderCta(href: string, label: string, theme: EmailTheme = DEFAULT_THEME): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="border-radius:10px;background:${theme.accent};">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
        </td>
      </tr>
    </table>`
}

export function renderEmailShell(opts: {
  preheader: string
  title: string
  body: string
  footer: string
  theme?: EmailTheme
}): string {
  const theme = opts.theme ?? DEFAULT_THEME
  // Only the branded (customer) theme gets the thin accent borders on header
  // and footer — the default blue theme's header/footer render exactly as
  // they did before this option existed.
  const headerBorder = opts.theme ? `border-bottom:3px solid ${theme.accent};` : ''
  const footerBorderColor = opts.theme ? theme.accent : BORDER

  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(opts.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef1f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BORDER};">
            <tr>
              <td style="background:${theme.headerBg};padding:24px 28px;${headerBorder}">
                <span style="font-size:18px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">Dakar Auto</span>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                ${opts.body}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;border-top:1px solid ${footerBorderColor};background:${SURFACE};">
                <p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">${opts.footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export { escapeHtml }
