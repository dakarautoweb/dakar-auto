import { getCurrentLocale } from "@/src/i18n/server";
import { getDictionary } from "@/src/i18n/dictionaries";
import { Hero } from "@/src/components/home/hero";
import { TrustFeatures } from "@/src/components/home/trust-features";
import { Brands } from "@/src/components/home/brands";
import { PartsCategories } from "@/src/components/home/parts-categories";
import { FeaturedVehicles } from "@/src/components/home/featured-vehicles";
import { SourceVehicle } from "@/src/components/home/source-vehicle";
import { HowItWorks } from "@/src/components/home/how-it-works";
import { ContactSection } from "@/src/components/home/contact-section";
import { Reveal } from "@/src/components/reveal";
import { getPublicSiteSettings } from "@/src/services/site-settings/queries";

export default async function Home() {
  const locale = await getCurrentLocale();
  const dict = await getDictionary(locale);
  // Same cache()-wrapped call the root layout already made for the footer
  // this request — this is a shared-cache hit, not a second DB round trip.
  const siteSettings = await getPublicSiteSettings();

  return (
    <>
      <Hero dict={dict} />
      <Reveal>
        <TrustFeatures dict={dict} />
      </Reveal>
      <Reveal>
        <PartsCategories dict={dict} />
      </Reveal>
      <Reveal>
        <Brands dict={dict} />
      </Reveal>
      <Reveal>
        <FeaturedVehicles dict={dict} locale={locale} />
      </Reveal>
      <Reveal>
        <SourceVehicle dict={dict} />
      </Reveal>
      <Reveal>
        <HowItWorks dict={dict} />
      </Reveal>
      <Reveal>
        <ContactSection dict={dict} settings={siteSettings} />
      </Reveal>
    </>
  );
}
