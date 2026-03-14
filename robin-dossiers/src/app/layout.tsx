import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Robin des Airs — Dossiers",
  description: "Back-office dossiers indemnisation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
