import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Veyra | Buy the proof before you decide",
    template: "%s | Veyra"
  },
  description: "A source-aware evidence workflow for business decisions. Evidence and payment states stay explicit, and unresolved questions go to a person.",
  applicationName: "Veyra",
  robots: { index: false, follow: false }
};

export const viewport: Viewport = {
  themeColor: "#f2f3ef",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}