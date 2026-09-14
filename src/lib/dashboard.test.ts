import { describe, expect, it } from "vitest";
import {
  LOW_BALANCE_MXN,
  adminClientesHref,
  adminEnviosHref,
  adminFacturacionHref,
  adminReportesHref,
  isLowBalance,
  portalEnviosHref,
} from "@/lib/dashboard";

describe("dashboard hrefs", () => {
  it("arma envíos comprados con rango", () => {
    expect(
      adminEnviosHref({ status: "PURCHASED", from: "2026-09-01", to: "2026-09-14" }),
    ).toBe("/admin/envios?status=PURCHASED&from=2026-09-01&to=2026-09-14");
  });

  it("omite params vacíos", () => {
    expect(adminEnviosHref({})).toBe("/admin/envios");
    expect(adminClientesHref("low")).toBe("/admin/clientes?status=low");
    expect(adminReportesHref({ kind: "SALE" })).toBe("/admin/reportes?kind=SALE");
    expect(adminFacturacionHref({ kind: "TOP_UP" })).toBe("/admin/facturacion?kind=TOP_UP");
    expect(portalEnviosHref({ status: "PURCHASED" })).toBe("/portal/envios?status=PURCHASED");
  });
});

describe("isLowBalance", () => {
  it("marca saldo bajo bajo el umbral", () => {
    expect(isLowBalance(0)).toBe(true);
    expect(isLowBalance(LOW_BALANCE_MXN - 0.01)).toBe(true);
    expect(isLowBalance(LOW_BALANCE_MXN)).toBe(false);
    expect(isLowBalance(500)).toBe(false);
  });
});
