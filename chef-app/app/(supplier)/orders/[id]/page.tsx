import OrderDetail from '@/components/supplier/OrderDetail'

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order Detail</h1>
        <a
          href="/orders"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ← Back to Orders
        </a>
      </div>

      <OrderDetail orderId={id} />
    </div>
  )
}
