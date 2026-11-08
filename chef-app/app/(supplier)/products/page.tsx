import { createClient } from '@supabase/supabase-js'
import ProductTable from '@/components/supplier/ProductTable'

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

export default async function ProductsPage() {
  // In real app, get distributorId from auth session
  const distributorId = '00000000-0000-0000-0000-000000000001' // placeholder

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('distributor_id', distributorId)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <a
          href="/products/import"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Import Catalog
        </a>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-sm text-gray-500">Manage your product catalog. Click Edit to update price, stock, or availability.</p>
        </div>
        <div className="p-6">
          <ProductTable distributorId={distributorId} initialProducts={products || []} />
        </div>
      </div>
    </div>
  )
}