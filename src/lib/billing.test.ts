import { describe, expect, it } from "vitest";
import {
  billingPeriodKey,
  buildClientStatement,
  filterBillingEvents,
  formatMxMonthLabel,
  mxCalendarMonth,
  sumBillingTotals,
  toMxDateString,
  type BillingEvent,
} from "@/lib/billing";

function event(partial: Partial<BillingEvent> & Pick<BillingEvent, "id" | "kind" | "createdAt">): BillingEvent {
  return {
    clientId: "c1",
    clientName: "Tienda Demo MX",
    clientPrice: null,
    feeAmount: null,
    providerCost: null,
    shipmentId: null,
    trackingNumber: null,
    walletAmount: null,
    note: null,
    ...partial,
  };
}

describe("mx calendar helpers", () => {
  it("formatea fecha en America/Mexico_City", () => {
    // 06:00 UTC = 00:00 en CDMX (UTC-6, sin DST).
    expect(toMxDateString("2026-09-13T05:59:59.000Z")).toBe("2026-09-12");
    expect(toMxDateString("2026-09-13T06:00:00.000Z")).toBe("2026-09-13");
  });

  it("arma el periodo de un mes calendario", () => {
    expect(billingPeriodKey(2026, 9)).toEqual({
      year: 2026,
      month: 9,
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(billingPeriodKey(2026, 2)).toEqual({
      year: 2026,
      month: 2,
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(formatMxMonthLabel(2026, 9)).toMatch(/septiembre/i);
  });

  it("resuelve el mes actual en zona MX", () => {
    const period = mxCalendarMonth(new Date("2026-09-12T18:00:00.000Z"));
    expect(period).toMatchObject({ year: 2026, month: 9, from: "2026-09-01", to: "2026-09-30" });
  });
});

describe("sumBillingTotals", () => {
  it("suma precio cliente, comisión y costo proveedor solo de ventas", () => {
    const totals = sumBillingTotals([
      event({
        id: "s1",
        kind: "SALE",
        createdAt: "2026-09-10T15:00:00.000Z",
        clientPrice: 120,
        feeAmount: 20,
        providerCost: 100,
      }),
      event({
        id: "s2",
        kind: "SALE",
        createdAt: "2026-09-11T15:00:00.000Z",
        clientPrice: 60,
        feeAmount: 10,
        providerCost: 50,
      }),
      event({
        id: "t1",
        kind: "TOP_UP",
        createdAt: "2026-09-09T15:00:00.000Z",
        walletAmount: 500,
      }),
      event({
        id: "a1",
        kind: "ADJUSTMENT",
        createdAt: "2026-09-09T16:00:00.000Z",
        walletAmount: -20,
      }),
    ]);

    expect(totals).toEqual({
      salesCount: 2,
      clientPrice: 180,
      fee: 30,
      providerCost: 150,
      topUp: 500,
      adjustment: -20,
    });
  });

  it("no trata una carga de saldo como venta", () => {
    const totals = sumBillingTotals([
      event({
        id: "t1",
        kind: "TOP_UP",
        createdAt: "2026-09-01T12:00:00.000Z",
        walletAmount: 1000,
        clientPrice: 1000,
      }),
    ]);
    expect(totals.salesCount).toBe(0);
    expect(totals.clientPrice).toBe(0);
    expect(totals.topUp).toBe(1000);
  });
});

describe("filterBillingEvents", () => {
  const rows: BillingEvent[] = [
    event({
      id: "s1",
      kind: "SALE",
      clientId: "c1",
      createdAt: "2026-09-10T18:00:00.000Z",
      clientPrice: 120,
      feeAmount: 20,
      providerCost: 100,
    }),
    event({
      id: "s2",
      kind: "SALE",
      clientId: "c2",
      clientName: "Otra",
      createdAt: "2026-09-12T18:00:00.000Z",
      clientPrice: 240,
      feeAmount: 40,
      providerCost: 200,
    }),
    event({
      id: "t1",
      kind: "TOP_UP",
      clientId: "c1",
      createdAt: "2026-08-31T18:00:00.000Z",
      walletAmount: 200,
    }),
  ];

  it("filtra por cliente, tipo y rango de fechas MX", () => {
    const filtered = filterBillingEvents(rows, {
      clientId: "c1",
      kind: "SALE",
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(filtered.map((row) => row.id)).toEqual(["s1"]);
  });

  it("incluye el último día del periodo (fecha MX)", () => {
    const late = event({
      id: "s3",
      kind: "SALE",
      createdAt: "2026-10-01T05:30:00.000Z",
      clientPrice: 12,
      feeAmount: 2,
      providerCost: 10,
    });
    const filtered = filterBillingEvents([...rows, late], {
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(filtered.map((row) => row.id).sort()).toEqual(["s1", "s2", "s3"]);
  });
});

describe("buildClientStatement", () => {
  it("arma el estado de cuenta del mes con totales y saldo", () => {
    const statement = buildClientStatement({
      clientId: "c1",
      clientName: "Tienda Demo MX",
      balanceMxn: 380,
      year: 2026,
      month: 9,
      status: "OPEN",
      events: [
        event({
          id: "s1",
          kind: "SALE",
          createdAt: "2026-09-10T18:00:00.000Z",
          clientPrice: 120,
          feeAmount: 20,
          providerCost: 100,
        }),
        event({
          id: "t1",
          kind: "TOP_UP",
          createdAt: "2026-09-02T18:00:00.000Z",
          walletAmount: 500,
        }),
        event({
          id: "old",
          kind: "SALE",
          createdAt: "2026-08-20T18:00:00.000Z",
          clientPrice: 999,
          feeAmount: 100,
          providerCost: 899,
        }),
      ],
    });

    expect(statement.status).toBe("OPEN");
    expect(statement.from).toBe("2026-09-01");
    expect(statement.to).toBe("2026-09-30");
    expect(statement.balanceMxn).toBe(380);
    expect(statement.totals).toEqual({
      salesCount: 1,
      clientPrice: 120,
      fee: 20,
      providerCost: 100,
      topUp: 500,
      adjustment: 0,
    });
  });
});
