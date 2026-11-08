import { NextRequest, NextResponse } from 'next/server'
import { generateInvoice } from '@/lib/supplier/invoicing'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      )
    }

    const result = await generateInvoice(orderId)

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}
