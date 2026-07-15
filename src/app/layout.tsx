import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Sistema Clínico Odontológico",
    description: "Sistema clínico administrativo odontológico",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <body>{children}</body>
        </html>
    );
}