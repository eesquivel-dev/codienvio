export const MX_STATES = [
  { code: "AG", name: "Aguascalientes" },
  { code: "BC", name: "Baja California" },
  { code: "BS", name: "Baja California Sur" },
  { code: "CM", name: "Campeche" },
  { code: "CS", name: "Chiapas" },
  { code: "CH", name: "Chihuahua" },
  { code: "CX", name: "Ciudad de México" },
  { code: "CO", name: "Coahuila" },
  { code: "CL", name: "Colima" },
  { code: "DG", name: "Durango" },
  { code: "GT", name: "Guanajuato" },
  { code: "GR", name: "Guerrero" },
  { code: "HG", name: "Hidalgo" },
  { code: "JA", name: "Jalisco" },
  { code: "EM", name: "Estado de México" },
  { code: "MI", name: "Michoacán" },
  { code: "MO", name: "Morelos" },
  { code: "NA", name: "Nayarit" },
  { code: "NL", name: "Nuevo León" },
  { code: "OA", name: "Oaxaca" },
  { code: "PU", name: "Puebla" },
  { code: "QT", name: "Querétaro" },
  { code: "QR", name: "Quintana Roo" },
  { code: "SL", name: "San Luis Potosí" },
  { code: "SI", name: "Sinaloa" },
  { code: "SO", name: "Sonora" },
  { code: "TB", name: "Tabasco" },
  { code: "TM", name: "Tamaulipas" },
  { code: "TL", name: "Tlaxcala" },
  { code: "VE", name: "Veracruz" },
  { code: "YU", name: "Yucatán" },
  { code: "ZA", name: "Zacatecas" },
] as const;

export const MX_STATE_CODES = MX_STATES.map((state) => state.code);

export const MX_STATE_ALIASES: Record<string, string> = {
  DF: "CX",
  CDMX: "CX",
  CMX: "CX",
  MEX: "EM",
  JC: "JA",
  JAL: "JA",
};

export function normalizeMxState(code: string): string {
  const upper = code.trim().toUpperCase();
  return MX_STATE_ALIASES[upper] ?? upper;
}

export function isMxState(code: string): boolean {
  return (MX_STATE_CODES as readonly string[]).includes(normalizeMxState(code));
}
