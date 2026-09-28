import { getCurrentLocale } from "@/src/i18n/server";
import { getDictionary } from "@/src/i18n/dictionaries";
import { VehicleRequestWizard } from "@/src/components/vehicle-request-wizard/wizard";
import { VehicleSearchHeroImage } from "@/src/components/source-vehicle/vehicle-search-hero-image";
import { HeroMapOverlay } from "@/src/components/source-vehicle/hero-map-overlay";
import { buttonClasses, cardClasses, iconCircleClasses } from "@/src/components/ui/styles";
import { ArrowRightIcon, GlobalIcon, QualityIcon, ShippingIcon, SupportIcon } from "@/src/components/home/icons";

// Target of the hero CTA. The form card is focusable (tabIndex -1), so
// following the link both scrolls (smoothly, via the global
// scroll-behavior) to the form and moves focus onto it.
const FORM_ANCHOR_ID = "vehicle-request-form";

export default async function SourceAVehiclePage() {
  const locale = await getCurrentLocale();
  const dict = await getDictionary(locale);
  const t = dict.sourceVehiclePage;
  const features = [
    { icon: GlobalIcon, ...t.features.global },
    { icon: QualityIcon, ...t.features.trusted },
    { icon: ShippingIcon, ...t.features.shipping },
    { icon: SupportIcon, ...t.features.support },
  ];
  const numberedSteps = t.howItWorks.steps.slice(0, -1);
  const footerStep = t.howItWorks.steps[t.howItWorks.steps.length - 1];

  return (
    <div>
      <div className="relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          {/* `lg:items-stretch` (the grid default — no override here)
              instead of the old `lg:items-center`: the right column needs
              a real height to hand its `h-full` image/overlay via
              `lg:h-full` below, and stretching the left column to match
              doesn't change how its own content lays out (still starts
              at the top, unaffected). `relative z-10` on the left column
              keeps it painting above the right column's image, which
              deliberately bleeds outside its own box (see
              VehicleSearchHeroImage) — without it, the positioned right
              column would paint on top by default, regardless of which
              one comes first in the markup. */}
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div className="relative z-10 lg:col-start-1 lg:row-start-1">
              <span className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">{t.eyebrow}</span>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance sm:text-5xl">{t.title}</h1>
              <p className="mt-4 max-w-lg text-lg text-muted-foreground">{t.description}</p>
              <a
                href={`#${FORM_ANCHOR_ID}`}
                className={buttonClasses({ variant: "primary", size: "lg", className: "mt-6 w-full shadow-glow sm:w-auto" })}
              >
                {t.cta}
                <ArrowRightIcon className="h-5 w-5" />
              </a>
            </div>

            {/* Benefits: same DOM spot as before (text → benefits → photo),
                so the stacked mobile order and 2×2 grid are unchanged.
                From lg up it moves to its own full-width row under the
                hero as 4 compact, equal-width cards. */}
            <ul className="relative z-10 -mt-2 grid grid-cols-2 gap-3 lg:col-span-2 lg:row-start-2 lg:mt-0 lg:grid-cols-4 lg:gap-4">
              {features.map((feature) => (
                <li
                  key={feature.title}
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card/60 p-4 text-center shadow-card transition duration-200 hover:-translate-y-1 hover:border-accent-gold/50 hover:shadow-glow-gold sm:items-start sm:text-left lg:flex-row lg:items-center"
                >
                  <span
                    className={iconCircleClasses({
                      size: "xl",
                      tone: "gold",
                      className: "shrink-0 transition duration-200 group-hover:scale-110 lg:h-12 lg:w-12",
                    })}
                  >
                    <feature.icon className="h-9 w-9 lg:h-6 lg:w-6" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{feature.title}</span>
                    <span className="block text-xs text-muted-foreground">{feature.description}</span>
                  </span>
                </li>
              ))}
            </ul>

            {/* Anchor for the hero photo + map overlay — see
                VehicleSearchHeroImage for why they live here (inside the
                right grid column) rather than at the section level. */}
            <div className="relative aspect-[4/3] w-full max-w-lg lg:col-start-2 lg:row-start-1 lg:aspect-auto lg:h-full lg:min-h-[540px] lg:max-w-none" aria-hidden="true">
              <VehicleSearchHeroImage />
              <HeroMapOverlay />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.4fr] lg:items-start">
          <div className={cardClasses({ tone: "raised", padding: "md", className: "lg:sticky lg:top-20" })}>
            <h2 className="text-lg font-semibold">{t.howItWorks.title}</h2>
            <ol className="mt-6 space-y-7">
              {numberedSteps.map((step, i) => (
                <li key={step.title} className="relative flex gap-4">
                  {i < numberedSteps.length - 1 && (
                    <span aria-hidden="true" className="absolute top-12 left-6 h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-accent/50 to-border" />
                  )}
                  <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-bold text-accent-foreground shadow-glow">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>

            {footerStep && (
              <div className="mt-7 flex items-center gap-4 border-t border-border pt-6">
                <span className={iconCircleClasses({ size: "xl", tone: "gold" })}>
                  <GlobalIcon className="h-9 w-9" />
                </span>
                <div>
                  <h3 className="text-base font-semibold">{footerStep.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{footerStep.description}</p>
                </div>
              </div>
            )}
          </div>

          <div
            id={FORM_ANCHOR_ID}
            tabIndex={-1}
            className={cardClasses({ tone: "raised", padding: "md", className: "scroll-mt-24 focus:outline-none" })}
          >
            <VehicleRequestWizard dict={dict} locale={locale} />
          </div>
        </div>
      </div>
    </div>
  );
}
