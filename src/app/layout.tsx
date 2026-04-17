import type { Metadata } from "next";
import { Gelasio, Roboto, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";
import { NavBar } from "@/components/nav-bar";
import { Footer } from "@/components/footer";
import { BfcacheReload } from "@/components/bfcache-reload";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const gelasio = Gelasio({
  variable: "--font-gelasio",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Govroll — See What Your Representatives Are Doing",
  description:
    "Track bills, see how your elected officials vote, and make your voice heard in the legislative process.",
  metadataBase: new URL("https://www.govroll.com"),
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "Govroll",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${roboto.variable} ${geistMono.variable} ${gelasio.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NuqsAdapter>
          <BfcacheReload />
          <NavBar />
          <main className="flex-1">{children}</main>
          <Footer />
        </NuqsAdapter>
      </body>
    </html>
  );
}
