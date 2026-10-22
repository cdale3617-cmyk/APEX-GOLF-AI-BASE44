import { Link } from 'react-router-dom';
import { ChevronRight, Clock3, Flag, Map, PersonStanding, Target } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const TOOLS = [
  {
    path: '/rounds',
    title: 'Round History',
    detail: 'Previous rounds, scores and handicap',
    icon: Clock3,
  },
  {
    path: '/swing',
    title: 'Swing Monitor',
    detail: 'Video analysis and tour tempo',
    icon: PersonStanding,
  },
  {
    path: '/drills',
    title: 'Practice & Drills',
    detail: 'Targeted training and routines',
    icon: Target,
  },
  {
    path: '/course-lab',
    title: 'Course Lab',
    detail: 'Golf hole graphics and course tools',
    icon: Map,
  },
];

export default function More() {
  return (
    <div className="absolute inset-0 overflow-y-auto px-4 pb-8 pt-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <PageHeader title="More" subtitle="Your additional Apex Golf AI tools" />
        <div className="glass-panel space-y-1.5 rounded-2xl border border-warm/30 p-2">
          {TOOLS.map(({ path, title, detail, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className="flex min-h-16 items-center gap-3 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 transition-colors hover:border-primary/60 hover:bg-primary/10 active:bg-primary/15"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-warm/35 bg-card text-warm">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
            </Link>
          ))}
        </div>
        <div className="glass-card flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-muted-foreground">
          <Flag className="h-4 w-4 shrink-0 text-warm" />
          <span>GPS, Bag, Caddie and Score remain on the main navigation bar.</span>
        </div>
      </div>
    </div>
  );
}
