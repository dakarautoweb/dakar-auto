-- Admin-managed FAQ content for the public /faq page. Replaces the
-- previously hardcoded faqPage.items array in src/i18n/dictionaries/{en,fr}.json
-- so an admin can add/edit/hide/reorder questions without a code deploy.
--
-- category is a free-form nullable text key (e.g. 'general', 'parts',
-- 'vehicleSourcing', 'tracking' — see src/lib/faq-categories.ts for the
-- suggested/extensible set). The public page currently renders one flat
-- list regardless of category; category is stored now so grouping can be
-- added later without another migration.
create table if not exists public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question_fr text not null,
  answer_fr text not null,
  question_en text not null,
  answer_en text not null,
  category text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Matches the public read path's own filter+sort (is_active = true, then
-- sort_order, then created_at as a tiebreaker) and the admin list's full
-- sort_order ordering.
create index if not exists faq_items_public_order_idx on public.faq_items (is_active, sort_order, created_at);
create index if not exists faq_items_sort_order_idx on public.faq_items (sort_order, created_at);

alter table public.faq_items enable row level security;

-- Public (anon or authenticated) may read only active FAQ items — this is
-- the ONLY path the public /faq page is allowed to use.
create policy "Public can read active FAQ items"
  on public.faq_items
  for select
  to anon, authenticated
  using (is_active = true);

-- Admins (existing public.is_admin() SECURITY DEFINER check, same as every
-- other admin-gated table in this project — see src/services/admin/auth.ts)
-- can additionally read hidden items, and are the only ones who can write.
-- Postgres RLS policies for the same command are OR'd together, so this
-- simply adds "all rows" access for admins on top of the public policy
-- above rather than replacing it.
create policy "Admins can read all FAQ items"
  on public.faq_items
  for select
  to authenticated
  using (public.is_admin());

create policy "Admins can insert FAQ items"
  on public.faq_items
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update FAQ items"
  on public.faq_items
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete FAQ items"
  on public.faq_items
  for delete
  to authenticated
  using (public.is_admin());

-- Seed: the 8 FAQ items already live on the public site (previously
-- hardcoded in the i18n dictionaries) so they don't disappear once the
-- public page switches to reading from this table. Guarded by "table is
-- currently empty" (rather than `on conflict`, which has no unique target
-- to key off here) so re-running this migration never duplicates rows.
insert into public.faq_items (question_fr, answer_fr, question_en, answer_en, category, sort_order)
select * from (values
  (
    $$Comment demander une pièce ?$$,
    $$Entrez votre VIN (ou sélectionnez votre véhicule manuellement), choisissez la pièce recherchée parmi nos catégories, puis envoyez votre demande. Aucun compte n’est requis — vous recevrez immédiatement une confirmation et un lien de suivi.$$,
    $$How do I request a part?$$,
    $$Enter your VIN (or select your vehicle manually), choose the part you need from our categories, and submit your request. No account is required — you'll get a confirmation and a tracking link right away.$$,
    'parts',
    0
  ),
  (
    $$Le VIN est-il obligatoire ?$$,
    $$Non. Scanner ou saisir votre VIN permet une identification plus rapide et plus précise, mais vous pouvez toujours identifier votre véhicule manuellement par marque, modèle, année et finition.$$,
    $$Is VIN required?$$,
    $$No. Scanning or entering your VIN gives the fastest, most accurate match, but you can always identify your vehicle manually by make, model, year, and trim instead.$$,
    'general',
    1
  ),
  (
    $$Comment fonctionne la recherche de véhicule ?$$,
    $$Indiquez-nous le véhicule recherché — marque, modèle, plage d’années, budget et autres préférences — et notre équipe effectue une recherche sur des marchés internationaux de confiance avant de revenir vers vous avec des options.$$,
    $$How does vehicle sourcing work?$$,
    $$Tell us the vehicle you're looking for — make, model, year range, budget, and any other preferences — and our team searches trusted international markets on your behalf and follows up with options.$$,
    'vehicleSourcing',
    2
  ),
  (
    $$Comment suivre ma demande ?$$,
    $$Chaque demande reçoit un lien de suivi et un numéro de demande uniques, envoyés par email. Vous pouvez aussi utiliser la page « Suivre une demande » avec votre numéro de demande et l’email ou le téléphone fournis.$$,
    $$How do I track my request?$$,
    $$Every request gets a unique tracking link and request number sent to your email. You can also use the "Track a request" page with your request number and the email or phone you submitted.$$,
    'tracking',
    3
  ),
  (
    $$Puis-je envoyer des photos de la pièce ?$$,
    $$Oui. Lors de l’envoi d’une demande de pièce, vous pouvez joindre des photos directement depuis votre appareil pour aider notre équipe à identifier précisément la pièce recherchée.$$,
    $$Can I upload photos of the part?$$,
    $$Yes. When submitting a parts request, you can attach photos directly from your device to help our team identify the exact part you need.$$,
    'parts',
    4
  ),
  (
    $$Comment Dakar Auto me contacte-t-il ?$$,
    $$Nous vous contactons selon le moyen choisi lors de l’envoi de votre demande — WhatsApp, téléphone ou email — avec des mises à jour sur la disponibilité et les prochaines étapes.$$,
    $$How will Dakar Auto contact me?$$,
    $$We'll reach out using the contact method you choose when submitting your request — WhatsApp, phone, or email — with updates on availability and next steps.$$,
    'general',
    5
  ),
  (
    $$Travaillez-vous partout au Canada ?$$,
    $$Oui, nous acceptons les demandes de partout au Canada. Les délais de disponibilité et de livraison peuvent varier selon la région et selon la pièce ou le véhicule.$$,
    $$Do you serve all of Canada?$$,
    $$Yes, we accept requests from customers across Canada. Availability and delivery timelines may vary by region and by part or vehicle.$$,
    'general',
    6
  ),
  (
    $$Que se passe-t-il après l’envoi d’une demande ?$$,
    $$Notre équipe examine votre demande, vérifie la disponibilité auprès de notre réseau, puis vous contacte avec le prix et les prochaines étapes. Vous pouvez suivre l’avancement à tout moment grâce à votre lien de suivi.$$,
    $$What happens after submitting a request?$$,
    $$Our team reviews your request, checks availability with our sourcing network, and contacts you with pricing and next steps. You can follow progress at any time using your tracking link.$$,
    'tracking',
    7
  )
) as seed(question_fr, answer_fr, question_en, answer_en, category, sort_order)
where not exists (select 1 from public.faq_items);
