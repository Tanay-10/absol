import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsureShield — Insurance Early Warning System",
  description: "Real-time disaster monitoring and insurance exposure analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
      </head>
      <body className="min-h-screen bg-[#0f172a] text-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
