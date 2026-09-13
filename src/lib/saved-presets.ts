import type { SavedAddress, SavedAddressType, SavedPackage } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { asMoney } from "@/lib/money";
import { mxStateName } from "@/lib/mexico";
import { prisma } from "@/lib/prisma";
import type { SavedAddressInput, SavedPackageInput } from "@/lib/validations";

export const MAX_SAVED_ADDRESSES = 40;
export const MAX_SAVED_PACKAGES = 30;

export type SavedAddressDTO = {
  id: string;
  label: string;
  type: SavedAddressType;
  name: string;
  company: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  reference: string;
  updatedAt: string;
};

export type SavedPackageDTO = {
  id: string;
  nickname: string;
  type: "box" | "envelope" | "pallet";
  content: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValueMxn: number;
  updatedAt: string;
};

export type AddressFormFields = {
  name: string;
  company: string;
  email: string;
  phone: string;
  street: string;
  number: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  reference: string;
};

export type PackageFormFields = {
  type: "box" | "envelope" | "pallet";
  content: string;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  declaredValueMxn: string;
};

const PACKAGE_TYPES = ["box", "envelope", "pallet"] as const;

export function savedAddressTypeLabel(type: SavedAddressType): string {
  if (type === "ORIGIN") return "Origen";
  if (type === "DESTINATION") return "Destino";
  return "Origen y destino";
}

export function packageTypeLabel(type: string): string {
  if (type === "envelope") return "Sobre";
  if (type === "pallet") return "Tarima";
  return "Caja";
}

export function matchesAddressRole(type: SavedAddressType, role: "origin" | "destination"): boolean {
  if (type === "BOTH") return true;
  return role === "origin" ? type === "ORIGIN" : type === "DESTINATION";
}

export function formatSavedAddressLine(address: Pick<SavedAddressDTO, "street" | "number" | "district" | "city" | "state" | "postalCode">): string {
  const street = [address.street, address.number].filter(Boolean).join(" ");
  const locality = [address.district, address.city, mxStateName(address.state), address.postalCode]
    .filter(Boolean)
    .join(", ");
  return [street, locality].filter(Boolean).join(" · ");
}

export function formatSavedPackageLine(pkg: Pick<SavedPackageDTO, "weightKg" | "lengthCm" | "widthCm" | "heightCm" | "declaredValueMxn">): string {
  return `${pkg.weightKg} kg · ${pkg.lengthCm} × ${pkg.widthCm} × ${pkg.heightCm} cm · ${asMoney(pkg.declaredValueMxn).toFixed(2)} MXN`;
}

export function toAddressFormFields(address: SavedAddressDTO): AddressFormFields {
  return {
    name: address.name,
    company: address.company,
    email: address.email,
    phone: address.phone,
    street: address.street,
    number: address.number,
    district: address.district,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    reference: address.reference,
  };
}

export function toPackageFormFields(pkg: SavedPackageDTO): PackageFormFields {
  return {
    type: pkg.type,
    content: pkg.content,
    weightKg: String(pkg.weightKg),
    lengthCm: String(pkg.lengthCm),
    widthCm: String(pkg.widthCm),
    heightCm: String(pkg.heightCm),
    declaredValueMxn: String(pkg.declaredValueMxn),
  };
}

function blank(value: string | undefined | null): string {
  return (value ?? "").trim();
}

function asPackageType(type: string): SavedPackageDTO["type"] {
  return (PACKAGE_TYPES as readonly string[]).includes(type) ? (type as SavedPackageDTO["type"]) : "box";
}

export function toSavedAddressDTO(row: SavedAddress): SavedAddressDTO {
  return {
    id: row.id,
    label: row.label,
    type: row.type,
    name: row.name,
    company: row.company,
    email: row.email,
    phone: row.phone,
    street: row.street,
    number: row.number,
    district: row.district,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    country: row.country,
    reference: row.reference,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toSavedPackageDTO(row: SavedPackage): SavedPackageDTO {
  return {
    id: row.id,
    nickname: row.nickname,
    type: asPackageType(row.type),
    content: row.content,
    weightKg: Number(row.weightKg),
    lengthCm: Number(row.lengthCm),
    widthCm: Number(row.widthCm),
    heightCm: Number(row.heightCm),
    declaredValueMxn: asMoney(row.declaredValueMxn),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function addressData(input: SavedAddressInput) {
  return {
    label: input.label.trim(),
    type: input.type,
    name: input.name.trim(),
    company: blank(input.company),
    phone: input.phone.trim(),
    email: blank(input.email),
    street: input.street.trim(),
    number: blank(input.number),
    district: blank(input.district),
    city: input.city.trim(),
    state: input.state,
    postalCode: input.postalCode,
    country: input.country ?? "MX",
    reference: blank(input.reference),
  };
}

function packageData(input: SavedPackageInput) {
  return {
    nickname: input.nickname.trim(),
    type: input.type,
    content: input.content.trim(),
    weightKg: input.weightKg,
    lengthCm: input.lengthCm,
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    declaredValueMxn: asMoney(input.declaredValueMxn),
  };
}

export async function listSavedAddresses(clientId: string): Promise<SavedAddressDTO[]> {
  const rows = await prisma.savedAddress.findMany({
    where: { clientId },
    orderBy: [{ updatedAt: "desc" }],
  });
  return rows.map(toSavedAddressDTO);
}

export async function listSavedPackages(clientId: string): Promise<SavedPackageDTO[]> {
  const rows = await prisma.savedPackage.findMany({
    where: { clientId },
    orderBy: [{ updatedAt: "desc" }],
  });
  return rows.map(toSavedPackageDTO);
}

export async function listClientPresets(clientId: string): Promise<{
  addresses: SavedAddressDTO[];
  packages: SavedPackageDTO[];
}> {
  const [addresses, packages] = await Promise.all([
    listSavedAddresses(clientId),
    listSavedPackages(clientId),
  ]);
  return { addresses, packages };
}

export async function createSavedAddress(clientId: string, input: SavedAddressInput): Promise<SavedAddressDTO> {
  const count = await prisma.savedAddress.count({ where: { clientId } });
  if (count >= MAX_SAVED_ADDRESSES) {
    throw new AppError(
      `Puedes guardar hasta ${MAX_SAVED_ADDRESSES} direcciones. Elimina una para agregar otra.`,
      400,
      "SAVED_ADDRESS_LIMIT",
    );
  }
  const row = await prisma.savedAddress.create({
    data: { clientId, ...addressData(input) },
  });
  return toSavedAddressDTO(row);
}

export async function updateSavedAddress(
  clientId: string,
  id: string,
  input: SavedAddressInput,
): Promise<SavedAddressDTO> {
  const existing = await prisma.savedAddress.findFirst({ where: { id, clientId } });
  if (!existing) {
    throw new AppError("No encontramos esa dirección", 404, "SAVED_ADDRESS_NOT_FOUND");
  }
  const row = await prisma.savedAddress.update({
    where: { id: existing.id },
    data: addressData(input),
  });
  return toSavedAddressDTO(row);
}

export async function deleteSavedAddress(clientId: string, id: string): Promise<void> {
  const existing = await prisma.savedAddress.findFirst({ where: { id, clientId } });
  if (!existing) {
    throw new AppError("No encontramos esa dirección", 404, "SAVED_ADDRESS_NOT_FOUND");
  }
  await prisma.savedAddress.delete({ where: { id: existing.id } });
}

export async function createSavedPackage(clientId: string, input: SavedPackageInput): Promise<SavedPackageDTO> {
  const count = await prisma.savedPackage.count({ where: { clientId } });
  if (count >= MAX_SAVED_PACKAGES) {
    throw new AppError(
      `Puedes guardar hasta ${MAX_SAVED_PACKAGES} paquetes. Elimina uno para agregar otro.`,
      400,
      "SAVED_PACKAGE_LIMIT",
    );
  }
  const row = await prisma.savedPackage.create({
    data: { clientId, ...packageData(input) },
  });
  return toSavedPackageDTO(row);
}

export async function updateSavedPackage(
  clientId: string,
  id: string,
  input: SavedPackageInput,
): Promise<SavedPackageDTO> {
  const existing = await prisma.savedPackage.findFirst({ where: { id, clientId } });
  if (!existing) {
    throw new AppError("No encontramos ese paquete", 404, "SAVED_PACKAGE_NOT_FOUND");
  }
  const row = await prisma.savedPackage.update({
    where: { id: existing.id },
    data: packageData(input),
  });
  return toSavedPackageDTO(row);
}

export async function deleteSavedPackage(clientId: string, id: string): Promise<void> {
  const existing = await prisma.savedPackage.findFirst({ where: { id, clientId } });
  if (!existing) {
    throw new AppError("No encontramos ese paquete", 404, "SAVED_PACKAGE_NOT_FOUND");
  }
  await prisma.savedPackage.delete({ where: { id: existing.id } });
}
