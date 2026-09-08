import { getCurrentLocale } from "@/src/i18n/server";
import { getDictionary } from "@/src/i18n/dictionaries";
import { PlaceholderPage } from "@/src/components/placeholder-page";

export default async function IdentifyVehiclePage({
  searchParams,
}: PageProps<"/vehicle/identify">) {
  const locale = await getCurrentLocale();
  const dict = await getDictionary(locale);
  const params = await searchParams;
  const vinParam = params.vin;
  const vin = Array.isArray(vinParam) ? vinParam[0] : vinParam;

  return (
    <PlaceholderPage
      badge={dict.placeholder.badge}
      title={dict.vehicleIdentifyPage.title}
      description={dict.vehicleIdentifyPage.description}
      backLabel={dict.placeholder.backHome}
    >
      {vin && (
        <p className="mt-4 rounded-lg border border-border bg-surface px-4 py-2 font-mono text-sm">
          {dict.vehicleIdentifyPage.vinReceivedLabel}{" "}
          <span className="font-semibold">{vin.toUpperCase()}</span>
        </p>
      )}
    </PlaceholderPage>
  );
}
