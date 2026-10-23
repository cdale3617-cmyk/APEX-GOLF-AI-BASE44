import './Home.css';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Bot, ClipboardList, Clock3, Crosshair, Gauge, HeartPulse, History, Map, PersonStanding, Ruler, ScanEye, Search, Smartphone, Target } from 'lucide-react';

const QUICK_TOOLS = [
  { to: '/play', title: 'LIVE GPS', detail: 'Hole & distances', icon: Crosshair, tone: 'gps' },
  { to: '/caddie', title: 'AI CADDIE', detail: 'Voice advice', icon: Bot, tone: 'caddie' },
  { to: '/bag', title: 'MY BAG', detail: 'Clubs & gapping', icon: Ruler, tone: 'bag' },
  { to: '/scorecard', title: 'SCORECARD', detail: 'Round & putts', icon: ClipboardList, tone: 'score' },
];

const MORE_TOOLS = [
  { to: '/swing', title: 'Swing Monitor', icon: PersonStanding },
  { to: '/drills', title: 'Practice & Drills', icon: Target },
  { to: '/green-reader', title: 'Green Reader', icon: ScanEye },
  { to: '/shot-history', title: 'Shot History', icon: History },
  { to: '/shot-studio', title: 'Shot Studio', icon: Activity },
  { to: '/rounds', title: 'Round History', icon: Clock3 },
  { to: '/biometrics', title: 'Biometrics', icon: HeartPulse },
  { to: '/pairing', title: 'S24 / Lenny Pairing', icon: Smartphone },
  { to: '/course-lab', title: 'Course Lab', icon: Map },
  { to: '/tour-suite', title: 'Tour Performance', icon: Gauge },
];

export default function Home() {
  return (
    <div className="apex-home absolute inset-0 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-5xl px-3 pb-6 pt-2 sm:px-6">
        <div className="mb-3 border-l-4 border-[#d7b568] pl-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#d7b568] sm:text-xs">
            APEX GOLF AI · TOUR EDITION
          </p>
        </div>
        <h1 className="apex-home-heading mb-2 text-[clamp(1.55rem,6vw,3.4rem)] font-black uppercase leading-[1.02] tracking-[0.025em]">
          YOUR ROUND.<br />
          <span>YOUR EDGE.</span>
        </h1>

        <section className="apex-home-hero relative isolate mb-3 flex min-h-[145px] h-[min(23dvh,230px)] flex-col justify-end overflow-hidden rounded-[22px] border border-[#d7b568]/60 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.35)] sm:p-6">
          <div className="relative z-10">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.23em] text-white">
              READY TO PLAY?
            </p>
            <Link
              to="/play"
              className="apex-home-start flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-[#d7b568] px-5 py-3 text-left text-sm font-extrabold uppercase tracking-[0.15em] transition-transform active:scale-[0.99] sm:text-base"
            >
              <span>START A ROUND</span>
              <ArrowRight className="h-6 w-6 shrink-0" aria-hidden="true" />
            </Link>
          </div>
        </section>

        <Link
          to="/play"
          className="apex-home-search mb-3 flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-sm font-semibold transition-colors active:opacity-80"
          aria-label="Find a golf course in the rangefinder"
        >
          <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1">Find a golf course</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
        </Link>

        <nav aria-label="Home quick tools" className="grid grid-cols-2 gap-3">
          {QUICK_TOOLS.map(({ to, title, detail, icon: Icon, tone }) => (
            <Link
              key={to}
              to={to}
              className={'apex-home-tool apex-home-tool-' + tone + ' flex min-h-[110px] flex-col justify-between rounded-2xl border p-3 transition-transform active:scale-[0.98] sm:min-h-[140px] sm:p-5'}
              aria-label={title}
            >
              <Icon className="h-7 w-7" aria-hidden="true" />
              <div>
                <span className="block text-sm font-extrabold uppercase tracking-[0.09em] sm:text-lg">{title}</span>
                <span className="mt-0.5 block text-[11px] font-medium opacity-75 sm:text-sm">{detail}</span>
              </div>
            </Link>
          ))}
        </nav>

        <section aria-labelledby="home-tools-title" className="mt-6">
          <h2 id="home-tools-title" className="mb-3 text-sm font-bold uppercase tracking-[0.12em]">Practice & round tools</h2>
          <nav aria-label="All golf tools" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {MORE_TOOLS.map(({ to, title, icon: Icon }) => (
              <Link key={to} to={to} className="apex-home-tool flex min-h-20 items-center gap-3 rounded-2xl border p-3 active:opacity-80">
                <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                <span className="min-w-0 text-xs font-bold leading-snug sm:text-sm">{title}</span>
              </Link>
            ))}
          </nav>
        </section>
      </div>
    </div>
  );
}
