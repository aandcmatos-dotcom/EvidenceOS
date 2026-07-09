import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evidence OS – Case Organization for Self-Represented Litigants",
  description: "Organize case evidence, build timelines, and prepare for hearings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
