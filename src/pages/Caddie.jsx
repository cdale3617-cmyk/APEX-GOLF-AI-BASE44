import { useEffect, useRef, useState } from 'react';
import { Download, Headphones, MessageSquareText, Mic, MicOff, Settings2, Trash2 } from 'lucide-react';
import AudioOutput from '@/components/caddie/AudioOutput';
import CommandCheatsheet from '@/components/caddie/CommandCheatsheet';
import PersonalitySelector from '@/components/caddie/PersonalitySelector';
import VoiceControls from '@/components/caddie/VoiceControls';
import PageHeader from '@/components/PageHeader';
import { formatCaddieTranscript } from '@/lib/caddieHistory';
import { useGolf } from '@/lib/GolfContext';

function when(at) {
  const date = new Date(at);
  return Number.isNaN(date.getTime())
    ? 'Saved'
    : date.toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function Caddie() {
  const {
    caddie, updateCaddie, voices, briefing, speak, lastHeard,
    listening, voiceSupported, voiceHistory, clearVoiceHistory,
  } = useGolf();
  const feedRef = useRef(null);
  const [notice, setNotice] = useState('');

  // Keep the newest exchange in view; older conversations remain scrollable.
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [voiceHistory]);

  const downloadTranscript = () => {
    if (!voiceHistory.length) return;
    try {
      const text = formatCaddieTranscript(voiceHistory);
      const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'APEX-Caddie-Conversation-' + new Date().toISOString().slice(0, 10) + '.txt';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Transcript download requested.');
    } catch {
      setNotice('Unable to export the text transcript on this device.');
    }
  };

  const clearHistory = () => {
    if (!voiceHistory.length) return;
    if (!window.confirm('Delete all saved caddie conversation text from this phone?')) return;
    clearVoiceHistory();
    setNotice('Saved conversation cleared.');
  };

  return (
    <div className="absolute inset-0 overflow-y-auto px-3 pb-8 pt-3">
      <div className="mx-auto w-full max-w-3xl space-y-3">
        <PageHeader
          title="Caddie Conversation"
          subtitle="Ask out loud · hear the reply · review what was said"
        />

        <section className="glass-panel rounded-2xl border border-primary/40 p-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${listening ? 'border-primary bg-primary/20 text-primary' : 'border-border bg-muted/60 text-muted-foreground'}`}>
              {listening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-foreground">
                {listening ? 'Hands-free listening' : (voiceSupported ? 'Microphone paused' : 'Speech recognition unavailable')}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {listening
                  ? 'Speak normally. Caddie answers out loud and saves each exchange.'
                  : (voiceSupported
                    ? 'Tap the microphone at the top right to start listening.'
                    : 'This device needs browser speech recognition for voice conversations.')}
              </p>
            </div>
            {listening && <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-primary" aria-label="Listening" />}
          </div>
        </section>

        <section className="glass-panel overflow-hidden rounded-2xl border border-warm/30">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-3">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-extrabold text-foreground">Questions & Answers</h3>
              <span className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                {voiceHistory.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={downloadTranscript} disabled={!voiceHistory.length}
                title="Save conversation as text" aria-label="Export conversation as text file"
                className="flex min-h-10 items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 text-xs font-semibold text-foreground disabled:opacity-40">
                <Download className="h-4 w-4" /> Save
              </button>
              <button type="button" onClick={clearHistory} disabled={!voiceHistory.length}
                title="Clear saved conversation" aria-label="Delete conversation history"
                className="flex min-h-10 items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 text-xs font-semibold text-destructive disabled:opacity-40">
                <Trash2 className="h-4 w-4" /> Clear
              </button>
            </div>
          </div>

          <div ref={feedRef} role="log" aria-label="Saved Caddie conversation"
            className="max-h-[58dvh] min-h-[38dvh] space-y-3 overflow-y-auto overscroll-contain p-3">
            {voiceHistory.length === 0 ? (
              <div className="flex min-h-[30dvh] flex-col items-center justify-center gap-3 px-4 text-center">
                <MessageSquareText className="h-10 w-10 text-primary" />
                <p className="text-base font-bold text-foreground">Ready for your first question</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Tap the top-right mic, then say “What club should I hit?” or “How far to the green?”
                  Your questions and the Caddie's answers will appear here.
                </p>
              </div>
            ) : voiceHistory.map((turn) => (
              <article key={turn.id} className="space-y-1.5">
                <div className="ml-6 rounded-xl border border-border/70 bg-muted/50 px-3 py-2.5">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">You asked</span>
                    <time dateTime={turn.at} className="text-[10px] text-muted-foreground">{when(turn.at)}</time>
                  </div>
                  <p className="break-words text-sm font-semibold leading-relaxed text-foreground">{turn.question}</p>
                </div>
                <div className="mr-6 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Caddie answers</span>
                    <Headphones className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="break-words text-sm leading-relaxed text-foreground">
                    {turn.answer || 'Waiting for a reply…'}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="border-t border-border/70 px-3 py-2">
            <p className="text-[11px] leading-snug text-muted-foreground">
              The last 150 exchanges are kept as text on this phone, not as audio recordings.
              They remain available after closing the app unless you clear app data or delete them here.
            </p>
            {notice && <p role="status" className="mt-1 text-xs font-semibold text-primary">{notice}</p>}
          </div>
        </section>

        <details className="glass-panel rounded-2xl border border-border/70">
          <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-bold text-foreground">
            <Settings2 className="h-4 w-4 text-primary" />
            Voice, sound & commands
            <span className="ml-auto text-[11px] font-normal text-muted-foreground">Settings</span>
          </summary>
          <div className="space-y-3 border-t border-border/70 p-3">
            <section className="space-y-2">
              <h3 className="text-xs font-bold text-foreground">Caddie Personality</h3>
              <PersonalitySelector value={caddie.personality} onChange={(personality) => updateCaddie({ personality })} />
            </section>
            <VoiceControls
              caddie={caddie}
              voices={voices}
              onChange={(patch) => updateCaddie(patch)}
              onTest={() => speak(briefing())}
            />
            <AudioOutput />
            <CommandCheatsheet lastHeard={lastHeard} />
          </div>
        </details>
      </div>
    </div>
  );
}
