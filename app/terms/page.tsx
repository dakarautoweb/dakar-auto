import { getCurrentLocale } from "@/src/i18n/server";
import { getDictionary } from "@/src/i18n/dictionaries";
import { PlaceholderPage } from "@/src/components/placeholder-page";

export default async function TermsPage() {
  const locale = await getCurrentLocale();
  const dict = await getDictionary(locale);

  return (
    <PlaceholderPage
      badge={dict.placeholder.badge}
      title={dict.legal.termsTitle}
      description={dict.legal.termsBody}
      backLabel={dict.placeholder.backHome}
    />
  );
}
