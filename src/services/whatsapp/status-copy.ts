import type { Locale } from '@/src/i18n/config'
import type { RequestStatus } from '@/src/services/admin/statuses'
import type { VehicleRequestStatus } from '@/src/services/admin/vehicle-request-statuses'

type StatusCopy = { label: string; message: string }

const COPY: Record<Locale, Record<RequestStatus | VehicleRequestStatus, StatusCopy>> = {
  fr: {
    request_received: { label: 'Demande reçue', message: 'Votre demande a bien été reçue et sera examinée prochainement.' },
    on_treatment: { label: 'En cours de traitement', message: 'Notre équipe travaille activement sur votre demande.' },
    parts_found: { label: 'Pièces trouvées', message: 'Nous avons trouvé les pièces recherchées et vous contacterons pour la suite.' },
    vehicle_found: { label: 'Véhicule trouvé', message: 'Nous avons trouvé un véhicule correspondant à votre demande.' },
    direct_communication: { label: 'Contact direct', message: 'Un membre de notre équipe va vous contacter directement.' },
    closed: { label: 'Demande terminée', message: 'Votre demande est maintenant terminée. Merci de votre confiance.' },
    cancelled: { label: 'Demande annulée', message: 'Votre demande a été annulée. Contactez-nous si vous pensez qu’il s’agit d’une erreur.' },
  },
  en: {
    request_received: { label: 'Request received', message: 'Your request has been received and will be reviewed shortly.' },
    on_treatment: { label: 'In progress', message: 'Our team is actively working on your request.' },
    parts_found: { label: 'Parts found', message: 'We found the requested parts and will contact you about next steps.' },
    vehicle_found: { label: 'Vehicle found', message: 'We found a vehicle matching your request.' },
    direct_communication: { label: 'Direct communication', message: 'A member of our team will contact you directly.' },
    closed: { label: 'Request completed', message: 'Your request is now complete. Thank you for choosing Dakar Auto.' },
    cancelled: { label: 'Request cancelled', message: 'Your request was cancelled. Contact us if you believe this is a mistake.' },
  },
}

export function getWhatsAppStatusCopy(locale: Locale, status: RequestStatus | VehicleRequestStatus): StatusCopy {
  return COPY[locale][status]
}
