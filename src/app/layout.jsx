import AppNav from "@/components/AppNav";
import "./globals.css";

export const metadata = {title: "Gestionale Appartamenti"}

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body className="antialiased font-sans text-gray-800">
        <div className="flex">
          <AppNav />
          <main className="flex-1 h-screen overflow-y-auto bg-gray-50 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
