import { getCurrentLocale } from '@/src/i18n/server'
import { getDictionary } from '@/src/i18n/dictionaries'
import { LegalPage, LegalSection } from '@/src/components/legal-page'
import { SITE_NAME } from '@/src/lib/contact-info'
import { getPublicSiteSettings } from '@/src/services/site-settings/queries'

// Describes what this codebase actually does with visitor/customer data —
// nothing more. No registration number, legal entity name, physical
// address, tax number, or named data controller is asserted anywhere below
// because none of that exists in the project; see the task report for what
// still needs to be supplied before this can be treated as final legal
// copy. Content is intentionally omission-based rather than using
// placeholder markers in the page itself.

export default async function PrivacyPage() {
  const locale = await getCurrentLocale()
  const dict = await getDictionary(locale)
  // Public Company Information email (admin-editable, Admin -> Paramètres)
  // — already null unless "Afficher sur le site" is on for it (see
  // get_public_site_settings() in the migration), so this page never needs
  // its own show/hide check.
  const { email } = await getPublicSiteSettings()

  return (
    <LegalPage eyebrow={dict.footer.legalTitle} title={dict.legal.privacyTitle}>
      {locale === 'fr' ? <PrivacyFr email={email} /> : <PrivacyEn email={email} />}
    </LegalPage>
  )
}

function PrivacyEn({ email }: { email: string | null }) {
  return (
    <>
      <LegalSection title="Overview">
        <p>
          This page explains what information {SITE_NAME} collects through this website, why, and who it&apos;s shared with. It covers
          the parts request flow, the vehicle sourcing request flow, VIN lookup, photo uploads, and request tracking — the features this
          site actually offers today.
        </p>
        <p>
          You do not need to create an account to use this site. We only collect what you choose to submit through a request form, or
          what&apos;s technically necessary to make the site work (see &ldquo;Cookies&rdquo; below).
        </p>
      </LegalSection>

      <LegalSection title="Information you provide">
        <p>
          <strong>Parts requests.</strong> Your vehicle information (either decoded from a VIN you enter or scan, or entered manually:
          make, model, year, trim, engine, transmission, body style), the part you&apos;re looking for (category, description, quantity,
          condition preference), any photos you choose to attach, and your contact details (name, phone number, WhatsApp number, email,
          and your preferred contact method).
        </p>
        <p>
          <strong>Vehicle sourcing requests.</strong> The vehicle you&apos;re looking for (make, model, year range, color, engine,
          transmission, mileage range, trim, budget, and any other preferences you describe) and the same contact details as above.
        </p>
        <p>
          <strong>Tracking lookups.</strong> If you use the &ldquo;Track a request&rdquo; page, you submit your request number together
          with the email or phone number used on that request. That combination is required to retrieve your tracking link — we
          don&apos;t show request status to a request number alone.
        </p>
      </LegalSection>

      <LegalSection title="VIN decoding and vehicle photos">
        <p>
          When you enter or scan a VIN, it is sent to our vehicle-data provider, <strong>Auto.dev</strong>, to decode the make, model,
          year, and other specifications, and to look up a photo of that specific vehicle when one is available.
        </p>
        <p>
          If no vehicle-specific photo is available, we may show a generic photo of the same make/model/year sourced from{' '}
          <strong>CarImages API</strong> (carimagesapi.com). That lookup only uses the vehicle&apos;s make, model, and year — never your
          personal information.
        </p>
      </LegalSection>

      <LegalSection title="Photos you upload">
        <p>
          Photos attached to a parts request are uploaded directly from your browser to our storage provider,{' '}
          <strong>Supabase Storage</strong>, using a short-lived, single-use upload link. We check that each upload is really an image
          file before accepting it. Uploaded photos are stored privately — they are not publicly listed or indexed, and are only
          accessible to our team and to you (via the tracking link for your specific request).
        </p>
      </LegalSection>

      <LegalSection title="How we use this information">
        <ul>
          <li>To review, process, and respond to your request.</li>
          <li>To identify the vehicle and, where relevant, likely-compatible parts.</li>
          <li>To contact you about your request by your preferred method (WhatsApp, phone, or email).</li>
          <li>
            To send transactional emails via <strong>Resend</strong> — a confirmation when you submit a request, and a notification
            (with your tracking link) when a member of our team updates its status.
          </li>
          <li>To detect and block spam or automated submissions (see &ldquo;Security checks&rdquo; below).</li>
        </ul>
        <p>We do not use your information for advertising, and we do not sell it.</p>
      </LegalSection>

      <LegalSection title="Security checks">
        <p>
          When you submit a request or use the tracking lookup, <strong>Cloudflare Turnstile</strong> runs a challenge in your browser to
          confirm you&apos;re not an automated bot. Cloudflare receives the resulting token and your IP address to verify it server-side
          before we act on your submission. See Cloudflare&apos;s own privacy policy for how they handle that.
        </p>
        <p>We also apply request-rate limits on public forms to reduce automated abuse; this is separate from and in addition to Turnstile.</p>
      </LegalSection>

      <LegalSection title="Who we share information with">
        <p>We share the minimum information each of the following providers needs to perform its function for us:</p>
        <ul>
          <li>
            <strong>Supabase</strong> — hosts our database and file storage.
          </li>
          <li>
            <strong>Resend</strong> — delivers transactional emails on our behalf.
          </li>
          <li>
            <strong>Auto.dev</strong> — decodes VINs and looks up vehicle-specific photos.
          </li>
          <li>
            <strong>CarImages API</strong> (carimagesapi.com) — provides generic make/model/year vehicle photos.
          </li>
          <li>
            <strong>Cloudflare Turnstile</strong> — verifies that form submissions come from a real visitor, not a bot.
          </li>
        </ul>
        <p>
          Our internal team accesses request data through a separately authenticated admin system. This policy describes what we do
          with your information, not the internal security controls of that admin system.
        </p>
      </LegalSection>

      <LegalSection title="Data retention">
        <p>
          We keep request information for as long as needed to process your request and provide support related to it. We don&apos;t
          currently run an automatic deletion schedule. If you&apos;d like your information reviewed, corrected, or deleted, contact us
          (see below) and we&apos;ll handle it manually.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>This site only uses cookies that are necessary for it to function:</p>
        <ul>
          <li>Remembering your language (English/French) and light/dark theme preference.</li>
          <li>Keeping an admin team member signed in to the internal request-management area.</li>
        </ul>
        <p>We don&apos;t currently use advertising or analytics cookies.</p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          You can contact us at any time to ask what information we hold about a request, to correct it, or to ask us to delete it. We
          also intentionally avoid requiring an account: your request number plus the contact you provided is enough to track your
          request, and we don&apos;t ask for more than each form needs.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          We may update this page as the site&apos;s features change. Continuing to use the site after an update means you accept the
          revised policy.
        </p>
      </LegalSection>

      {email && (
        <LegalSection title="Contact">
          <p>
            Questions about this policy or your information? Email us at <a href={`mailto:${email}`}>{email}</a>.
          </p>
        </LegalSection>
      )}
    </>
  )
}

function PrivacyFr({ email }: { email: string | null }) {
  return (
    <>
      <LegalSection title="Aperçu">
        <p>
          Cette page explique quelles informations {SITE_NAME} collecte via ce site, pourquoi, et avec qui elles sont partagées. Elle
          couvre la demande de pièces détachées, la demande de recherche de véhicule, le décodage VIN, l&apos;envoi de photos et le suivi
          de demande — les fonctionnalités réellement proposées par ce site aujourd&apos;hui.
        </p>
        <p>
          Aucun compte n&apos;est nécessaire pour utiliser ce site. Nous ne collectons que ce que vous choisissez de transmettre via un
          formulaire de demande, ou ce qui est techniquement nécessaire au fonctionnement du site (voir « Cookies » ci-dessous).
        </p>
      </LegalSection>

      <LegalSection title="Informations que vous fournissez">
        <p>
          <strong>Demandes de pièces.</strong> Les informations de votre véhicule (décodées à partir d&apos;un VIN saisi ou scanné, ou
          renseignées manuellement : marque, modèle, année, finition, moteur, transmission, type de carrosserie), la pièce recherchée
          (catégorie, description, quantité, préférence d&apos;état), les photos que vous choisissez de joindre, et vos coordonnées (nom,
          téléphone, numéro WhatsApp, email, moyen de contact préféré).
        </p>
        <p>
          <strong>Demandes de recherche de véhicule.</strong> Le véhicule recherché (marque, modèle, plage d&apos;années, couleur,
          moteur, transmission, plage de kilométrage, finition, budget, et toute autre préférence que vous décrivez) ainsi que les mêmes
          coordonnées que ci-dessus.
        </p>
        <p>
          <strong>Suivi de demande.</strong> Si vous utilisez la page « Suivre une demande », vous transmettez votre numéro de demande
          accompagné de l&apos;email ou du téléphone utilisé pour cette demande. Cette combinaison est nécessaire pour obtenir votre lien
          de suivi — nous n&apos;affichons jamais le statut d&apos;une demande à partir du seul numéro de demande.
        </p>
      </LegalSection>

      <LegalSection title="Décodage VIN et photos du véhicule">
        <p>
          Lorsque vous saisissez ou scannez un VIN, il est transmis à notre fournisseur de données véhicule, <strong>Auto.dev</strong>,
          afin de décoder la marque, le modèle, l&apos;année et d&apos;autres caractéristiques, et de rechercher une photo de ce véhicule
          précis lorsqu&apos;elle est disponible.
        </p>
        <p>
          Si aucune photo spécifique au véhicule n&apos;est disponible, nous pouvons afficher une photo générique de la même
          marque/modèle/année provenant de <strong>CarImages API</strong> (carimagesapi.com). Cette recherche utilise uniquement la
          marque, le modèle et l&apos;année du véhicule — jamais vos informations personnelles.
        </p>
      </LegalSection>

      <LegalSection title="Photos que vous envoyez">
        <p>
          Les photos jointes à une demande de pièces sont envoyées directement depuis votre navigateur vers notre prestataire de
          stockage, <strong>Supabase Storage</strong>, via un lien d&apos;envoi temporaire à usage unique. Nous vérifions que chaque
          fichier envoyé est réellement une image avant de l&apos;accepter. Les photos envoyées sont stockées de manière privée — elles
          ne sont ni publiques ni indexées, et ne sont accessibles qu&apos;à notre équipe et à vous-même (via le lien de suivi de votre
          demande).
        </p>
      </LegalSection>

      <LegalSection title="Utilisation de ces informations">
        <ul>
          <li>Pour examiner, traiter et répondre à votre demande.</li>
          <li>Pour identifier le véhicule et, le cas échéant, les pièces probablement compatibles.</li>
          <li>Pour vous contacter au sujet de votre demande selon le moyen que vous avez choisi (WhatsApp, téléphone ou email).</li>
          <li>
            Pour envoyer des emails transactionnels via <strong>Resend</strong> — une confirmation lors de l&apos;envoi de votre
            demande, et une notification (avec votre lien de suivi) lorsqu&apos;un membre de notre équipe met à jour son statut.
          </li>
          <li>Pour détecter et bloquer le spam ou les envois automatisés (voir « Vérifications de sécurité » ci-dessous).</li>
        </ul>
        <p>Nous n&apos;utilisons pas vos informations à des fins publicitaires et ne les revendons pas.</p>
      </LegalSection>

      <LegalSection title="Vérifications de sécurité">
        <p>
          Lorsque vous envoyez une demande ou utilisez le suivi de demande, <strong>Cloudflare Turnstile</strong> effectue une
          vérification dans votre navigateur pour confirmer que vous n&apos;êtes pas un robot automatisé. Cloudflare reçoit le jeton
          obtenu ainsi que votre adresse IP afin de le vérifier côté serveur avant que nous traitions votre envoi. Consultez la
          politique de confidentialité de Cloudflare pour savoir comment ces données sont traitées.
        </p>
        <p>
          Nous appliquons également des limites de fréquence sur les formulaires publics afin de réduire les abus automatisés ; ceci
          s&apos;ajoute à Turnstile et en est indépendant.
        </p>
      </LegalSection>

      <LegalSection title="Avec qui nous partageons ces informations">
        <p>Nous partageons le minimum d&apos;informations nécessaire à chacun des prestataires suivants pour remplir sa fonction :</p>
        <ul>
          <li>
            <strong>Supabase</strong> — héberge notre base de données et le stockage de fichiers.
          </li>
          <li>
            <strong>Resend</strong> — envoie les emails transactionnels en notre nom.
          </li>
          <li>
            <strong>Auto.dev</strong> — décode les VIN et recherche les photos spécifiques aux véhicules.
          </li>
          <li>
            <strong>CarImages API</strong> (carimagesapi.com) — fournit des photos génériques de véhicules par marque/modèle/année.
          </li>
          <li>
            <strong>Cloudflare Turnstile</strong> — vérifie que les envois de formulaires proviennent d&apos;un visiteur réel, et non
            d&apos;un robot.
          </li>
        </ul>
        <p>
          Notre équipe interne accède aux données des demandes via un système d&apos;administration authentifié séparément. Cette
          politique décrit ce que nous faisons de vos informations, pas les contrôles de sécurité internes de ce système
          d&apos;administration.
        </p>
      </LegalSection>

      <LegalSection title="Conservation des données">
        <p>
          Nous conservons les informations de demande aussi longtemps que nécessaire pour traiter votre demande et assurer le suivi
          associé. Nous n&apos;appliquons pas actuellement de suppression automatique programmée. Si vous souhaitez que vos informations
          soient consultées, corrigées ou supprimées, contactez-nous (voir ci-dessous) et nous le ferons manuellement.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>Ce site utilise uniquement des cookies nécessaires à son fonctionnement :</p>
        <ul>
          <li>Mémoriser votre langue (français/anglais) et votre préférence de thème clair/sombre.</li>
          <li>Maintenir la connexion d&apos;un membre de l&apos;équipe administrative à l&apos;espace de gestion interne des demandes.</li>
        </ul>
        <p>Nous n&apos;utilisons actuellement aucun cookie publicitaire ou de mesure d&apos;audience.</p>
      </LegalSection>

      <LegalSection title="Vos choix">
        <p>
          Vous pouvez nous contacter à tout moment pour demander quelles informations nous détenons concernant une demande, les faire
          corriger, ou demander leur suppression. Nous évitons volontairement d&apos;exiger un compte : votre numéro de demande associé
          au contact que vous avez fourni suffit à suivre votre demande, et nous ne demandons rien de plus que ce dont chaque formulaire
          a besoin.
        </p>
      </LegalSection>

      <LegalSection title="Modifications de cette politique">
        <p>
          Nous pouvons mettre à jour cette page à mesure que les fonctionnalités du site évoluent. Continuer à utiliser le site après
          une mise à jour signifie que vous acceptez la politique révisée.
        </p>
      </LegalSection>

      {email && (
        <LegalSection title="Contact">
          <p>
            Des questions sur cette politique ou sur vos informations ? Écrivez-nous à <a href={`mailto:${email}`}>{email}</a>.
          </p>
        </LegalSection>
      )}
    </>
  )
}
