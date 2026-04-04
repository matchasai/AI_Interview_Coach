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
  const questions = Array.isArray(session?.questions) ? session.questions : []
  const answeredQuestions = questions.filter((q) => typeof q?.score === 'number')
  const scores = answeredQuestions.map((q) => Number(q.score) || 0)
  const averageQuestionScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0
  const bestQuestion = answeredQuestions.reduce((best, current) => {
    if (!best) return current
    return (Number(current.score) || 0) > (Number(best.score) || 0) ? current : best
  }, null)
  const weakestQuestion = answeredQuestions.reduce((weakest, current) => {
    if (!weakest) return current
    return (Number(current.score) || 0) < (Number(weakest.score) || 0) ? current : weakest
  }, null)

  doc.setFontSize(16)
  doc.text(title, 14, 16)

  doc.setFontSize(11)
  doc.text(`Role: ${session?.role || '-'}   Difficulty: ${session?.difficulty || '-'}`, 14, 24)
  doc.text(`Status: ${session?.status || '-'}   Overall Score: ${session?.totalScore ?? 0}%`, 14, 30)
  doc.text(`Duration: ${formatDuration(durationSeconds)}   Questions: ${questions.length}`, 14, 36)
  doc.text(`Avg Question Score: ${averageQuestionScore.toFixed(1)} / 10`, 14, 42)

  doc.setFontSize(12)
  doc.text('Question Score Summary', 14, 52)

  const chartX = 14
  const chartY = 58
  const chartWidth = 182
  const chartHeight = 32
  const barGap = 2
  const barWidth = questions.length > 0 ? Math.max(4, (chartWidth - barGap * (questions.length - 1)) / questions.length) : chartWidth

  doc.setDrawColor(226, 232, 240)
  doc.rect(chartX, chartY, chartWidth, chartHeight)

  questions.slice(0, 12).forEach((question, index) => {
    const score = Math.max(0, Number(question?.score) || 0)
    const height = chartHeight * (score / 10)
    const x = chartX + index * (barWidth + barGap)
    const y = chartY + (chartHeight - height)
    doc.setFillColor(59, 130, 246)
    doc.rect(x, y, barWidth, height, 'F')
    doc.setFontSize(7)
    doc.setTextColor(71, 85, 105)
    doc.text(String(index + 1), x + barWidth / 2 - 1.5, chartY + chartHeight + 4)
  })

  if (bestQuestion || weakestQuestion) {
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text(
      `Best: ${Number(bestQuestion?.score || 0).toFixed(1)} | Weakest: ${Number(weakestQuestion?.score || 0).toFixed(1)}`,
      14,
      100,
    )
  }

  const body = questions.map((q, idx) => [
    String(idx + 1),
    String(q?.score ?? '-'),
    String(q?.questionText || '-').slice(0, 80),
    String(q?.feedback || '-').slice(0, 120),
    String(q?.correctAnswer?.short || q?.correctAnswer?.long || '-').slice(0, 120),
  ])

  autoTable(doc, {
    startY: 108,
    head: [['#', 'Score', 'Question', 'Feedback', 'Correct Answer']],
    body,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 16 },
      2: { cellWidth: 58 },
      3: { cellWidth: 52 },
      4: { cellWidth: 54 },
    },
  })

  doc.save(`${buildFileBaseName(session)}.pdf`)
}
