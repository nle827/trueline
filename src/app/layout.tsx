import type { Metadata } from "next";
import { Archivo, Courier_Prime, Public_Sans } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo" });
const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans" });
const courierPrime = Courier_Prime({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-courier-prime" });

export const metadata: Metadata = {
  title: { default: "Trueline", template: "%s · Trueline" },
  description: "Job management for a fictional home-improvement contractor. A portfolio demo.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${publicSans.variable} ${courierPrime.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
