import { useSpeech } from '../hooks/useSpeech'
import { Button } from './ui/Button'
import { Card, CardHeader } from './ui/Card'

export function VoiceInput({ onTranscript }) {
  const speech = useSpeech()
  const hasTranscript = Boolean(speech.transcript && speech.transcript.trim().length)

  return (
    <Card>
      <CardHeader
        title="Voice Input"
        subtitle={speech.supported ? 'Web Speech API' : 'Not supported in this browser'}
        right={
          <div className="flex items-center gap-2">
            <div className="mr-1 flex items-center gap-2">
              <span
                className={
                  'h-2.5 w-2.5 rounded-full ' +
                  (speech.listening
                    ? 'bg-indigo-600 animate-pulse'
                    : speech.supported
                      ? 'bg-slate-500'
                      : 'bg-slate-700')
                }
                aria-hidden="true"
              />
              <span className="hidden text-xs font-medium text-gray-400 sm:inline">
                {speech.listening ? 'Listening…' : 'Idle'}
              </span>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                speech.reset()
                onTranscript('')
              }}
              disabled={!speech.supported}
            >
              Clear
            </Button>
            {!speech.listening ? (
              <Button
                onClick={() => {
                  speech.start()
                }}
                disabled={!speech.supported}
              >
                Start
              </Button>
            ) : (
              <Button
                variant="danger"
                onClick={() => {
                  speech.stop()
                }}
                disabled={!speech.supported}
              >
                Stop
              </Button>
            )}
          </div>
        }
      />

      {speech.error ? <p className="text-sm text-red-600">{speech.error}</p> : null}

      <div className="mt-2 rounded-lg border border-white/10 bg-[#1e293b] px-3 py-2">
        <p className="whitespace-pre-wrap text-sm text-gray-200">
          {speech.transcript || 'Say something…'}
        </p>
      </div>

      <div className="mt-3">
        <Button
          variant="secondary"
          onClick={() => onTranscript(speech.transcript)}
          disabled={!speech.supported || !hasTranscript}
        >
          Use Transcript
        </Button>
      </div>
    </Card>
  )
}
