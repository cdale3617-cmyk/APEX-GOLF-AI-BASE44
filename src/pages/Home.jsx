import './Home.css';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, ClipboardList, Crosshair, Ruler } from 'lucide-react';

const QUICK_TOOLS = [
  { to: '/play', title: 'LIVE GPS', detail: 'Hole & distances', icon: Crosshair, tone: 'gps' },
  { to: '/caddie', title: 'AI CADDIE', detail: 'Voice advice', icon: Bot, tone: 'caddie' },
  { to: '/bag', title: 'MY BAG', detail: 'Clubs & gapping', icon: Ruler, tone: 'bag' },
  { to: '/scorecard', title: 'SCORECARD', detail: 'Round & putts', icon: ClipboardList, tone: 'score' },
];

export default function Home() {
  return (
    <div className="apex-home absolute inset-0 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-5xl px-3 pb-7 pt-4 sm:px-6">
        <div className="mb-3 border-l-4 border-[#d7b568] pl-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#d7b568] sm:text-xs">
            APEX GOLF AI · TOUR EDITION
          </p>
        </div>
        <h1 className="apex-home-heading mb-4 text-[clamp(2rem,8vw,4.5rem)] font-black uppercase leading-[1.02] tracking-[0.025em]">
          YOUR ROUND.<br />
          <span>YOUR EDGE.</span>
        </h1>

        <section className="apex-home-hero relative isolate mb-3 flex min-h-[225px] h-[min(34dvh,365px)] flex-col justify-end overflow-hidden rounded-[22px] border border-[#d7b568]/60 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.35)] sm:p-6">
          <div className="relative z-10">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.23em] text-white">
              READY TO PLAY?
            </p>
            <Link
              to="/play?choose=1"
              className="apex-home-start flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-[#d7b568] px-5 py-3 text-left text-sm font-extrabold uppercase tracking-[0.15em] transition-transform active:scale-[0.99] sm:text-base"
            >
              <span>START A ROUND</span>
              <ArrowRight className="h-6 w-6 shrink-0" aria-hidden="true" />
            </Link>
          </div>
        </section>

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
      </div>
    </div>
  );
}
