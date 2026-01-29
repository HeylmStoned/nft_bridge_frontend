import type { Metadata } from "next";
import { headers } from "next/headers";
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

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto =
    headersList.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  return {
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
}

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
