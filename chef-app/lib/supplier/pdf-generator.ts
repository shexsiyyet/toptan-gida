import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface InvoiceData {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  supplier: {
    name: string
    contactName: string
    phone: string
    email: string
    address: string
    taxNumber: string
  }
  buyer: {
    name: string
    contactName: string
    phone: string
    email: string
    address: string
    taxNumber: string
  }
  items: Array<{
    name: string
    unit: string
    quantity: number
    unitPrice: number
  }>
}

const VAT_RATE = 0.18
const PAGE_MARGIN = 50
const PAGE_BOTTOM_MARGIN = 100
const ROW_HEIGHT = 22

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('az-AZ', { style: 'currency', currency: 'AZN' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface DrawContext {
  page: any
  font: any
  fontBold: any
  y: number
  pageWidth: number
  pageHeight: number
  colWidths: number[]
  colStarts: number[]
}

async function ensureSpace(ctx: DrawContext, needed: number = ROW_HEIGHT): Promise<DrawContext> {
  if (ctx.y - needed < PAGE_BOTTOM_MARGIN) {
    // Add new page
    const pdfDoc = ctx.page.getDocument()
    const newPage = pdfDoc.addPage([ctx.pageWidth, ctx.pageHeight])
    ctx.page = newPage
    ctx.y = ctx.pageHeight - PAGE_MARGIN
    // Redraw table header on new page
    drawTableHeader(ctx)
  }
  return ctx
}

function drawTableHeader(ctx: DrawContext) {
  const totalWidth = ctx.colWidths.reduce((a, b) => a + b, 0)
  ctx.page.drawRectangle({
    x: PAGE_MARGIN,
    y: ctx.y - 2,
    width: totalWidth,
    height: 20,
    color: rgb(0.9, 0.9, 0.9)
  })
  const headers = ['#', 'Ürün', 'Birim', 'Miktar', 'Birim Fiyat', 'KDV (18%)', 'Toplam']
  headers.forEach((h, i) => {
    ctx.page.drawText(h, { x: ctx.colStarts[i] + 5, y: ctx.y + 4, size: 9, font: ctx.fontBold })
  })
  ctx.y -= 25
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const colWidths = [40, 200, 60, 60, 80, 80, 80]
  const colStarts = [PAGE_MARGIN]
  for (let i = 1; i < colWidths.length; i++) {
    colStarts.push(colStarts[i - 1] + colWidths[i - 1])
  }

  let ctx: DrawContext = {
    page,
    font,
    fontBold,
    y: height - PAGE_MARGIN,
    pageWidth: width,
    pageHeight: height,
    colWidths,
    colStarts,
  }

  // Header
  ctx.page.drawText('Toptan Gıda Faturası', { x: PAGE_MARGIN, y: ctx.y, size: 24, font: fontBold, color: rgb(0, 0, 0) })
  ctx.y -= 40

  // Invoice number and date
  ctx.page.drawText(`Fatura No: ${data.invoiceNumber}`, { x: PAGE_MARGIN, y: ctx.y, size: 12, font: fontBold })
  ctx.page.drawText(`Tarih: ${data.issueDate}`, { x: 400, y: ctx.y, size: 12, font })
  ctx.y -= 20
  ctx.page.drawText(`Vade: ${data.dueDate}`, { x: 400, y: ctx.y, size: 12, font })
  ctx.y -= 30

  // Supplier info
  ctx.page.drawText('SATICI (Tedarikçi)', { x: PAGE_MARGIN, y: ctx.y, size: 12, font: fontBold })
  ctx.y -= 18
  ctx.page.drawText(`${data.supplier.name}`, { x: PAGE_MARGIN, y: ctx.y, size: 10, font: fontBold })
  ctx.y -= 15
  ctx.page.drawText(`Yetkili: ${data.supplier.contactName}`, { x: PAGE_MARGIN, y: ctx.y, size: 10, font })
  ctx.y -= 15
  ctx.page.drawText(`Adres: ${data.supplier.address}`, { x: PAGE_MARGIN, y: ctx.y, size: 10, font })
  ctx.y -= 15
  ctx.page.drawText(`Tel: ${data.supplier.phone} | Email: ${data.supplier.email}`, { x: PAGE_MARGIN, y: ctx.y, size: 10, font })
  ctx.y -= 15
  ctx.page.drawText(`Vergi No: ${data.supplier.taxNumber}`, { x: PAGE_MARGIN, y: ctx.y, size: 10, font })
  ctx.y -= 30

  // Buyer info
  ctx.page.drawText('ALICI (Restoran)', { x: PAGE_MARGIN, y: ctx.y, size: 12, font: fontBold })
  ctx.y -= 18
  ctx.page.drawText(`${data.buyer.name}`, { x: PAGE_MARGIN, y: ctx.y, size: 10, font: fontBold })
  ctx.y -= 15
  ctx.page.drawText(`Yetkili: ${data.buyer.contactName}`, { x: PAGE_MARGIN, y: ctx.y, size: 10, font })
  ctx.y -= 15
  ctx.page.drawText(`Adres: ${data.buyer.address}`, { x: PAGE_MARGIN, y: ctx.y, size: 10, font })
  ctx.y -= 15
  ctx.page.drawText(`Tel: ${data.buyer.phone} | Email: ${data.buyer.email}`, { x: PAGE_MARGIN, y: ctx.y, size: 10, font })
  ctx.y -= 15
  ctx.page.drawText(`Vergi No: ${data.buyer.taxNumber}`, { x: PAGE_MARGIN, y: ctx.y, size: 10, font })
  ctx.y -= 30

  // Table header
  drawTableHeader(ctx)

  // Line items
  let subtotal = 0
  let totalVat = 0

  for (let idx = 0; idx < data.items.length; idx++) {
    const item = data.items[idx]
    const lineSubtotal = item.quantity * item.unitPrice
    const vatAmount = lineSubtotal * VAT_RATE
    const lineTotal = lineSubtotal + vatAmount
    subtotal += lineSubtotal
    totalVat += vatAmount

    ctx = await ensureSpace(ctx)

    const row = [
      String(idx + 1),
      item.name,
      item.unit,
      String(item.quantity),
      formatCurrency(item.unitPrice),
      formatCurrency(vatAmount),
      formatCurrency(lineTotal),
    ]

    const totalWidth = colWidths.reduce((a, b) => a + b, 0)
    ctx.page.drawRectangle({
      x: PAGE_MARGIN,
      y: ctx.y - 2,
      width: totalWidth,
      height: 20,
      color: idx % 2 === 0 ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1)
    })
    row.forEach((cell, i) => {
      ctx.page.drawText(cell, { x: ctx.colStarts[i] + 5, y: ctx.y + 4, size: 9, font: ctx.font })
    })
    ctx.y -= ROW_HEIGHT
  }

  const grandTotal = subtotal + totalVat

  // Totals
  ctx = await ensureSpace(ctx, 80)
  ctx.y -= 10
  const totalX = ctx.colStarts[ctx.colStarts.length - 2] + 5
  ctx.page.drawText('Ara Toplam:', { x: totalX, y: ctx.y, size: 10, font: fontBold })
  ctx.page.drawText(formatCurrency(subtotal), { x: ctx.colStarts[ctx.colStarts.length - 1] + 5, y: ctx.y, size: 10, font: fontBold })
  ctx.y -= 18
  ctx.page.drawText('KDV (%18):', { x: totalX, y: ctx.y, size: 10, font: fontBold })
  ctx.page.drawText(formatCurrency(totalVat), { x: ctx.colStarts[ctx.colStarts.length - 1] + 5, y: ctx.y, size: 10, font: fontBold })
  ctx.y -= 18
  ctx.page.drawText('GENEL TOPLAM:', { x: totalX, y: ctx.y, size: 12, font: fontBold })
  ctx.page.drawText(formatCurrency(grandTotal), { x: ctx.colStarts[ctx.colStarts.length - 1] + 5, y: ctx.y, size: 12, font: fontBold })

  // Payment terms
  ctx.y -= 40
  ctx.page.drawText(`Ödeme Koşulları: Fatura tarihinden 30 gün içinde ödenmelidir.`, { x: PAGE_MARGIN, y: ctx.y, size: 10, font })
  ctx.y -= 15
  ctx.page.drawText(`Vade Tarihi: ${data.dueDate}`, { x: PAGE_MARGIN, y: ctx.y, size: 10, font: fontBold })

  return pdfDoc.save()
}
