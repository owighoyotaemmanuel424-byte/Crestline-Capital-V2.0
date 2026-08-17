import "./globals.css";
import "./banking.css";
import type { Metadata } from "next";
import { ConvexClientProvider } from "./ConvexClientProvider";

export const metadata: Metadata = {
  title: "Crestline Capital | Digital Banking",
  description: "Modern digital banking and wealth management experience.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><ConvexClientProvider>{children}</ConvexClientProvider></body></html>;
}
