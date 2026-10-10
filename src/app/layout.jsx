import AppNav from "@/components/AppNav";
import "./globals.css";
import TemaIniziale from "@/components/TemaIniziale";
import { cookies } from "next/headers";

export const metadata = { title: "Gestionale Appartamenti" };

const initTema = `(function(){try{if(!/(^|; )tema=/.test(document.cookie)&&window.matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}})()`;

export default async function RootLayout({ children }) {
  const tema = (await cookies()).get("tema")?.value;
  return (
    <html lang="it" className={tema === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initTema }} />
      </head>
      <body className="bg-gray-50 font-sans text-gray-800 antialiased">
        <TemaIniziale />
        <div className="flex">
          <AppNav />
          <main className="h-dvh min-w-0 flex-1 overflow-y-auto bg-gray-50 p-4 pt-18 sm:p-6 sm:pt-20 lg:p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
