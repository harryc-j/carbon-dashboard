import "./globals.css";

export const metadata = {
  title: "Carbon Market Intelligence",
  description: "Attribute-weighted pricing intelligence for carbon credit markets",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}