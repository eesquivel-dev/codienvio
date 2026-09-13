import { describe, expect, it } from "vitest";
import { mxStateName, normalizeMxState } from "@/lib/mexico";
import {
  applyZipLookup,
  isCompletePostalCode,
  resolveColonia,
  uniqueSuburbs,
  zipFieldMessage,
} from "@/lib/zip-address";

describe("isCompletePostalCode", () => {
  it("solo acepta 5 dígitos", () => {
    expect(isCompletePostalCode("03920")).toBe(true);
    expect(isCompletePostalCode("0392")).toBe(false);
    expect(isCompletePostalCode("039201")).toBe(false);
    expect(isCompletePostalCode("")).toBe(false);
  });
});

describe("resolveColonia", () => {
  it("autoelige si hay una sola colonia", () => {
    expect(resolveColonia("", ["Insurgentes Mixcoac"])).toBe("Insurgentes Mixcoac");
  });

  it("conserva la colonia actual si sigue en la lista", () => {
    expect(resolveColonia("Centro", ["Centro", "Obispado"])).toBe("Centro");
  });

  it("obliga a elegir cuando hay varias y la actual no aplica", () => {
    expect(resolveColonia("Otra", ["Centro", "Obispado"])).toBe("");
    expect(resolveColonia("", ["Centro", "Obispado"])).toBe("");
  });
});

describe("applyZipLookup", () => {
  it("llena ciudad, estado y colonia de un CP con un suburbio", () => {
    const next = applyZipLookup(
      {
        postalCode: "03920",
        city: "",
        state: "NL",
        district: "",
      },
      {
        postalCode: "03920",
        city: "Ciudad de México",
        state: "CX",
        country: "MX",
        suburbs: ["Insurgentes Mixcoac"],
      },
    );
    expect(next).toMatchObject({
      city: "Ciudad de México",
      state: "CX",
      district: "Insurgentes Mixcoac",
    });
  });
});

describe("zipFieldMessage", () => {
  it("no marca error mientras el CP está incompleto", () => {
    expect(zipFieldMessage("idle").error).toBeUndefined();
    expect(zipFieldMessage("loading").error).toBeUndefined();
  });

  it("explica no encontrado y fallas de red", () => {
    expect(zipFieldMessage("not_found").error).toMatch(/no se encontró/i);
    expect(zipFieldMessage("error").error).toMatch(/no se pudo consultar/i);
  });

  it("indica cuántas colonias hay cuando el CP es válido", () => {
    expect(zipFieldMessage("found", 8).hint).toMatch(/8 colonias/);
    expect(zipFieldMessage("found", 1).hint).toMatch(/completados/i);
  });
});

describe("uniqueSuburbs", () => {
  it("quita vacíos y duplicados conservando el orden", () => {
    expect(uniqueSuburbs(["Centro", " ", "Centro", "Obispado"])).toEqual(["Centro", "Obispado"]);
  });
});

describe("normalizeMxState", () => {
  it("entiende alias de Envia (CMX, NLE, MX-CMX)", () => {
    expect(normalizeMxState("MX-CMX")).toBe("CX");
    expect(normalizeMxState("NLE")).toBe("NL");
    expect(normalizeMxState("cx")).toBe("CX");
  });
});

describe("mxStateName", () => {
  it("devuelve el nombre largo del estado", () => {
    expect(mxStateName("nl")).toBe("Nuevo León");
    expect(mxStateName("CX")).toBe("Ciudad de México");
  });
});
