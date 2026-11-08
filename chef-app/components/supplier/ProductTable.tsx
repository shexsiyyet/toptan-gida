'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

export interface Product {
  id: string
  distributor_id: string
  sku: string
  name: string
  category: string
  unit: string
  price: number
  stock_quantity: number
  min_order_qty: number
  is_active: boolean
  created_at: string
}

interface ProductTableProps {
  distributorId: string
  initialProducts: Product[]
}

const PAGE_SIZE = 20

export default function ProductTable({ distributorId, initialProducts }: ProductTableProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Product>>({})
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.ceil(products.length / PAGE_SIZE)
  const paginatedProducts = products.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  async function handleSave(productId: string) {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('products')
        .update({
          price: editForm.price,
          stock_quantity: editForm.stock_quantity,
          is_active: editForm.is_active,
        })
        .eq('id', productId)

      if (error) throw error

      setProducts(products.map(p =>
        p.id === productId ? { ...p, ...editForm } : p
      ))
      setEditingId(null)
      setEditForm({})
    } catch (err) {
      alert(`Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  function handleEditClick(product: Product) {
    setEditingId(product.id)
    setEditForm({
      price: product.price,
      stock_quantity: product.stock_quantity,
      is_active: product.is_active,
    })
  }

  function handleCancel() {
    setEditingId(null)
    setEditForm({})
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('az-AZ', { style: 'currency', currency: 'AZN' }).format(price)
  }

  function renderPagination() {
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, products.length)} to {Math.min(currentPage * PAGE_SIZE, products.length)} of {products.length} products
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Order</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paginatedProducts.map((product) => (
            <tr key={product.id} className={editingId === product.id ? 'bg-blue-50' : ''}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.sku}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.unit}</td>
              {editingId === product.id ? (
                <>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      min="0"
                      value={editForm.stock_quantity}
                      onChange={(e) => setEditForm({ ...editForm, stock_quantity: parseInt(e.target.value) })}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.min_order_qty}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={editForm.is_active ? 'true' : 'false'}
                      onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'true' })}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleSave(product.id)}
                      disabled={loading}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium mr-3"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="text-gray-500 hover:text-gray-700 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatPrice(product.price)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.stock_quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.min_order_qty}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleEditClick(product)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {renderPagination()}
      {products.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No products found. <a href="/products/import" className="text-blue-600 hover:underline">Import catalog</a> to get started.
        </div>
      )}
    </div>
  )
}