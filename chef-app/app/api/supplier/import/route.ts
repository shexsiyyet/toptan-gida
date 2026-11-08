import { NextRequest, NextResponse } from 'next/server'
import { importCatalogFromExcel } from '@/lib/supplier/catalog'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { file, distributorId } = body

    if (!file || !distributorId) {
      return NextResponse.json(
        { imported: 0, errors: ['Missing file or distributorId'] },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(file)
    const result = await importCatalogFromExcel(buffer, distributorId)

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { imported: 0, errors: [`Server error: ${err instanceof Error ? err.message : 'Unknown error'}`] },
      { status: 500 }
    )
  }
}