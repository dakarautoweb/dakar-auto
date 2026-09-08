import type { Dictionary } from '@/src/i18n/dictionaries'

export function SiteFooter({ dict }: { dict: Dictionary }) {
  return (
    <footer className="border-t border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-sm text-zinc-600 dark:text-zinc-400 sm:px-6">
        <p>{dict.footer.tagline}</p>
        <p>
          © {new Date().getFullYear()} Dakar Auto. {dict.footer.rights}
        </p>
      </div>
    </footer>
  )
}
