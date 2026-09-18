import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { LegalPage, LegalSection } from '@/src/components/legal-page'
import { SITE_NAME } from '@/src/lib/contact-info'
import { getPublicSiteSettings } from '@/src/services/site-settings/queries'

// Describes the actual scope of the service this codebase provides — a
// request/inquiry flow, not an online purchase/checkout (no payment
// processing exists anywhere in the project). No governing-law/jurisdiction
// clause is included because that's a legal fact not established anywhere
// in the project; see the task report for what still needs deciding before
// this is final.

export default async function TermsPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  // Public Company Information email (admin-editable, Admin -> Paramètres)
  // — already null unless "Afficher sur le site" is on for it (see
  // get_public_site_settings() in the migration), so this page never needs
  // its own show/hide check.
  const { email } = await getPublicSiteSettings()

  return (
    <LegalPage eyebrow={dict.footer.legalTitle} title={dict.legal.termsTitle}>
      {locale === 'fr' ? <TermsFr email={email} /> : <TermsEn email={email} />}
    </LegalPage>
  )
}

function TermsEn({ email }: { email: string | null }) {
  return (
    <>
      <LegalSection title="Acceptance of these terms">
        <p>
          By using this website to submit a parts request or a vehicle sourcing request, you agree to these terms. If you don&apos;t
          agree, please don&apos;t submit a request.
        </p>
      </LegalSection>

      <LegalSection title="What this service is">
        <p>
          {SITE_NAME} accepts customer requests for automotive spare parts, and separately, requests to help source a vehicle. Both are
          <strong> request/inquiry flows</strong>: submitting a form starts a conversation with our team, it does not complete a
          purchase or place a binding order. No account is required to submit or track a request.
        </p>
      </LegalSection>

      <LegalSection title="Parts requests and VIN-based identification">
        <p>
          When you provide a VIN (entered or scanned) or manual vehicle details, we use that information to help identify your vehicle
          and the part(s) that are likely to fit it. <strong>Exact part compatibility is not automatically guaranteed</strong> by this
          identification — vehicle data providers and parts catalogs can be incomplete or contain errors, and the same model can have
          multiple variants that take different parts. Final availability and compatibility of any specific part are{' '}
          <strong>confirmed manually by our team</strong> before you commit to anything.
        </p>
      </LegalSection>

      <LegalSection title="Vehicle sourcing requests">
        <p>
          A vehicle sourcing request tells us what you&apos;re looking for (make, model, year range, budget, and other preferences).{' '}
          <strong>This is not an automatic vehicle purchase.</strong> Submitting a request does not reserve, allocate, or commit us to
          deliver any specific vehicle. Our team follows up with you directly to discuss options, pricing, and next steps, and nothing
          is finalized until that manual conversation results in an agreement between you and us.
        </p>
      </LegalSection>

      <LegalSection title="No online payment">
        <p>This site does not process payments or complete purchases online. Any payment or purchase terms are handled directly between you and our team, outside of this website.</p>
      </LegalSection>

      <LegalSection title="Photos and content you submit">
        <p>
          If you attach photos to a request, you confirm you have the right to share them with us and that they don&apos;t infringe
          anyone else&apos;s rights. We use submitted photos only to help identify and process your request.
        </p>
      </LegalSection>

      <LegalSection title="Communications">
        <p>
          By submitting a request, you agree that we may contact you about it using the method you selected (WhatsApp, phone, or
          email), including transactional emails such as a submission confirmation and status updates with your tracking link.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p>
          Some features on this site depend on third-party services — VIN decoding and vehicle-specific photos (Auto.dev), generic
          vehicle photos (CarImages API), request storage and hosting (Supabase), transactional email delivery (Resend), and bot/spam
          protection (Cloudflare Turnstile). <strong>Availability, accuracy, or performance of these third-party services may affect
          the features on this site</strong> — for example, a VIN decode or photo lookup may occasionally be unavailable or return no
          result. We aren&apos;t responsible for outages or errors originating from these third-party providers.
        </p>
      </LegalSection>

      <LegalSection title="Service availability">
        <p>
          We aim to keep this site available and its request/tracking features working correctly, but we don&apos;t guarantee
          uninterrupted or error-free operation. Features may change, and we may need to take the site down temporarily for
          maintenance.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          We may update these terms as the site&apos;s features change. Continuing to use the site after an update means you accept the
          revised terms.
        </p>
      </LegalSection>

      {email && (
        <LegalSection title="Contact">
          <p>
            Questions about these terms? Email us at <a href={`mailto:${email}`}>{email}</a>.
          </p>
        </LegalSection>
      )}
    </>
  )
}

function TermsFr({ email }: { email: string | null }) {
  return (
    <>
      <LegalSection title="Acceptation des présentes conditions">
        <p>
          En utilisant ce site pour envoyer une demande de pièces ou une demande de recherche de véhicule, vous acceptez les présentes
          conditions. Si vous n&apos;êtes pas d&apos;accord, merci de ne pas envoyer de demande.
        </p>
      </LegalSection>

      <LegalSection title="Nature du service">
        <p>
          {SITE_NAME} reçoit les demandes de clients pour des pièces détachées automobiles, ainsi que, séparément, des demandes
          d&apos;aide à la recherche d&apos;un véhicule. Ces deux parcours sont des{' '}
          <strong>flux de demande/prise de contact</strong> : l&apos;envoi d&apos;un formulaire lance un échange avec notre équipe, il
          ne finalise pas un achat ni ne constitue une commande ferme. Aucun compte n&apos;est nécessaire pour envoyer ou suivre une
          demande.
        </p>
      </LegalSection>

      <LegalSection title="Demandes de pièces et identification par VIN">
        <p>
          Lorsque vous fournissez un VIN (saisi ou scanné) ou des informations de véhicule saisies manuellement, nous utilisons ces
          informations pour aider à identifier votre véhicule et la ou les pièces susceptibles de lui correspondre.{' '}
          <strong>La compatibilité exacte d&apos;une pièce n&apos;est pas automatiquement garantie</strong> par cette identification —
          les fournisseurs de données véhicule et les catalogues de pièces peuvent être incomplets ou contenir des erreurs, et un même
          modèle peut avoir plusieurs variantes nécessitant des pièces différentes. La disponibilité et la compatibilité définitives
          d&apos;une pièce donnée sont <strong>confirmées manuellement par notre équipe</strong> avant tout engagement de votre part.
        </p>
      </LegalSection>

      <LegalSection title="Demandes de recherche de véhicule">
        <p>
          Une demande de recherche de véhicule nous indique ce que vous recherchez (marque, modèle, plage d&apos;années, budget et
          autres préférences). <strong>Il ne s&apos;agit pas d&apos;un achat automatique de véhicule.</strong> L&apos;envoi d&apos;une
          demande ne réserve, n&apos;attribue et ne nous engage à livrer aucun véhicule spécifique. Notre équipe vous recontacte
          directement pour discuter des options, du prix et des prochaines étapes, et rien n&apos;est finalisé tant que cet échange
          manuel n&apos;a pas abouti à un accord entre vous et nous.
        </p>
      </LegalSection>

      <LegalSection title="Aucun paiement en ligne">
        <p>
          Ce site ne traite aucun paiement et ne finalise aucun achat en ligne. Les conditions de paiement ou d&apos;achat sont
          convenues directement entre vous et notre équipe, en dehors de ce site.
        </p>
      </LegalSection>

      <LegalSection title="Photos et contenus que vous envoyez">
        <p>
          Si vous joignez des photos à une demande, vous confirmez disposer du droit de nous les transmettre et qu&apos;elles ne portent
          atteinte aux droits d&apos;aucun tiers. Nous utilisons les photos envoyées uniquement pour aider à identifier et traiter votre
          demande.
        </p>
      </LegalSection>

      <LegalSection title="Communications">
        <p>
          En envoyant une demande, vous acceptez que nous puissions vous contacter à son sujet selon le moyen que vous avez choisi
          (WhatsApp, téléphone ou email), y compris via des emails transactionnels tels qu&apos;une confirmation d&apos;envoi et des
          mises à jour de statut accompagnées de votre lien de suivi.
        </p>
      </LegalSection>

      <LegalSection title="Services tiers">
        <p>
          Certaines fonctionnalités de ce site dépendent de services tiers — décodage VIN et photos spécifiques au véhicule (Auto.dev),
          photos génériques de véhicules (CarImages API), stockage et hébergement des demandes (Supabase), envoi des emails
          transactionnels (Resend), et protection contre les robots/spam (Cloudflare Turnstile).{' '}
          <strong>
            La disponibilité, l&apos;exactitude ou la performance de ces services tiers peuvent affecter les fonctionnalités de ce site
          </strong>{' '}
          — par exemple, un décodage VIN ou une recherche de photo peut occasionnellement être indisponible ou ne renvoyer aucun
          résultat. Nous ne sommes pas responsables des interruptions ou erreurs provenant de ces prestataires tiers.
        </p>
      </LegalSection>

      <LegalSection title="Disponibilité du service">
        <p>
          Nous nous efforçons de maintenir ce site disponible et ses fonctionnalités de demande/suivi opérationnelles, mais nous ne
          garantissons pas un fonctionnement ininterrompu ou sans erreur. Les fonctionnalités peuvent évoluer, et nous pouvons devoir
          rendre le site temporairement indisponible pour maintenance.
        </p>
      </LegalSection>

      <LegalSection title="Modifications des présentes conditions">
        <p>
          Nous pouvons mettre à jour ces conditions à mesure que les fonctionnalités du site évoluent. Continuer à utiliser le site
          après une mise à jour signifie que vous acceptez les conditions révisées.
        </p>
      </LegalSection>

      {email && (
        <LegalSection title="Contact">
          <p>
            Des questions sur ces conditions ? Écrivez-nous à <a href={`mailto:${email}`}>{email}</a>.
          </p>
        </LegalSection>
      )}
    </>
  )
}
