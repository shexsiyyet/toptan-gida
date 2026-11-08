'use client'

import { generateInvoicePDF, InvoiceData } from '@/lib/supplier/pdf-generator'

export async function generateInvoicePDFClient(data: InvoiceData): Promise<Uint8Array> {
  return generateInvoicePDF(data)
}
