import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Garmin Health Connection",
  description: "Your private Garmin activity and recovery context.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
