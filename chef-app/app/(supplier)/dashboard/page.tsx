import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

interface StatCardProps {
  title: string
  value: string | number
  description?: string
}

function StatCard({ title, value, description }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
      <dd className="mt-1 text-3xl font-semibold text-gray-900">{value}</dd>
      {description && <dd className="mt-2 text-sm text-gray-500">{description}</dd>}
    </div>
  )
}

async function getStats(distributorId: string) {
  const [products, restaurants, orders, invoices] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('distributor_id', distributorId),
    supabase.from('restaurants').select('id', { count: 'exact', head: true }).eq('distributor_id', distributorId),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('distributor_id', distributorId).eq('status', 'pending'),
    supabase.from('invoices').select('amount:total').eq('distributor_id', distributorId).eq('status', 'paid').gte('paid_at', new Date(new Date().setDate(1)).toISOString()),
  ])

  const revenueThisMonth = invoices.data?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0

  return {
    totalProducts: products.count || 0,
    activeRestaurants: restaurants.count || 0,
    pendingOrders: orders.count || 0,
    revenueThisMonth,
  }
}

export default async function DashboardPage() {
  // In real app, get distributorId from auth session
  const distributorId = '00000000-0000-0000-0000-000000000001' // placeholder
  const stats = await getStats(distributorId)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          description="Active products in catalog"
        />
        <StatCard
          title="Active Restaurants"
          value={stats.activeRestaurants}
          description="Restaurants ordering from you"
        />
        <StatCard
          title="Pending Orders"
          value={stats.pendingOrders}
          description="Orders awaiting confirmation"
        />
        <StatCard
          title="Revenue This Month"
          value={`₼${stats.revenueThisMonth.toLocaleString()}`}
          description="Paid invoices this month"
        />
      </dl>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <a
            href="/products/import"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Import Catalog</h3>
            <p className="mt-1 text-sm text-gray-500">Upload Excel file to add products</p>
          </a>
          <a
            href="/products"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors"
          >
            <h3 className="font-medium text-gray-900">Manage Products</h3>
            <p className="mt-1 text-sm text-gray-500">Edit prices, stock, availability</p>
          </a>
          <a
            href="#"
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-500 transition-colors"
          >
            <h3 className="font-medium text-gray-900">View Orders</h3>
            <p className="mt-1 text-sm text-gray-500">Process pending orders</p>
          </a>
        </div>
      </div>
    </div>
  )
}