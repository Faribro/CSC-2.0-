import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CSC 2.0 Follow-Up Platform",
  description: "Authority follow-up workflow application for Care & Support Centres (CSC)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
