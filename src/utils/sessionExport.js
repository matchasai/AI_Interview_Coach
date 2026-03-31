function safeFilePart(value) {
  return String(value || 'session')
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

export function computeSessionDurationSeconds(session) {
  if (typeof session?.durationSeconds === 'number' && session.durationSeconds >= 0) {
    return session.durationSeconds
  }

  const start = new Date(session?.createdAt || Date.now()).getTime()
  const end = new Date(session?.completedAt || Date.now()).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0
  return Math.round((end - start) / 1000)
}

export function formatDuration(seconds) {
  const s = Math.max(0, Number(seconds) || 0)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60

  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function buildFileBaseName(session) {
  const rolePart = safeFilePart(session?.role)
  const stamp = formatDateStamp(session?.completedAt || session?.createdAt)
  return `${rolePart}-session-${stamp}`
}

export function downloadSessionJson(session) {
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    session,
  }

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${buildFileBaseName(session)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export async function downloadSessionPdf(session) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF()
  const durationSeconds = computeSessionDurationSeconds(session)
  const title = 'AI Interview Session Report'

  doc.setFontSize(16)
  doc.text(title, 14, 16)

  doc.setFontSize(11)
  doc.text(`Role: ${session?.role || '-'}   Difficulty: ${session?.difficulty || '-'}`, 14, 24)
  doc.text(`Status: ${session?.status || '-'}   Score: ${session?.totalScore ?? 0}%`, 14, 30)
  doc.text(`Duration: ${formatDuration(durationSeconds)}`, 14, 36)

  const body = (session?.questions || []).map((q, idx) => [
    String(idx + 1),
    String(q?.score ?? '-'),
    String(q?.questionText || '-').slice(0, 80),
    String(q?.feedback || '-').slice(0, 120),
  ])

  autoTable(doc, {
    startY: 42,
    head: [['#', 'Score', 'Question', 'Feedback']],
    body,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 16 },
      2: { cellWidth: 74 },
      3: { cellWidth: 90 },
    },
  })

  doc.save(`${buildFileBaseName(session)}.pdf`)
}
