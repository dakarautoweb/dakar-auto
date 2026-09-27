import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { getCurrentLocale, getCurrentTheme } from "@/src/i18n/server";
import { getDictionary } from "@/src/i18n/dictionaries";
import { SiteHeader } from "@/src/components/site-header";
import { SiteFooter } from "@/src/components/site-footer";
import { PartRequestWizardProvider } from "@/src/components/vehicle-wizard/wizard-context";
import { SiteSettingsProvider } from "@/src/components/site-settings-context";
import { getPublicSiteSettings } from "@/src/services/site-settings/queries";
import { getPublicFaqItems } from "@/src/services/faq/queries";
import { ChatWidget } from "@/src/components/chat/chat-widget";
import { isChatAssistantConfigured } from "@/src/services/chat/config";
import { isRecoveryConfigured } from "@/src/services/request-recovery/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  const dict = await getDictionary(locale);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getCurrentLocale();
  const theme = await getCurrentTheme();
  const dict = await getDictionary(locale);
  const [siteSettings, faqItems] = await Promise.all([getPublicSiteSettings(), getPublicFaqItems(locale)]);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${theme === "dark" ? "dark" : ""}`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-background text-foreground">
        {/* Admin-configured public contact info (Admin -> Paramètres ->
            "Informations de l'entreprise"), fetched once here and shared
            with every client component below — see
            site-settings-context.tsx. */}
        <SiteSettingsProvider settings={siteSettings}>
          <SiteHeader locale={locale} theme={theme} dict={dict} />
          {/* Shared across every route in this layout so the part-request
              wizard's entry state (vehicle / category / selected part)
              survives a client-side navigation from the homepage or /parts
              into /vehicle/identify — see wizard-context.tsx. */}
          <PartRequestWizardProvider>
            <main className="flex flex-1 flex-col">{children}</main>
          </PartRequestWizardProvider>
          <SiteFooter dict={dict} settings={siteSettings} />
          <ChatWidget
            dict={dict.chatWidget}
            faqItems={faqItems}
            settings={siteSettings}
            locale={locale}
            aiEnabled={isChatAssistantConfigured()}
            recoveryEnabled={isRecoveryConfigured()}
          />
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
