import { NextRequest, NextResponse } from 'next/server'
import { handlePaymentCallback } from '@/lib/chef/payments'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    await handlePaymentCallback(body)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Payment callback error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}