import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseUrl = "https://bridge.badbunnz.xyz";

export const metadata: Metadata = {
  title: "Bad Bunnz Bridge",
  description: "Bridge your Bad Bunnz NFTs between Ethereum and MegaETH",
  metadataBase: new URL(baseUrl),
  openGraph: {
    title: "Bad Bunnz Bridge",
    description: "Bridge your Bad Bunnz NFTs between Ethereum and MegaETH",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bad Bunnz Bridge",
    description: "Bridge your Bad Bunnz NFTs between Ethereum and MegaETH",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
