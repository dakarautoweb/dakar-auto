// Masked contact destinations shown before ownership is verified — enough
// for the customer to recognise their own address, never the full value.

const DOT = '•'

// "Sophie.Diallo@gmail.com" → "s•••••@gmail.com". The local part's length
// is not revealed (always five dots).
export function maskEmail(email: string): string {
  const value = email.trim().toLowerCase()
  const at = value.lastIndexOf('@')
  if (at <= 0) return DOT.repeat(5)
  return `${value[0]}${DOT.repeat(5)}${value.slice(at)}`
}

// "+221 77 123 45 67" → "•••• •• 4567" — last four digits only.
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return `${DOT.repeat(4)} ${DOT.repeat(2)}`
  return `${DOT.repeat(4)} ${DOT.repeat(2)} ${digits.slice(-4)}`
}
