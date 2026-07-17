import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = { title: "Dashbored — Home operations", description: "A private home-server operations console." };

const themeScript = `(() => { try { const saved = localStorage.getItem('console-theme'); const dark = saved === 'dark' || (!saved && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; document.documentElement.classList.toggle('dark', dark); } catch {} })()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body className={`${GeistSans.variable} ${GeistMono.variable} antialiased [font-synthesis:none]`}><Toaster position="bottom-right" richColors />{children}</body></html>;
}
