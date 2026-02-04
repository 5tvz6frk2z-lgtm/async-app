import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { RoleSwitcher } from "@/components/demo/RoleSwitcher";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Status Loop",
  description: "Asynchronous daily status reporting",
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
          {children}
          <RoleSwitcher />
          <Toaster position="top-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
