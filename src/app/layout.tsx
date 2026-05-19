import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import Footer from "@/components/footer";
import Header from "@/components/header";
import PageLayout from "@/components/page-layout";
import { ThemeProvider } from "@/components/theme-provider";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/toaster";
import StockTicker from "@/components/stock-ticker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "McMurtrey Investing",
  description: "McMurtrey Investing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Header />
          <StockTicker />
          <PageLayout>{children}</PageLayout>
          <Toaster />
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
