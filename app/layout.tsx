import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "H 的收整沙龍｜整理小幫手",
  description: "調整心情，安置物品，享受空間。整理清單、斷捨離決策、每日丟一物挑戰，24 小時陪你整理。",
  keywords: "整理, 斷捨離, 收納, 居家整理, 每日丟一物, 小幫手",
  openGraph: {
    title: "H 的收整沙龍｜整理小幫手",
    description: "調整心情，安置物品，享受空間。",
    url: "https://organizer-app-mauve.vercel.app",
    siteName: "H 的收整沙龍",
    locale: "zh_TW",
    type: "website",
  },
  verification: {
    google: "NgxPQT-qA1KgCzZvQtSyj0TRvxzCbAGaXS9r2bdhRU8",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* LINE 內建瀏覽器：強制跳轉外部瀏覽器 */}
        <meta name="x5-orientation" content="portrait" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}