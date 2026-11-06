import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Crestline Capital | Your financial overview",
  description: "A considered, transparent view of your money with Crestline Capital.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
