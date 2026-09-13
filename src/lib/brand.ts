/** Código Envío lockup — navy + lima sampled from the official mark. */
export const brand = {
  navy: "#0B1B4B",
  lima: "#C4E000",
  navyClaro: "#1F3E8C",
  grisAzulado: "#8FA0B8",
  grisPapel: "#F6F7F9",
  blanco: "#FFFFFF",
  name: "Código Envío",
  shortName: "CodiEnvio",
  group: "Código Envío",
  typeface: "Poppins",
  typeWeights: [400, 500, 600, 700, 800] as const,
  logo: {
    lockup: "/brand/codigo-envio-lockup.png",
    lockupOnDark: "/brand/codigo-envio-lockup-on-dark.png",
    color: "/brand/logo-color.png",
    icon: "/brand/codigo-envio-icon.png",
    iconOnDark: "/brand/codigo-envio-icon-on-dark.png",
  },
} as const;

export const LOGO_ASPECT = 2000 / 516;
