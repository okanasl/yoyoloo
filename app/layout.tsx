import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import React from "react";
import { ProjectsProvider } from "@/modules/projects/ctx/projects-ctx";
import { QueryProvider } from "@/modules/query/query-provider";


export const metadata: Metadata = {
  title: "YOYOLOO",
  description: "YOYOLOO",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`h-screen w-screen antialiased`}
      >
        <QueryProvider>
          <ProjectsProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            forcedTheme="light"
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
          </ProjectsProvider>
          </QueryProvider>
      </body>
    </html>
  );
}
