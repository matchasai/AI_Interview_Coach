import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export function useSpeech() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition || null

  const supported = Boolean(SpeechRecognition)

  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supported) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setError('')
      setListening(true)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognition.onerror = (e) => {
      setError(e?.error || 'Speech recognition error')
      setListening(false)
    }

    recognition.onresult = (event) => {
      let finalText = ''
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result[0]?.transcript || ''
        if (result.isFinal) finalText += text
        else interimText += text
      }

      setTranscript((prev) => {
        const base = prev.trim().length ? prev.trim() + ' ' : ''
        return (base + finalText + interimText).trim()
      })
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [SpeechRecognition, supported])

  const start = useCallback(() => {
    if (!supported || !recognitionRef.current) return
    setError('')
    try {
      recognitionRef.current.start()
    } catch {
      // start() can throw if called twice; ignore.
    }
  }, [supported])

  const stop = useCallback(() => {
    if (!supported || !recognitionRef.current) return
    recognitionRef.current.stop()
  }, [supported])

  const reset = useCallback(() => {
    setTranscript('')
    setError('')
  }, [])

  const value = useMemo(
    () => ({ supported, listening, transcript, error, start, stop, reset }),
    [supported, listening, transcript, error, start, stop, reset],
  )

  return value
}
