'use client'

import { useState } from 'react'
import ExcelImport from '@/components/supplier/ExcelImport'

export default function ImportPage() {
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import Catalog</h1>
        <a
          href="/products"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ← Back to Products
        </a>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-3xl">
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Upload Excel File</h2>
          <p className="text-sm text-gray-500">
            Prepare an Excel file with the following columns: <code className="bg-gray-100 px-1 rounded">SKU</code>, <code className="bg-gray-100 px-1 rounded">Name</code>, <code className="bg-gray-100 px-1 rounded">Category</code>, <code className="bg-gray-100 px-1 rounded">Unit</code>, <code className="bg-gray-100 px-1 rounded">Price</code>, <code className="bg-gray-100 px-1 rounded">Stock</code>, <code className="bg-gray-100 px-1 rounded">MinOrderQty</code>
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Required fields: SKU, Name, Category, Unit, Price (≥0), Stock (≥0), MinOrderQty (≥1).
            Turkish/Azeri characters (ı, ğ, ş, ç, ö, ü, ə, İ, Ğ, Ş, Ç, Ö, Ü, Ə) are supported.
          </p>
        </div>

        <ExcelImport
          distributorId="00000000-0000-0000-0000-000000000001"
          onImportComplete={setImportResult}
        />
      </div>

      <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6 max-w-3xl">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Excel Template Example</h2>
        <div className="overflow-x-auto bg-gray-50 rounded border border-gray-200">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">MinOrderQty</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-2 text-sm font-mono">TOM-001</td>
                <td className="px-4 py-2 text-sm">Domates</td>
                <td className="px-4 py-2 text-sm">Sebze</td>
                <td className="px-4 py-2 text-sm">kg</td>
                <td className="px-4 py-2 text-sm">45.00</td>
                <td className="px-4 py-2 text-sm">100</td>
                <td className="px-4 py-2 text-sm">5</td>
              </tr>
              <tr className="border-t border-gray-200 bg-white">
                <td className="px-4 py-2 text-sm font-mono">ONI-001</td>
                <td className="px-4 py-2 text-sm">Soğan</td>
                <td className="px-4 py-2 text-sm">Sebze</td>
                <td className="px-4 py-2 text-sm">kg</td>
                <td className="px-4 py-2 text-sm">25.00</td>
                <td className="px-4 py-2 text-sm">200</td>
                <td className="px-4 py-2 text-sm">10</td>
              </tr>
              <tr className="border-t border-gray-200">
                <td className="px-4 py-2 text-sm font-mono">İSK-001</td>
                <td className="px-4 py-2 text-sm">İşkembe</td>
                <td className="px-4 py-2 text-sm">Et</td>
                <td className="px-4 py-2 text-sm">kg</td>
                <td className="px-4 py-2 text-sm">120.00</td>
                <td className="px-4 py-2 text-sm">50</td>
                <td className="px-4 py-2 text-sm">2</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}