import { z } from "zod";
import { isMxState, normalizeMxState } from "@/lib/mexico";

export const addressSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  company: z.string().trim().max(80).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Correo inválido")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .min(10, "El teléfono debe tener al menos 10 dígitos")
    .max(20),
  street: z.string().trim().min(3, "La calle es obligatoria").max(120),
  number: z.string().trim().max(20).optional().or(z.literal("")),
  district: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().min(2, "La ciudad es obligatoria").max(80),
  state: z
    .string()
    .trim()
    .transform(normalizeMxState)
    .refine(isMxState, "Usa el código de estado de 2 letras (ej. NL, CX, JA)"),
  postalCode: z.string().trim().regex(/^\d{5}$/, "El código postal debe tener 5 dígitos"),
  country: z.literal("MX").default("MX"),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
});

export const packageSchema = z.object({
  type: z.enum(["box", "envelope", "pallet"]).default("box"),
  content: z.string().trim().min(2, "Describe el contenido").max(80),
  weightKg: z.coerce.number().positive("El peso debe ser mayor a 0").max(70),
  lengthCm: z.coerce.number().positive("El largo debe ser mayor a 0").max(200),
  widthCm: z.coerce.number().positive("El ancho debe ser mayor a 0").max(200),
  heightCm: z.coerce.number().positive("El alto debe ser mayor a 0").max(200),
  declaredValueMxn: z.coerce.number().min(0).max(200000),
});

export const quoteRequestSchema = z.object({
  origin: addressSchema,
  destination: addressSchema,
  packages: z.array(packageSchema).min(1).max(5),
});

export const purchaseFromQuoteSchema = z.object({
  quoteId: z.string().min(1),
  rateId: z.string().min(1),
});

export const createClientSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  companyName: z.string().trim().min(2).max(80),
  feePercent: z.coerce.number().min(0).max(100).optional().nullable(),
  feeFixedMxn: z.coerce.number().min(0).max(10000).optional().nullable(),
});

export const updateClientSchema = z.object({
  clientId: z.string().trim().min(1),
  companyName: z.string().trim().min(2).max(80),
  feePercent: z.coerce.number().min(0).max(100).optional().nullable(),
  feeFixedMxn: z.coerce.number().min(0).max(10000).optional().nullable(),
});

export const markBillingPeriodSchema = z.object({
  clientId: z.string().trim().min(1),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  status: z.enum(["OPEN", "FACTURADO"]),
  note: z.string().trim().max(200).optional().or(z.literal("")),
});

export const adjustBalanceSchema = z.object({
  clientId: z.string().trim().min(1),
  amountMxn: z.coerce.number().positive("El monto debe ser mayor a 0").max(1_000_000),
  direction: z.enum(["credit", "debit"]),
  note: z.string().trim().min(2, "Indica un motivo").max(200),
});

export const TOP_UP_MIN_MXN = 50;
export const TOP_UP_MAX_MXN = 50_000;
export const TOP_UP_PRESETS_MXN = [200, 500, 1000, 2000, 5000] as const;

export const walletTopUpSchema = z.object({
  amountMxn: z.coerce
    .number({ invalid_type_error: "Indica un monto válido en MXN" })
    .refine((value) => Number.isFinite(value), "Indica un monto válido en MXN")
    .refine((value) => value >= TOP_UP_MIN_MXN, `El mínimo de recarga es ${TOP_UP_MIN_MXN} MXN`)
    .refine((value) => value <= TOP_UP_MAX_MXN, `El máximo de recarga es ${TOP_UP_MAX_MXN} MXN`),
});

export const settingsSchema = z.object({
  enviaToken: z.string().trim().optional().or(z.literal("")),
  enviaEnvironment: z.enum(["sandbox", "production"]),
  defaultFeePercent: z.coerce.number().min(0).max(100),
  defaultFeeFixedMxn: z.coerce.number().min(0).max(10000),
  mockMode: z.coerce.boolean().optional().default(false),
});

export type AddressInput = z.infer<typeof addressSchema>;
export type PackageInput = z.infer<typeof packageSchema>;
export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
