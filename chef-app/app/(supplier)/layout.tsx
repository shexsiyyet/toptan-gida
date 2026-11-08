import Link from 'next/link'

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Supplier navigation">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Toptan Gıda
              </Link>
              <div className="hidden md:flex md:gap-6">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Dashboard
                </Link>
                <Link
                  href="/products"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Products
                </Link>
                <Link
                  href="/products/import"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Import
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">Supplier Portal</span>
            </div>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}