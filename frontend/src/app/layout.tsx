import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VentureLens AI — Multi-Project Capital Allocation Advisor",
  description:
    "AI-driven Multi-Project Capital Allocation Advisor combining Real Machine Learning Models, Deterministic Financial Engineering (NPV, IRR, Payback), and PuLP Mathematical Optimization.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090D16] text-slate-100 antialiased selection:bg-teal-500 selection:text-white">
        <div className="fixed inset-0 bg-mesh-dark pointer-events-none z-0" />
        <div className="relative z-10 flex min-h-screen flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
