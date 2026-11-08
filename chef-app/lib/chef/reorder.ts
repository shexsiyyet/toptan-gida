import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

export interface TemplateItem {
  product_id: string
  quantity: number
}

export interface ReorderTemplate {
  id: string
  restaurant_id: string
  name: string
  items: TemplateItem[]
  created_at: string
  updated_at: string
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
  order_items?: Array<{
    id: string
    product_id: string
    quantity: number
    unit_price: number
    line_total: number
  }>
}

export async function getReorderTemplates(restaurantId: string): Promise<ReorderTemplate[]> {
  const { data, error } = await supabase
    .from('reorder_templates')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch reorder templates: ${error.message}`)
  }

  return (data || []).map(t => ({
    ...t,
    items: t.items || [],
  }))
}

export async function createReorderTemplate(orderId: string, name: string): Promise<ReorderTemplate> {
  // Get order with items
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('restaurant_id, distributor_id')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new Error('Order not found')
  }

  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId)

  if (itemsError) {
    throw new Error(`Failed to fetch order items: ${itemsError.message}`)
  }

  const templateItems: TemplateItem[] = (orderItems || []).map((item) => ({
    product_id: item.product_id,
    quantity: item.quantity,
  }))

  const { data: template, error: templateError } = await supabase
    .from('reorder_templates')
    .insert({
      restaurant_id: order.restaurant_id,
      name,
      items: templateItems,
    })
    .select()
    .single()

  if (templateError || !template) {
    throw new Error(`Failed to create reorder template: ${templateError?.message}`)
  }

  return {
    ...template,
    items: template.items || [],
  }
}

export async function createOrderFromTemplate(templateId: string): Promise<Order> {
  const { data: template, error: templateError } = await supabase
    .from('reorder_templates')
    .select('restaurant_id, items')
    .eq('id', templateId)
    .single()

  if (templateError || !template) {
    throw new Error('Template not found')
  }

  if (!template.items || template.items.length === 0) {
    throw new Error('Template has no items')
  }

  // Get restaurant to find distributor
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('distributor_id')
    .eq('id', template.restaurant_id)
    .single()

  if (restError || !restaurant) {
    throw new Error('Restaurant not found')
  }

  // Verify current stock and prices
  const productIds = template.items.map((i: TemplateItem) => i.product_id)
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, distributor_id, price, stock_quantity, min_order_qty')
    .in('id', productIds)

  if (prodError) {
    throw new Error(`Failed to fetch products: ${prodError.message}`)
  }

  if (!products || products.length !== template.items.length) {
    throw new Error('Some products not found or unavailable')
  }

  let subtotal = 0
  const orderItems = []

  for (const item of template.items) {
    const product = products.find(p => p.id === item.product_id)
    if (!product) {
      throw new Error(`Product ${item.product_id} not found`)
    }

    if (product.distributor_id !== restaurant.distributor_id) {
      throw new Error(`Product ${item.product_id} not from restaurant's distributor`)
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
      restaurant_id: template.restaurant_id,
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

export async function getOrderHistory(restaurantId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        product_id,
        quantity,
        unit_price,
        line_total
      )
    `)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch order history: ${error.message}`)
  }

  return (data || []).map(o => ({
    ...o,
    subtotal: Number(o.subtotal),
    platform_fee: Number(o.platform_fee),
    total: Number(o.total),
  }))
}