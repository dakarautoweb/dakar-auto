import { getCurrentLocale } from "@/src/i18n/server";
import { getDictionary } from "@/src/i18n/dictionaries";
import { Hero } from "@/src/components/home/hero";
import { TrustFeatures } from "@/src/components/home/trust-features";
import { Brands } from "@/src/components/home/brands";
import { PartsCategories } from "@/src/components/home/parts-categories";
import { SourceVehicle } from "@/src/components/home/source-vehicle";
import { HowItWorks } from "@/src/components/home/how-it-works";
import { ContactSection } from "@/src/components/home/contact-section";

export default async function Home() {
  const locale = await getCurrentLocale();
  const dict = await getDictionary(locale);

  return (
    <>
      <Hero dict={dict} />
      <TrustFeatures dict={dict} />
      <Brands dict={dict} />
      <PartsCategories dict={dict} />
      <SourceVehicle dict={dict} />
      <HowItWorks dict={dict} />
      <ContactSection dict={dict} />
    </>
  );
}
