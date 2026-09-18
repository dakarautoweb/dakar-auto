// Faint page-bottom watermark for data-heavy admin pages (Clients,
// Demandes de pièces) — reuses the real brand lockup already shipped at
// public/brand/dakar-auto-logo.png (the same file rendered at full opacity
// in the sidebar/login screen), never a separately-drawn mark.
//
// Deliberately laid out in normal document flow (not `position: absolute`)
// — an absolutely-positioned mark pinned to a short wrapper's own bottom
// edge ends up sitting exactly behind the table/pagination it shares that
// wrapper with, fully hidden behind their opaque backgrounds. Rendered
// last, after everything else, it just needs its own bit of breathing
// room below the table to be visible at all.
export function AdminWatermark() {
  return (
    <div aria-hidden="true" className="pointer-events-none mt-10 flex justify-center pb-2 select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/dakar-auto-logo.png" alt="" className="w-[280px] max-w-[55vw] opacity-[0.05] dark:opacity-[0.06]" />
    </div>
  )
}
