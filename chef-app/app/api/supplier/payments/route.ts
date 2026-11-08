import { createClient } from '@supabase/supabase-js'
import { recordPayment } from '@/lib/supplier/payments'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key'
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, amount, provider, providerRef } = body

    if (!invoiceId || !amount || !provider) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, amount, provider' },
        { status: 400 }
      )
    }

    const payment = await recordPayment(invoiceId, amount, provider, providerRef || '')

    return NextResponse.json({ payment })
  } catch (error) {
    console.error('Record payment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record payment' },
      { status: 500 }
    )
  }
}