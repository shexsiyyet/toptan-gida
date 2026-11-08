import { getReceivables } from '@/lib/supplier/payments'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // In real app, get distributorId from auth session
    const distributorId = '00000000-0000-0000-0000-000000000001' // placeholder

    const receivables = await getReceivables(distributorId)

    return NextResponse.json({ receivables })
  } catch (error) {
    console.error('Get receivables error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch receivables' },
      { status: 500 }
    )
  }
}