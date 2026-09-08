import { getCurrentLocale } from "@/src/i18n/server";
import { getDictionary } from "@/src/i18n/dictionaries";
import { PlaceholderPage } from "@/src/components/placeholder-page";

export default async function SourceAVehiclePage() {
  const locale = await getCurrentLocale();
  const dict = await getDictionary(locale);

  return (
    <PlaceholderPage
      badge={dict.placeholder.badge}
      title={dict.sourceVehiclePage.title}
      description={dict.sourceVehiclePage.description}
      backLabel={dict.placeholder.backHome}
    />
  );
}
