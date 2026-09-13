import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const prismaMocks = vi.hoisted(() => {
  const savedAddress = {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const savedPackage = {
    count: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return { prisma: { savedAddress, savedPackage }, savedAddress, savedPackage };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMocks.prisma }));

import {
  createSavedAddress,
  createSavedPackage,
  deleteSavedAddress,
  formatSavedAddressLine,
  formatSavedPackageLine,
  matchesAddressRole,
  MAX_SAVED_ADDRESSES,
  packageTypeLabel,
  savedAddressTypeLabel,
  toAddressFormFields,
  toPackageFormFields,
  updateSavedAddress,
} from "@/lib/saved-presets";

beforeEach(() => {
  vi.clearAllMocks();
});

const addressInput = {
  label: "Bodega CDMX",
  type: "ORIGIN" as const,
  name: "Edgar Esquivel",
  company: "Tienda Demo MX",
  email: "edgar@demo.mx",
  phone: "5551234567",
  street: "Av. Insurgentes Sur",
  number: "1647",
  district: "Insurgentes Mixcoac",
  city: "Ciudad de México",
  state: "CX",
  postalCode: "03920",
  country: "MX" as const,
  reference: "Local 3",
};

describe("saved preset labels", () => {
  it("etiqueta tipos en español", () => {
    expect(savedAddressTypeLabel("ORIGIN")).toBe("Origen");
    expect(savedAddressTypeLabel("DESTINATION")).toBe("Destino");
    expect(savedAddressTypeLabel("BOTH")).toBe("Origen y destino");
    expect(packageTypeLabel("box")).toBe("Caja");
    expect(packageTypeLabel("envelope")).toBe("Sobre");
    expect(packageTypeLabel("pallet")).toBe("Tarima");
  });

  it("filtra la libreta por rol de cotización", () => {
    expect(matchesAddressRole("BOTH", "origin")).toBe(true);
    expect(matchesAddressRole("ORIGIN", "origin")).toBe(true);
    expect(matchesAddressRole("ORIGIN", "destination")).toBe(false);
    expect(matchesAddressRole("DESTINATION", "destination")).toBe(true);
  });

  it("arma líneas de resumen", () => {
    expect(
      formatSavedAddressLine({
        street: "Av. Constitución",
        number: "123",
        district: "Centro",
        city: "Monterrey",
        state: "NL",
        postalCode: "64060",
      }),
    ).toBe("Av. Constitución 123 · Centro, Monterrey, Nuevo León, 64060");
    expect(
      formatSavedPackageLine({
        weightKg: 0.5,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 10,
        declaredValueMxn: 450,
      }),
    ).toBe("0.5 kg · 30 × 20 × 10 cm · 450.00 MXN");
  });

  it("mapea presets al formulario de cotización", () => {
    const fields = toAddressFormFields({
      id: "a1",
      ...addressInput,
      updatedAt: "2026-09-13T00:00:00.000Z",
    });
    expect(fields.postalCode).toBe("03920");
    expect(fields.district).toBe("Insurgentes Mixcoac");
    expect(
      toPackageFormFields({
        id: "p1",
        nickname: "Caja ropa",
        type: "box",
        content: "Ropa",
        weightKg: 0.5,
        lengthCm: 30,
        widthCm: 20,
        heightCm: 10,
        declaredValueMxn: 450,
        updatedAt: "2026-09-13T00:00:00.000Z",
      }),
    ).toMatchObject({ content: "Ropa", weightKg: "0.5", type: "box" });
  });
});

describe("createSavedAddress", () => {
  it("persiste la dirección con el clientId", async () => {
    prismaMocks.savedAddress.count.mockResolvedValue(0);
    prismaMocks.savedAddress.create.mockResolvedValue({
      id: "a1",
      clientId: "c1",
      ...addressInput,
      createdAt: new Date("2026-09-13T00:00:00.000Z"),
      updatedAt: new Date("2026-09-13T00:00:00.000Z"),
    });

    const result = await createSavedAddress("c1", addressInput);
    expect(result.label).toBe("Bodega CDMX");
    expect(prismaMocks.savedAddress.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ clientId: "c1", label: "Bodega CDMX", type: "ORIGIN" }),
    });
  });

  it("respeta el tope por cliente", async () => {
    prismaMocks.savedAddress.count.mockResolvedValue(MAX_SAVED_ADDRESSES);
    await expect(createSavedAddress("c1", addressInput)).rejects.toMatchObject({
      code: "SAVED_ADDRESS_LIMIT",
    });
    expect(prismaMocks.savedAddress.create).not.toHaveBeenCalled();
  });
});

describe("update and delete stay scoped to the client", () => {
  it("no actualiza una dirección de otro cliente", async () => {
    prismaMocks.savedAddress.findFirst.mockResolvedValue(null);
    await expect(updateSavedAddress("c1", "a9", addressInput)).rejects.toMatchObject({
      code: "SAVED_ADDRESS_NOT_FOUND",
    });
    expect(prismaMocks.savedAddress.update).not.toHaveBeenCalled();
  });

  it("borra solo si el findFirst coincide clientId + id", async () => {
    prismaMocks.savedAddress.findFirst.mockResolvedValue({ id: "a1", clientId: "c1" });
    prismaMocks.savedAddress.delete.mockResolvedValue({});
    await deleteSavedAddress("c1", "a1");
    expect(prismaMocks.savedAddress.findFirst).toHaveBeenCalledWith({
      where: { id: "a1", clientId: "c1" },
    });
    expect(prismaMocks.savedAddress.delete).toHaveBeenCalledWith({ where: { id: "a1" } });
  });
});

describe("createSavedPackage", () => {
  it("guarda medidas y valor declarado", async () => {
    prismaMocks.savedPackage.count.mockResolvedValue(1);
    prismaMocks.savedPackage.create.mockResolvedValue({
      id: "p1",
      clientId: "c1",
      nickname: "Caja ropa",
      type: "box",
      content: "Ropa",
      weightKg: new Prisma.Decimal("0.50"),
      lengthCm: new Prisma.Decimal("30.0"),
      widthCm: new Prisma.Decimal("20.0"),
      heightCm: new Prisma.Decimal("10.0"),
      declaredValueMxn: new Prisma.Decimal("450.00"),
      createdAt: new Date("2026-09-13T00:00:00.000Z"),
      updatedAt: new Date("2026-09-13T00:00:00.000Z"),
    });

    const result = await createSavedPackage("c1", {
      nickname: "Caja ropa",
      type: "box",
      content: "Ropa",
      weightKg: 0.5,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 10,
      declaredValueMxn: 450,
    });
    expect(result).toMatchObject({ nickname: "Caja ropa", weightKg: 0.5, declaredValueMxn: 450 });
  });
});
