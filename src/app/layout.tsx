import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute base for social preview images. Set explicitly so it never points at an old domain.
  metadataBase: new URL("https://solvane-watch-configurator.vercel.app"),
  title: "Solvane Fjord: build your watch in 3D",
  description:
    "Configure the Solvane Fjord automatic in real-time 3D. Choose the case, bezel, dial, hands and strap, then share your build.",
  openGraph: {
    title: "Solvane Fjord: 3D watch configurator",
    description: "Design your own automatic watch in real-time 3D.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f2ec",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${manrope.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
