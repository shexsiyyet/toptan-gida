import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sku = searchParams.get('sku')

  if (!sku) {
    return NextResponse.json({ error: 'SKU is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('products')
    .select(`
      distributor_id,
      price,
      stock_quantity,
      unit,
      distributors!inner(name)
    `)
    .eq('sku', sku)
    .eq('is_active', true)
    .gt('stock_quantity', 0)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = (data || []).map((p: { distributor_id: string; price: number; stock_quantity: number; unit: string; distributors: { name: string }[] }) => ({
    distributor_id: p.distributor_id,
    distributor_name: p.distributors?.[0]?.name || 'Unknown',
    price: p.price,
    stock: p.stock_quantity,
    unit: p.unit,
  }))

  results.sort((a, b) => a.price - b.price)

  return NextResponse.json(results)
}