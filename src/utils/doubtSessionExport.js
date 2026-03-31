function safeFilePart(value) {
  return String(value || 'doubt-session')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatDateStamp(dateLike = Date.now()) {
  const d = new Date(dateLike)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}${mm}${dd}-${hh}${mi}`
}

function buildFileBaseName(session) {
  return `${safeFilePart(session?.topic)}-doubt-${formatDateStamp(session?.updatedAt || session?.createdAt)}`
}

export function downloadDoubtSessionJson(session) {
  const payload = {
    exportedAt: new Date().toISOString(),
    doubtSession: session,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${buildFileBaseName(session)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function downloadDoubtSessionPdf(session) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF()
  const title = 'AI Doubt Session Report'

  doc.setFontSize(16)
  doc.text(title, 14, 16)
  doc.setFontSize(11)
  doc.text(`Topic: ${session?.topic || '-'}`, 14, 24)
  doc.text(`Updated: ${new Date(session?.updatedAt || Date.now()).toLocaleString()}`, 14, 30)

  const details = session?.details || {}
  const overview = [
    `Definition: ${details.definition || '-'}`,
    `Why used: ${details.whyUsed || '-'}`,
    `Programming usage: ${details.programmingUsage || '-'}`,
  ].join('\n\n')

  const splitOverview = doc.splitTextToSize(overview, 182)
  doc.setFontSize(10)
  doc.text(splitOverview, 14, 38)

  const startY = Math.min(120, 42 + splitOverview.length * 5)
  const body = (session?.messages || []).map((m, idx) => [
    String(idx + 1),
    m?.role || '-',
    String(m?.text || '-').slice(0, 220),
  ])

  autoTable(doc, {
    startY,
    head: [['#', 'Role', 'Message']],
    body,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 24 },
      2: { cellWidth: 156 },
    },
  })

  doc.save(`${buildFileBaseName(session)}.pdf`)
}
