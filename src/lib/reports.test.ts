import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  calendarDayDiff,
  filterReportFacts,
  groupReportByCarrier,
  groupReportByClient,
  groupReportByDay,
  parseReportPeriod,
  percentChange,
  previousPeriodRange,
  reportFactsToCsv,
  reportPeriodRange,
  sumReportTotals,
  toCsv,
  type ReportFact,
} from "@/lib/reports";

function fact(partial: Partial<ReportFact> & Pick<ReportFact, "id" | "kind" | "createdAt">): ReportFact {
  return {
    clientId: "c1",
    clientName: "Tienda Demo MX",
    carrier: null,
    trackingNumber: null,
    clientPrice: null,
    feeAmount: null,
    providerCost: null,
    walletAmount: null,
    note: null,
    ...partial,
  };
}

const rows: ReportFact[] = [
  fact({
    id: "s1",
    kind: "SALE",
    createdAt: "2026-09-10T18:00:00.000Z",
    carrier: "estafeta",
    trackingNumber: "CE001",
    clientPrice: 180,
    feeAmount: 30,
    providerCost: 150,
    walletAmount: -180,
  }),
  fact({
    id: "s2",
    kind: "SALE",
    clientId: "c2",
    clientName: "Bodega Norte",
    createdAt: "2026-09-12T18:00:00.000Z",
    carrier: "dhl",
    trackingNumber: "CE002",
    clientPrice: 240,
    feeAmount: 40,
    providerCost: 200,
    walletAmount: -240,
  }),
  fact({
    id: "f1",
    kind: "FAILED_SHIPMENT",
    createdAt: "2026-09-11T18:00:00.000Z",
    carrier: "redpack",
    note: "Saldo Envía insuficiente",
  }),
  fact({
    id: "t1",
    kind: "TOP_UP",
    createdAt: "2026-09-02T18:00:00.000Z",
    walletAmount: 500,
    note: "Mercado Pago",
  }),
  fact({
    id: "a1",
    kind: "ADJUSTMENT",
    createdAt: "2026-08-20T18:00:00.000Z",
    walletAmount: -50,
    note: "Ajuste interno",
  }),
];

describe("report period helpers", () => {
  it("parsea el periodo y usa este mes por defecto", () => {
    expect(parseReportPeriod("7d")).toBe("7d");
    expect(parseReportPeriod("nope")).toBe("month");
    expect(parseReportPeriod(undefined)).toBe("month");
  });

  it("suma días de calendario sin sesgo de zona", () => {
    expect(addCalendarDays("2026-09-01", -1)).toBe("2026-08-31");
    expect(addCalendarDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(calendarDayDiff("2026-09-01", "2026-09-30")).toBe(29);
  });

  it("arma rangos MX para hoy, 7 días y mes", () => {
    const now = new Date("2026-09-14T18:00:00.000Z");
    expect(reportPeriodRange("today", now)).toEqual({ from: "2026-09-14", to: "2026-09-14" });
    expect(reportPeriodRange("7d", now)).toEqual({ from: "2026-09-08", to: "2026-09-14" });
    expect(reportPeriodRange("month", now)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(reportPeriodRange("all", now)).toEqual({ from: null, to: null });
  });

  it("calcula el periodo anterior de la misma duración", () => {
    expect(previousPeriodRange("2026-09-08", "2026-09-14")).toEqual({
      from: "2026-09-01",
      to: "2026-09-07",
    });
    expect(previousPeriodRange("2026-09-14", "2026-09-14")).toEqual({
      from: "2026-09-13",
      to: "2026-09-13",
    });
    expect(previousPeriodRange("2026-09-01", "2026-09-30")).toEqual({
      from: "2026-08-02",
      to: "2026-08-31",
    });
  });

  it("calcula el cambio porcentual a un decimal", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(80, 100)).toBe(-20);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(50, 0)).toBeNull();
  });
});

describe("sumReportTotals", () => {
  it("separa ventas, fallos, recargas y ajustes", () => {
    expect(sumReportTotals(rows)).toEqual({
      salesCount: 2,
      purchasedCount: 2,
      failedCount: 1,
      shipmentCount: 3,
      clientPrice: 420,
      fee: 70,
      providerCost: 350,
      topUpCount: 1,
      topUp: 500,
      adjustment: -50,
    });
  });

  it("no cuenta una recarga como venta ni como envío", () => {
    const totals = sumReportTotals([
      fact({
        id: "t",
        kind: "TOP_UP",
        createdAt: "2026-09-01T12:00:00.000Z",
        walletAmount: 1000,
        clientPrice: 1000,
      }),
    ]);
    expect(totals.salesCount).toBe(0);
    expect(totals.shipmentCount).toBe(0);
    expect(totals.clientPrice).toBe(0);
    expect(totals.topUp).toBe(1000);
    expect(totals.topUpCount).toBe(1);
  });
});

describe("filterReportFacts", () => {
  it("filtra por cliente, paquetería, tipo, fechas MX y texto", () => {
    const filtered = filterReportFacts(rows, {
      clientId: "c1",
      carrier: "estafeta",
      kind: "SALE",
      from: "2026-09-01",
      to: "2026-09-30",
      query: "ce001",
    });
    expect(filtered.map((row) => row.id)).toEqual(["s1"]);
  });

  it("incluye el último instante del día MX", () => {
    const late = fact({
      id: "s3",
      kind: "SALE",
      createdAt: "2026-10-01T05:30:00.000Z",
      carrier: "ups",
      clientPrice: 12,
      feeAmount: 2,
      providerCost: 10,
    });
    const filtered = filterReportFacts([...rows, late], {
      from: "2026-09-01",
      to: "2026-09-30",
      kind: "SALE",
    });
    expect(filtered.map((row) => row.id).sort()).toEqual(["s1", "s2", "s3"]);
  });

  it("busca por cliente, rastreo o nota", () => {
    expect(filterReportFacts(rows, { query: "bodega" }).map((row) => row.id)).toEqual(["s2"]);
    expect(filterReportFacts(rows, { query: "mercado" }).map((row) => row.id)).toEqual(["t1"]);
    expect(filterReportFacts(rows, { query: "fallido" }).map((row) => row.id)).toEqual(["f1"]);
  });
});

describe("report breakdowns", () => {
  it("agrupa ventas y recargas por cliente", () => {
    const byClient = groupReportByClient(rows);
    expect(byClient[0]).toMatchObject({
      key: "c2",
      label: "Bodega Norte",
      salesCount: 1,
      clientPrice: 240,
      fee: 40,
    });
    const demo = byClient.find((row) => row.key === "c1");
    expect(demo).toMatchObject({
      salesCount: 1,
      failedCount: 1,
      topUp: 500,
      clientPrice: 180,
    });
  });

  it("agrupa envíos por paquetería e ignora recargas sin carrier", () => {
    const byCarrier = groupReportByCarrier(rows);
    expect(byCarrier.map((row) => row.key)).toEqual(["dhl", "estafeta", "redpack"]);
    expect(byCarrier.find((row) => row.key === "redpack")).toMatchObject({
      failedCount: 1,
      salesCount: 0,
    });
  });

  it("agrupa por día calendario MX", () => {
    const byDay = groupReportByDay([
      fact({
        id: "late",
        kind: "SALE",
        createdAt: "2026-09-13T05:30:00.000Z",
        clientPrice: 12,
        feeAmount: 2,
        providerCost: 10,
      }),
      fact({
        id: "early",
        kind: "SALE",
        createdAt: "2026-09-13T06:00:00.000Z",
        clientPrice: 24,
        feeAmount: 4,
        providerCost: 20,
      }),
    ]);
    expect(byDay).toHaveLength(2);
    expect(byDay.find((row) => row.key === "2026-09-12")?.clientPrice).toBe(12);
    expect(byDay.find((row) => row.key === "2026-09-13")?.clientPrice).toBe(24);
  });
});

describe("CSV export", () => {
  it("escapa comillas y comas", () => {
    expect(toCsv(["Nombre", "Nota"], [["Tienda, MX", 'Dijo "ok"']])).toBe(
      'Nombre,Nota\r\n"Tienda, MX","Dijo ""ok"""\r\n',
    );
  });

  it("exporta el detalle de hechos en español", () => {
    const csv = reportFactsToCsv([rows[0]]);
    expect(csv).toContain("Fecha,Tipo,Cliente,Paquetería");
    expect(csv).toContain("Venta");
    expect(csv).toContain("Tienda Demo MX");
    expect(csv).toContain("Estafeta");
    expect(csv).toContain("CE001");
    expect(csv).toContain("180");
  });
});
