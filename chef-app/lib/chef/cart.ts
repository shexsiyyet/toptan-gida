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
  distributor_name?: string
}

export interface CartItem {
  product_id: string
  quantity: number
}

export interface Order {
  id: string
  restaurant_id: string
  distributor_id: string
  status: string
  subtotal: number
  platform_fee: number
  total: number
  notes: string | null
  created_at: string
  confirmed_at: string | null
}

export interface PriceComparison {
  distributor_id: string
  distributor_name: string
  price: number
  stock: number
}

export async function getAvailableProducts(restaurantId: string): Promise<Product[]> {
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('distributor_id')
    .eq('id', restaurantId)
    .single()

  if (restError || !restaurant) {
    throw new Error('Restaurant not found')
  }

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      distributors!inner(name)
    `)
    .eq('distributor_id', restaurant.distributor_id)
    .eq('is_active', true)
    .gt('stock_quantity', 0)

  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`)
  }

  return (data || []).map(p => ({
    ...p,
    distributor_name: p.distributors?.name,
  }))
}

export async function getPriceComparison(sku: string): Promise<PriceComparison[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      distributor_id,
      price,
      stock_quantity,
      distributors!inner(name)
    `)
    .eq('sku', sku)
    .eq('is_active', true)
    .gt('stock_quantity', 0)

  if (error) {
    throw new Error(`Failed to fetch price comparison: ${error.message}`)
  }

  const results: PriceComparison[] = (data || []).map(p => ({
    distributor_id: p.distributor_id,
    distributor_name: p.distributors?.[0]?.name || 'Unknown',
    price: p.price,
    stock: p.stock_quantity,
  }))

  return results.sort((a, b) => a.price - b.price)
}

export async function createOrder(restaurantId: string, items: CartItem[]): Promise<Order> {
  if (items.length === 0) {
    throw new Error('Cannot create order with empty items')
  }

  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('distributor_id')
    .eq('id', restaurantId)
    .single()

  if (restError || !restaurant) {
    throw new Error('Restaurant not found')
  }

  const productIds = items.map(i => i.product_id)
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, distributor_id, price, stock_quantity, min_order_qty')
    .in('id', productIds)

  if (prodError) {
    throw new Error(`Failed to fetch products: ${prodError.message}`)
  }

  if (!products || products.length !== items.length) {
    throw new Error('Some products not found')
  }

  let subtotal = 0
  const orderItems = []

  for (const item of items) {
    const product = products.find(p => p.id === item.product_id)
    if (!product) {
      throw new Error(`Product ${item.product_id} not found`)
    }

    if (product.stock_quantity < item.quantity) {
      throw new Error(`Insufficient stock for product ${product.id}`)
    }

    if (item.quantity < product.min_order_qty) {
      throw new Error(`Quantity below minimum order (${product.min_order_qty}) for product ${product.id}`)
    }

    const lineTotal = product.price * item.quantity
    subtotal += lineTotal

    orderItems.push({
      product_id: product.id,
      quantity: item.quantity,
      unit_price: product.price,
      line_total: lineTotal,
    })
  }

  const platformFee = Math.round(subtotal * 0.02 * 100) / 100
  const total = subtotal + platformFee

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      restaurant_id: restaurantId,
      distributor_id: restaurant.distributor_id,
      subtotal: subtotal,
      platform_fee: platformFee,
      total: total,
      status: 'pending',
    })
    .select()
    .single()

  if (orderError || !order) {
    throw new Error(`Failed to create order: ${orderError?.message}`)
  }

  const orderItemsWithOrderId = orderItems.map(oi => ({
    ...oi,
    order_id: order.id,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsWithOrderId)

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id)
    throw new Error(`Failed to create order items: ${itemsError.message}`)
  }

  return {
    ...order,
    subtotal,
    platform_fee: platformFee,
    total,
  }
}