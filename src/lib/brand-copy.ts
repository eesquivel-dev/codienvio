import { brand } from "@/lib/brand";

/** Client-facing commercial copy (es-MX). Never frames the product as resale. */
export const clientCopy = {
  productName: brand.name,
  metadataTitle: brand.name,
  metadataDescription:
    "Cotiza, compara y compra guías de envío en México. Precios claros, saldo en MXN y rastreo en una sola plataforma.",

  landingEyebrow: "Plataforma de envíos · México",
  landingTitle: "Tu mejor opción para enviar",
  landingLead:
    "Código Envío es la plataforma moderna para cotizar, comparar y comprar guías. Precios claros en MXN, saldo listo y rastreo en un solo lugar — con la rapidez que tu operación necesita.",
  landingCta: "Iniciar sesión",
  landingCtaSession: "Ir al panel",
  landingDocs: "Documentación API",
  trackTitle: "Rastrea tu guía",
  trackLead: "Escribe el número de rastreo para ver el estado del envío.",
  trackPlaceholder: "Número de rastreo",
  trackCta: "Rastrear",
  trackBusy: "Consultando…",
  trackNotFound: "No encontramos esa guía. Revisa el número e inténtalo de nuevo.",
  trackUnavailable: "No pudimos consultar el rastreo. Inténtalo de nuevo en un momento.",
  trackNoEvents: "Aún no hay eventos de rastreo para esta guía.",
  trackPageTitle: "Rastreo",
  trackPageLead: "Consulta el estado de una guía con su número de rastreo. No necesitas iniciar sesión.",

  loginEyebrow: "Portal de envíos",
  loginTitle: "Entra a tu cuenta",
  loginLead: "Cotiza, compara y compra guías con precios claros en MXN.",
  loginPanelTitle: "Envíos claros, al instante",
  loginPanelLead:
    "Tecnología hecha para tu operación: cotiza en segundos, elige con confianza y compra tu guía sin rodeos.",

  portalEyebrow: "Portal Código Envío",
  portalLead:
    "Cotiza un envío doméstico, compara paqueterías y compra tu guía. Precios claros en MXN, saldo listo y rastreo en un solo lugar.",
  quoteRatesHint: (balanceLabel: string) =>
    `Precios en MXN, de menor a mayor. Se cobran de tu saldo (${balanceLabel}).`,
  saldoLead:
    "Recarga tu saldo Código Envío con Mercado Pago: paga aquí (tarjeta, OXXO o SPEI) o con tu cuenta de Mercado Pago. Úsalo para comprar guías cuando las necesites.",
  libretaLead:
    "Guarda direcciones y paquetes para reutilizarlos al cotizar. El alias te ayuda a reconocerlos en el formulario.",
  docsLead:
    "Autenticación con API key por cliente. Cotiza, compra guías y consulta envíos. Las respuestas incluyen el precio en MXN.",
  docsBuyLead:
    "Compra la guía a partir de quoteId + rateId. Se cobra de tu saldo prepagado. Si no alcanza, responde 402.",

  mpItemTitle: "Recarga de saldo Código Envío",
  mpItemDescription: "Saldo para cotizar y comprar guías de envío.",
} as const;

export const landingBenefits = [
  {
    title: "Cotiza en segundos",
    body: "Origen, destino y paquete. Tarifas al instante para que decidas sin esperar.",
  },
  {
    title: "Compara con claridad",
    body: "Paqueterías lado a lado por precio y tiempo de entrega. Eliges tú, sin sorpresas.",
  },
  {
    title: "Compra tu guía",
    body: "Paga con tu saldo, descarga el PDF y comparte el rastreo el mismo día.",
  },
] as const;

export const loginBenefits = [
  "Precios competitivos y claros en MXN",
  "Compra de guías en minutos",
  "Saldo y rastreo en un solo portal",
] as const;

export const CLIENT_COPY_FORBIDDEN =
  /reventa|revendedor|convenio|cuenta negociada|markup|costo (de )?(envia|envía)|monedero Envía|operador paga/i;
