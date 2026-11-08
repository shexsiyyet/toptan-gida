export const metadata = {
  title: 'Toptan Gıda - Wholesale Food Ordering',
  description: 'B2B wholesale food ordering platform for restaurants and distributors',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}