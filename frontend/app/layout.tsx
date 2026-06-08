import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import Providers from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title:       "KuikResume — AI-Powered Resume Optimizer",
  description: "Tailor your resume to any job description with AI. Export as PDF, DOCX, or LaTeX.",
  icons: {
    icon:     [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-neutral-50 font-sans antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: "#0a0a0a",
                color: "#fafafa",
                borderRadius: "100px",
                fontSize: "0.8125rem",
                fontWeight: "500",
                padding: "10px 18px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
