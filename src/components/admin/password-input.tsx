'use client'

import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { IconInput } from './icon-input'

// Lock-icon input with a show/hide toggle — shared by the login screen and
// the settings "change password" form.
export function PasswordInput({
  id,
  name,
  autoComplete,
  required,
  placeholder,
  showLabel,
  hideLabel,
}: {
  id: string
  name: string
  autoComplete?: string
  required?: boolean
  placeholder?: string
  showLabel: string
  hideLabel: string
}) {
  const [visible, setVisible] = useState(false)

  return (
    <IconInput
      icon={Lock}
      id={id}
      name={name}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      required={required}
      placeholder={placeholder}
      rightSlot={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          className="rounded-md p-1 text-muted-foreground transition duration-150 hover:text-foreground"
        >
          {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      }
    />
  )
}
