import { Mic } from 'lucide-react';

const GROUPS = [
  {
    title: 'Hole navigation',
    commands: ['Next hole', 'Previous hole', 'Go to hole 12', 'Skip ahead two', 'Back nine'],
  },
  {
    title: 'Log a score',
    commands: [
      'Made a five with two putts',
      'Birdie',
      'Double bogey on this hole',
      'Missed the fairway',
      'Two putts',
      'Log it',
      'Undo that',
    ],
  },
  {
    title: 'Caddie intel',
    commands: [
      'Give me the full briefing',
      'What club should I hit?',
      'How far to the pin?',
      'Show my bag gaps',
      'Strokes gained report',
      'Tempo check',
    ],
  },
];

export default function CommandCheatsheet({ lastHeard }) {
  return (
    <section className="glass-panel rounded-2xl p-4">
      <h3 className="hud-label mb-1 font-bold text-muted-foreground">Hands-Free Voice Commands</h3>
      <p className="mb-3 text-[11px] leading-snug text-muted-foreground">
        Tap the mic once and it keeps listening — no need to tap again between shots. Your caddie answers out loud and
        logs what you say.
      </p>

      <div className="space-y-3">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <p className="hud-label mb-1.5 font-bold text-muted-foreground">{group.title}</p>
            <div className="flex flex-wrap gap-1.5">
              {group.commands.map((command) => (
                <span
                  key={command}
                  className="rounded-lg border border-border/70 bg-muted/30 px-2 py-1 font-mono text-[10.5px] text-primary"
                >
                  “{command}”
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2">
        <Mic className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <p className="text-[11px] leading-snug text-muted-foreground">
          {lastHeard ? (
            <>
              Heard: <span className="font-semibold text-foreground">{lastHeard}</span>
            </>
          ) : (
            'Nothing heard yet this round.'
          )}
        </p>
      </div>
    </section>
  );
}