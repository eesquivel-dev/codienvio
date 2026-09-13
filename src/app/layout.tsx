import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { Providers } from "@/components/providers";
import { clientCopy } from "@/lib/brand-copy";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  fallback: ["Arial", "Liberation Sans", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: clientCopy.metadataTitle,
    template: `%s · ${clientCopy.productName}`,
  },
  description: clientCopy.metadataDescription,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" className={`${poppins.variable} ${geistMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
