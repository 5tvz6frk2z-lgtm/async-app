import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Status Loop | Async Reports & EoD Reporting Tool",
  description: "Streamline your team's communication with asynchronous reports. The best tool for daily EoD reports and weekly EoW reports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 antialiased`}>
        <AuthProvider>
          <SettingsProvider>
            {children}
            <Toaster position="top-center" />
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
