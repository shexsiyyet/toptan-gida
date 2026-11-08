'use client'

import { Product } from '@/lib/chef/cart'

interface SupplierSelectorProps {
  products: Product[]
  activeSupplierId: string | null
  onSupplierChange: (supplierId: string | null) => void
}

export default function SupplierSelector({ products, activeSupplierId, onSupplierChange }: SupplierSelectorProps) {
  const suppliers = Array.from(
    new Map(products.map(p => [p.distributor_id, { id: p.distributor_id, name: p.distributor_name || 'Unknown' }])).values()
  )

  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex gap-2 min-w-max" role="tablist" aria-label="Suppliers">
        <button
          role="tab"
          aria-selected={activeSupplierId === null}
          onClick={() => onSupplierChange(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            activeSupplierId === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Suppliers
        </button>
        {suppliers.map(supplier => (
          <button
            key={supplier.id}
            role="tab"
            aria-selected={activeSupplierId === supplier.id}
            onClick={() => onSupplierChange(supplier.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeSupplierId === supplier.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {supplier.name}
          </button>
        ))}
      </div>
    </div>
  )
}