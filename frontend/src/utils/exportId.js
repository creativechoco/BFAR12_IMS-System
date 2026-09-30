import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/* High-res capture similar to instructor: scale=3 (~288dpi), CORS enabled */
const CAPTURE_OPTS = {
  scale: 3,
  useCORS: true,
  allowTaint: false,
  backgroundColor: '#ffffff',
  logging: false,
}

const safeName = (name) => (name || 'employee-id').replace(/\s+/g, '_')

const CARD_W_MM = 86.36 // 3.4 in → mm
const CARD_H_MM = 134.62 // 5.3 in → mm
const MARGIN = 8 // mm

async function capture(node) {
  if (!node) throw new Error('Preview not ready')
  return html2canvas(node, CAPTURE_OPTS)
}

function createPdfDoc(frontCanvas, backCanvas) {
  // Two cards side by side on one page
  const pageW = CARD_W_MM * 2 + MARGIN * 3
  const pageH = CARD_H_MM + MARGIN * 2

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [pageH, pageW], // jsPDF: [height, width] when landscape
  })

  const frontData = frontCanvas.toDataURL('image/png')
  const backData = backCanvas.toDataURL('image/png')

  pdf.addImage(frontData, 'PNG', MARGIN, MARGIN, CARD_W_MM, CARD_H_MM)
  pdf.addImage(backData, 'PNG', MARGIN * 2 + CARD_W_MM, MARGIN, CARD_W_MM, CARD_H_MM)

  // Crop marks (optional, matches instructor)
  const markLen = 3
  const markColor = [180, 180, 180]
  pdf.setDrawColor(...markColor)
  pdf.setLineWidth(0.15)

  const drawMark = (x, y, dx, dy) => {
    pdf.line(x, y, x + dx * markLen, y)
    pdf.line(x, y, x, y + dy * markLen)
  }

  // Front card marks
  drawMark(MARGIN - 4, MARGIN - 4, 1, 1)
  drawMark(MARGIN + CARD_W_MM + 4, MARGIN - 4, -1, 1)
  drawMark(MARGIN - 4, MARGIN + CARD_H_MM + 4, 1, -1)
  drawMark(MARGIN + CARD_W_MM + 4, MARGIN + CARD_H_MM + 4, -1, -1)

  // Back card marks
  const bx = MARGIN * 2 + CARD_W_MM
  drawMark(bx - 4, MARGIN - 4, 1, 1)
  drawMark(bx + CARD_W_MM + 4, MARGIN - 4, -1, 1)
  drawMark(bx - 4, MARGIN + CARD_H_MM + 4, 1, -1)
  drawMark(bx + CARD_W_MM + 4, MARGIN + CARD_H_MM + 4, -1, -1)

  return pdf
}

export async function downloadIdPNG(frontEl, backEl, fileName) {
  const [frontCanvas, backCanvas] = await Promise.all([capture(frontEl), capture(backEl)])

  const GAP = 30
  const MARGIN_Y = 20
  const combined = document.createElement('canvas')
  combined.width = frontCanvas.width + backCanvas.width + GAP
  combined.height = Math.max(frontCanvas.height, backCanvas.height) + MARGIN_Y * 2

  const ctx = combined.getContext('2d')
  ctx.fillStyle = '#e8edf2'
  ctx.fillRect(0, 0, combined.width, combined.height)
  ctx.drawImage(frontCanvas, 0, MARGIN_Y)
  ctx.drawImage(backCanvas, frontCanvas.width + GAP, MARGIN_Y)

  const link = document.createElement('a')
  link.download = `${safeName(fileName)}-ID.png`
  link.href = combined.toDataURL('image/png', 1.0)
  link.click()
}

export async function downloadIdPDF(frontEl, backEl, fileName) {
  const [frontCanvas, backCanvas] = await Promise.all([capture(frontEl), capture(backEl)])
  const pdf = createPdfDoc(frontCanvas, backCanvas)
  pdf.save(`${safeName(fileName)}-ID-3.4x5.3in.pdf`)
}

export async function generateIdPdfBlob(frontEl, backEl, fileName) {
  const [frontCanvas, backCanvas] = await Promise.all([capture(frontEl), capture(backEl)])
  const pdf = createPdfDoc(frontCanvas, backCanvas)
  return pdf.output('blob')
}
