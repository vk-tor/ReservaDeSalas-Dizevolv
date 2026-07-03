import type { Metadata } from "next";
import { Archivo, DM_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dizevolv | Reserva de Salas",
  description:
    "Sistema de reserva de salas de reunião com validação de conflitos em tempo real.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-dm-sans)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
