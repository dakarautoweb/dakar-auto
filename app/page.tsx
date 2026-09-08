import { getCurrentLocale } from "@/src/i18n/server";
import { getDictionary } from "@/src/i18n/dictionaries";

export default async function Home() {
  const locale = await getCurrentLocale();
  const dict = await getDictionary(locale);

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-32 text-center">
        <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
          {dict.home.heroTitle}
        </h1>
        <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          {dict.home.heroSubtitle}
        </p>
        <button
          type="button"
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:opacity-90"
        >
          {dict.home.cta}
        </button>
      </div>
    </div>
  );
}
