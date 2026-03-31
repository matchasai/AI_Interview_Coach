import { motion as Motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { api, getErrorMessage } from '../services/api'
import { downloadDoubtSessionJson, downloadDoubtSessionPdf } from '../utils/doubtSessionExport'
import { fadeUp } from '../utils/motion'

function formatDateTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString()
}

function buildAssistantText(reply) {
  return [
    reply.answer,
    '',
    'Key points:',
    ...(reply.keyPoints || []).map((p) => `- ${p}`),
    '',
    'Common mistakes:',
    ...(reply.commonMistakes || []).map((p) => `- ${p}`),
  ]
    .filter(Boolean)
    .join('\n')
}

export function DoubtSession() {
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(false)
  const [followupLoading, setFollowupLoading] = useState(false)
  const [error, setError] = useState('')
  const [details, setDetails] = useState(null)
  const [followupQuestion, setFollowupQuestion] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [sessions, setSessions] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [currentSessionId, setCurrentSessionId] = useState('')
  const [exporting, setExporting] = useState('')
  const [historyQuery, setHistoryQuery] = useState('')
  const [renamingSessionId, setRenamingSessionId] = useState('')
  const [renameTopic, setRenameTopic] = useState('')
  const [actionLoading, setActionLoading] = useState('')
  const [linkedMissingKeywords, setLinkedMissingKeywords] = useState([])
  const [miniQuiz, setMiniQuiz] = useState([])

  const filteredSessions = useMemo(() => {
    const q = historyQuery.trim().toLowerCase()
    if (!q) return sessions
    return (sessions || []).filter((s) => String(s.topic || '').toLowerCase().includes(q))
  }, [sessions, historyQuery])

  const pinnedAnswers = useMemo(() => {
    return (chatHistory || []).filter((m) => m.role === 'assistant' && m.pinned)
  }, [chatHistory])

  useEffect(() => {
    let active = true

    async function loadHistory() {
      setHistoryLoading(true)
      try {
        const res = await api.get('/api/ai/doubt-sessions')
        if (!active) return
        setSessions(res.data.sessions || [])
      } catch {
        if (!active) return
        setSessions([])
      } finally {
        if (active) setHistoryLoading(false)
      }
    }

    loadHistory()
    return () => {
      active = false
    }
  }, [])

  async function loadSessionById(id) {
    setError('')
    try {
      const res = await api.get(`/api/ai/doubt-sessions/${id}`)
      const session = res.data.session
      setCurrentSessionId(session._id)
      setTopic(session.topic || '')
      setDetails(session.details || null)
      const normalized = (session.messages || []).map((m) => ({
        role: m.role,
        text: m.text,
        quickFollowups: m.quickFollowups || [],
        pinned: Boolean(m.pinned),
        type: 'message',
      }))
      setChatHistory(normalized)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function refreshHistory() {
    try {
      const res = await api.get('/api/ai/doubt-sessions')
      setSessions(res.data.sessions || [])
    } catch {
      // ignore silently
    }
  }

  async function submitTopic(e) {
    e.preventDefault()
    const clean = topic.trim()
    if (clean.length < 2) {
      setError('Please enter a topic with at least 2 characters.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await api.post('/api/ai/explain-topic', { topic: clean })
      setDetails(res.data.details)
      setCurrentSessionId(res.data.doubtSessionId || '')
      setLinkedMissingKeywords(res.data.linkedMissingKeywords || [])
      setMiniQuiz(res.data.miniQuiz || [])
      setChatHistory([
        {
          role: 'assistant',
          text: `Topic loaded: ${clean}. Ask follow-up doubts below for deeper understanding.`,
          quickFollowups: [],
          pinned: false,
          type: 'system',
        },
      ])
      await refreshHistory()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function askFollowup(e, directQuestion) {
    if (e) e.preventDefault()

    const q = (directQuestion || followupQuestion).trim()
    const currentTopic = topic.trim()

    if (!details || !currentTopic) {
      setError('Please generate topic details first.')
      return
    }

    if (!currentSessionId) {
      setError('Please start a doubt session first.')
      return
    }

    if (q.length < 2) {
      setError('Please enter a follow-up question with at least 2 characters.')
      return
    }

    const nextHistory = [...chatHistory, { role: 'user', text: q, quickFollowups: [], pinned: false, type: 'message' }]
    setChatHistory(nextHistory)
    setFollowupQuestion('')
    setFollowupLoading(true)
    setError('')

    try {
      const res = await api.post('/api/ai/doubt-followup', {
        topic: currentTopic,
        question: q,
        sessionId: currentSessionId,
      })

      const reply = res.data.reply
      const answerText = buildAssistantText(reply)
      if (Array.isArray(reply.miniQuiz) && reply.miniQuiz.length) {
        setMiniQuiz(reply.miniQuiz)
      }

      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: answerText,
          quickFollowups: reply.followUpQuestions || [],
          pinned: false,
          type: 'message',
        },
      ])

      await refreshHistory()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setFollowupLoading(false)
    }
  }

  async function exportCurrent(type) {
    if (!currentSessionId) return
    setExporting(type)
    try {
      const res = await api.get(`/api/ai/doubt-sessions/${currentSessionId}`)
      const fullSession = res.data.session
      if (type === 'json') {
        downloadDoubtSessionJson(fullSession)
      } else {
        await downloadDoubtSessionPdf(fullSession)
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setExporting('')
    }
  }

  function startRename(session) {
    setRenamingSessionId(session._id)
    setRenameTopic(session.topic || '')
  }

  function cancelRename() {
    setRenamingSessionId('')
    setRenameTopic('')
  }

  async function saveRename(sessionId) {
    const next = renameTopic.trim()
    if (next.length < 2) {
      setError('Topic name must be at least 2 characters.')
      return
    }

    setActionLoading(`rename:${sessionId}`)
    setError('')

    try {
      await api.patch(`/api/ai/doubt-sessions/${sessionId}/rename`, { topic: next })
      await refreshHistory()
      if (String(currentSessionId) === String(sessionId)) {
        setTopic(next)
      }
      cancelRename()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading('')
    }
  }

  async function deleteSession(sessionId) {
    setActionLoading(`delete:${sessionId}`)
    setError('')

    try {
      await api.delete(`/api/ai/doubt-sessions/${sessionId}`)
      await refreshHistory()
      if (String(currentSessionId) === String(sessionId)) {
        setCurrentSessionId('')
        setTopic('')
        setDetails(null)
        setChatHistory([])
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading('')
    }
  }

  async function togglePinMessage(messageIndex) {
    if (!currentSessionId) return

    const message = chatHistory[messageIndex]
    if (!message || message.role !== 'assistant') return

    setActionLoading(`pin:${messageIndex}`)
    setError('')

    try {
      const res = await api.patch(`/api/ai/doubt-sessions/${currentSessionId}/pin`, {
        messageIndex,
        pinned: !message.pinned,
      })

      const nextPinned = Boolean(res.data.pinned)
      setChatHistory((prev) => prev.map((m, i) => (i === messageIndex ? { ...m, pinned: nextPinned } : m)))
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setActionLoading('')
    }
  }

  return (
    <Motion.div
      className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[320px_minmax(0,1fr)]"
      initial={fadeUp.initial}
      animate={fadeUp.animate}
      transition={fadeUp.transition}
    >
      <Card>
        <CardHeader title="Doubt History" subtitle="Saved per user" />

        <Input
          label="Search topic"
          placeholder="Search doubt sessions..."
          value={historyQuery}
          onChange={(e) => setHistoryQuery(e.target.value)}
        />

        <div className="mt-3" />

        {historyLoading ? (
          <p className="text-sm text-slate-500">Loading history…</p>
        ) : filteredSessions.length === 0 ? (
          <p className="text-sm text-slate-500">No matching doubt sessions.</p>
        ) : (
          <div className="space-y-2">
            {filteredSessions.map((s) => {
              const active = String(s._id) === String(currentSessionId)
              const isRenaming = String(renamingSessionId) === String(s._id)
              return (
                <div
                  key={s._id}
                  className={`rounded-xl border px-3 py-2 transition ${
                    active
                      ? 'border-indigo-300 bg-indigo-50/70'
                      : 'border-slate-200 bg-white/60 hover:border-indigo-200 hover:bg-slate-50'
                  }`}
                >
                  {isRenaming ? (
                    <div className="space-y-2">
                      <Input value={renameTopic} onChange={(e) => setRenameTopic(e.target.value)} />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          className="px-2 py-1 text-xs"
                          disabled={actionLoading === `rename:${s._id}`}
                          onClick={() => saveRename(s._id)}
                        >
                          Save
                        </Button>
                        <Button type="button" variant="secondary" className="px-2 py-1 text-xs" onClick={cancelRename}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => loadSessionById(s._id)}
                        className="w-full text-left"
                      >
                        <p className="truncate text-sm font-semibold text-slate-900">{s.topic}</p>
                        <p className="mt-1 text-xs text-slate-500">{s.messageCount || 0} messages</p>
                        <p className="text-xs text-slate-500">Updated {formatDateTime(s.updatedAt)}</p>
                      </button>
                      <div className="mt-2 flex items-center gap-2">
                        <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => startRename(s)}>
                          Rename
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                          disabled={actionLoading === `delete:${s._id}`}
                          onClick={() => deleteSession(s._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Doubt Session" subtitle="Ask any topic and get complete interview-ready details" />

          <form onSubmit={submitTopic} className="space-y-3">
            <Input
              label="Topic"
              placeholder="e.g. System Design, REST API, Overfitting, React Hooks..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Generating detailed explanation…' : 'Explain Topic'}
            </Button>
          </form>

          {error ? (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </Card>

        {details ? (
          <Card>
            <CardHeader
              title={`Deep Explanation: ${topic.trim()}`}
              subtitle="Beginner-friendly and interview-ready"
              right={
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    disabled={!currentSessionId || Boolean(exporting)}
                    onClick={() => exportCurrent('json')}
                  >
                    {exporting === 'json' ? 'Exporting…' : 'Export JSON'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 py-1 text-xs"
                    disabled={!currentSessionId || Boolean(exporting)}
                    onClick={() => exportCurrent('pdf')}
                  >
                    {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
                  </Button>
                </div>
              }
            />

            <div className="space-y-4 text-sm text-slate-800">
              {linkedMissingKeywords.length ? (
                <section>
                  <h3 className="font-semibold text-slate-900">0. Linked from your past mistakes</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {linkedMissingKeywords.map((k) => (
                      <span key={k} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        {k}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <h3 className="font-semibold text-slate-900">1. Definition</h3>
                <p className="mt-1">{details.definition}</p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900">2. Why it is used</h3>
                <p className="mt-1">{details.whyUsed}</p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900">3. Example</h3>
                <p className="mt-1">{details.example}</p>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900">4. Applications / Use Cases</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {(details.applications || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="font-semibold text-slate-900">5. Programming Usage</h3>
                <p className="mt-1">{details.programmingUsage}</p>
              </section>
            </div>
          </Card>
        ) : null}

        {details && miniQuiz.length ? (
          <Card>
            <CardHeader title="Follow-up Mini Quiz" subtitle="Auto-generated from your weak areas" />
            <div className="space-y-3">
              {miniQuiz.map((item, idx) => (
                <div key={`${item.question}-${idx}`} className="rounded-xl border border-slate-200 bg-white/70 p-3">
                  <p className="text-sm font-semibold text-slate-900">Q{idx + 1}. {item.question}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-indigo-700">Difficulty: {item.difficulty}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                    {(item.expectedPoints || []).map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {details ? (
          <Card>
            <CardHeader title="Follow-up Doubt Chat" subtitle="Ask deeper doubts on the same topic" />

            {pinnedAnswers.length ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Pinned important answers</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-800">
                  {pinnedAnswers.map((msg, idx) => (
                    <li key={`pinned-${idx}`} className="rounded-lg bg-white/80 px-2 py-1">
                      {msg.text.split('\n')[0]}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-3">
              <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white/70 p-3">
                {chatHistory.length === 0 ? (
                  <p className="text-sm text-slate-500">No follow-up questions yet.</p>
                ) : (
                  chatHistory.map((msg, idx) => (
                    <div key={`${msg.role}-${idx}`} className="space-y-2">
                      <div
                        className={`rounded-xl px-3 py-2 text-sm whitespace-pre-line ${
                          msg.role === 'user'
                            ? 'ml-auto max-w-[90%] bg-indigo-100 text-slate-900'
                            : 'mr-auto max-w-[95%] bg-slate-100 text-slate-800'
                        }`}
                      >
                        {msg.text}
                      </div>

                      {msg.role === 'assistant' ? (
                        <div className="mr-auto flex max-w-[95%] items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            className="px-2 py-1 text-xs"
                            disabled={actionLoading === `pin:${idx}`}
                            onClick={() => togglePinMessage(idx)}
                          >
                            {msg.pinned ? 'Unpin' : 'Pin important'}
                          </Button>
                        </div>
                      ) : null}

                      {msg.role === 'assistant' && Array.isArray(msg.quickFollowups) && msg.quickFollowups.length ? (
                        <div className="mr-auto flex max-w-[95%] flex-wrap gap-2">
                          {msg.quickFollowups.map((chip) => (
                            <button
                              key={`${idx}-${chip}`}
                              type="button"
                              onClick={(e) => askFollowup(e, chip)}
                              disabled={followupLoading}
                              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={askFollowup} className="space-y-2">
                <Input
                  label="Ask a follow-up doubt"
                  placeholder="e.g. Can you explain this with one real backend project example?"
                  value={followupQuestion}
                  onChange={(e) => setFollowupQuestion(e.target.value)}
                />
                <Button type="submit" className="w-full" disabled={followupLoading}>
                  {followupLoading ? 'Thinking…' : 'Ask Follow-up'}
                </Button>
              </form>
            </div>
          </Card>
        ) : null}
      </div>
    </Motion.div>
  )
}
