import { getCurrentLocale } from "@/src/i18n/server";
import { getDictionary } from "@/src/i18n/dictionaries";
import { PlaceholderPage } from "@/src/components/placeholder-page";

export default async function PrivacyPage() {
  const locale = await getCurrentLocale();
  const dict = await getDictionary(locale);

  return (
    <PlaceholderPage
      badge={dict.placeholder.badge}
      title={dict.legal.privacyTitle}
      description={dict.legal.privacyBody}
      backLabel={dict.placeholder.backHome}
    />
  );
}
