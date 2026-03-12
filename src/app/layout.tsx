import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "USUHS DOM- Faculty Feedback",
  description: "Anonymous student feedback collection for faculty"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
