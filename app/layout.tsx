import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = "https://organizer-app-mauve.vercel.app";
const GA_ID = process.env.NEXT_PUBLIC_GA_ID; // e.g. G-XXXXXXXXXX

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "整理小幫手｜H 的收整沙龍",
    template: "%s｜整理小幫手",
  },
  description:
    "調整心情，安置物品，享受空間。整理清單、斷捨離決策、每日丟一物挑戰，24 小時陪你整理生活空間。由整理師 H 打造的免費整理工具。",
  keywords: [
    "整理",
    "斷捨離",
    "收納",
    "居家整理",
    "每日丟一物",
    "整理清單",
    "整理師",
    "整理小幫手",
    "H 的收整沙龍",
    "空間整理",
    "生活整理",
    "極簡",
  ],
  authors: [{ name: "H 的收整沙龍", url: "https://www.instagram.com/i.am.ych" }],
  creator: "H 的收整沙龍",
  publisher: "H 的收整沙龍",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "整理小幫手｜H 的收整沙龍",
    description:
      "調整心情，安置物品，享受空間。整理清單、斷捨離決策、每日丟一物挑戰，24 小時陪你整理。",
    url: BASE_URL,
    siteName: "整理小幫手",
    locale: "zh_TW",
    type: "website",
    images: [
      {
        url: `${BASE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "整理小幫手｜H 的收整沙龍",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "整理小幫手｜H 的收整沙龍",
    description: "調整心情，安置物品，享受空間。整理清單、斷捨離決策、每日丟一物挑戰。",
    images: [`${BASE_URL}/og-image.png`],
  },
  alternates: {
    canonical: BASE_URL,
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
        <meta name="x5-orientation" content="portrait" />
        <meta name="theme-color" content="#FAF8F4" />
        <link rel="canonical" href={BASE_URL} />
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "整理小幫手",
              url: BASE_URL,
              description:
                "調整心情，安置物品，享受空間。整理清單、斷捨離決策、每日丟一物挑戰，24 小時陪你整理。",
              applicationCategory: "LifestyleApplication",
              operatingSystem: "All",
              inLanguage: "zh-TW",
              author: {
                "@type": "Person",
                name: "H",
                url: "https://www.instagram.com/i.am.ych",
              },
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "TWD",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Google Analytics GA4 */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  );
}
