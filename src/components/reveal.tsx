'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

// Restrained scroll-reveal for section entrances (fade + slight slide) —
// IntersectionObserver-driven so it costs nothing until a section actually
// approaches the viewport, and pure CSS transition so it's automatically
// neutered by the global prefers-reduced-motion rule in globals.css
// (transition-duration: 0.01ms !important), no extra check needed here.
export function Reveal({ children, className = '', delayMs = 0 }: { children: ReactNode; className?: string; delayMs?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -64px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'} ${className}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  )
}
