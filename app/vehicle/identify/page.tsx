import { getCurrentLocale } from "@/src/i18n/server";
import { getDictionary } from "@/src/i18n/dictionaries";
import { VehicleWizard } from "@/src/components/vehicle-wizard/wizard";

export default async function IdentifyVehiclePage({
  searchParams,
}: PageProps<"/vehicle/identify">) {
  const locale = await getCurrentLocale();
  const dict = await getDictionary(locale);
  const params = await searchParams;

  const vinParam = params.vin;
  const vin = Array.isArray(vinParam) ? vinParam[0] : vinParam;
  const scanParam = params.scan;
  const scanRequested = (Array.isArray(scanParam) ? scanParam[0] : scanParam) === "1";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <VehicleWizard dict={dict} locale={locale} initialVin={vin} initialScanOpen={scanRequested} />
    </div>
  );
}
