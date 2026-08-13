import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "D&P Ingeniería Integral · Plataforma interna",
  description: "Seguimiento operativo, proyectos y presupuestos de D&P Ingeniería Integral S.A.S.",
  manifest: "/site.webmanifest",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data: config } = await supabase.from("app_config").select("tema").eq("id", 1).maybeSingle();
  const tema = config?.tema ?? "verde";

  return (
    <html
      lang="en"
      data-theme={tema}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
