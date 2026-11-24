import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Property CRM sample",
  description: "Reference build: property pipeline with an AI lead agent. Sample data only.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <h1>
            <a href="/">Property CRM sample</a>
          </h1>
          <span>Sample data only. Every address is made up.</span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
