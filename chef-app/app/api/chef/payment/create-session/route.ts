import { NextRequest, NextResponse } from 'next/server'
import { createPaymentSession } from '@/lib/chef/payments'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id } = body

    if (!order_id) {
      return NextResponse.json({ error: 'order_id required' }, { status: 400 })
    }

    const result = await createPaymentSession(order_id)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Create payment session error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}