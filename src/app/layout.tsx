import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { SWRegister } from "./_sw-register";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SPARTA AI — スパルタマネージャー",
  description: "音楽スキル習得×タスク管理×AIコーチ。サボったら容赦なく叱咤激励するスパルタ型AI秘書システム。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SPARTA AI",
    startupImage: ["/icons/icon-512.svg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 antialiased pb-16">
        <SWRegister />
        {children}
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
          <div className="max-w-3xl mx-auto flex">
            <Link href="/" className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1 text-gray-500 hover:text-red-600 transition-colors">
              <span className="text-xl">🏠</span>
              <span className="text-[10px] font-medium">SPARTA AI</span>
            </Link>
            <Link href="/sparta" className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1 text-gray-500 hover:text-red-600 transition-colors">
              <span className="text-xl">🔥</span>
              <span className="text-[10px] font-medium">タスク管理</span>
            </Link>
            <Link href="/sports" className="flex-1 flex flex-col items-center gap-0.5 py-2 px-1 text-gray-500 hover:text-red-600 transition-colors">
              <span className="text-xl">💪</span>
              <span className="text-[10px] font-medium">運動</span>
            </Link>
          </div>
        </nav>
      </body>
    </html>
  );
}
