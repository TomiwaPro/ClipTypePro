import type { Metadata } from "next";
import { DM_Sans, Space_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "ClipType Pro — Copy it. We type it.",
  description:
    "ClipType Pro monitors your clipboard and types text character by character into any field, simulating perfect human keystrokes.",
};

// Inline script: read the persisted theme from localStorage and apply
// data-theme to <html> BEFORE first paint. Avoids the dark→light flash
// that returning users see while React hydrates and ThemeProvider's
// useEffect catches up. Runs sync; failure is fine (defaults to dark).
const themeBootstrap = `
(function(){try{var t=localStorage.getItem('ctp_theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${dmSans.variable} ${spaceMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
