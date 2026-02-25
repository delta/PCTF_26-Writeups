import "./globals.css";


export const metadata = {
  title: "Safe Notes App",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
