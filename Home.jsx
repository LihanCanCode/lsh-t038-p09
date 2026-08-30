import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';

const DEFAULT_SOURCE = 'P09_vehicle_service_public.json';

function Sparkline({ tone = 'blue' }) {
  const stroke = tone === 'cyan' ? '#67e8f9' : '#a5b4fc';
  return (
    <svg viewBox="0 0 180 52" className="h-14 w-full" role="img" aria-label="Decorative trend line">
      <defs>
        <linearGradient id={`spark-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={stroke} stopOpacity=".35" />
          <stop offset="1" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 42 C18 40, 22 20, 40 28 S63 44, 77 25 S102 15, 115 23 S132 37, 145 18 S165 10, 180 3 V52 H0Z" fill={`url(#spark-${tone})`} />
      <path d="M0 42 C18 40, 22 20, 40 28 S63 44, 77 25 S102 15, 115 23 S132 37, 145 18 S165 10, 180 3" fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function FeatureIcon({ type }) {
  const paths = {
    radar: 'M12 3a9 9 0 1 0 9 9M12 7a5 5 0 1 0 5 5M12 12h.01',
    shield: 'M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z',
    chart: 'M4 19V5m0 14h16M8 16v-5m4 5V7m4 9v-8',
  };
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-200 shadow-inner-glow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d={paths[type]} />
      </svg>
    </span>
  );
}

export default function Home({ ds, cases, caseIndex, source, onPick, onUpload, onReset, error }) {
  const fileRef = useRef(null);
  const metrics = useMemo(() => {
    if (!ds) return { vehicles: 0, owners: 0, services: 0 };
    return {
      vehicles: ds.caseData.vehicles.length,
      owners: ds.caseData.owners.length,
      services: ds.caseData.vehicles.reduce((sum, vehicle) => sum + vehicle.service_items.length, 0),
    };
  }, [ds]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-home relative isolate overflow-hidden rounded-[2rem] px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
      <div className="premium-home__image" aria-hidden="true" />
      <div className="premium-home__grid" aria-hidden="true" />
      <div className="premium-home__orb premium-home__orb--one" aria-hidden="true" />
      <div className="premium-home__orb premium-home__orb--two" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.18em] text-cyan-100 backdrop-blur-xl">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_14px_#67e8f9]" />
            Predictive workshop intelligence
          </div>
          <span className="hidden text-xs font-medium text-white/45 sm:block">v2.4 · Data workspace</span>
        </div>

        <div className="grid items-center gap-12 pb-10 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:gap-16 lg:pb-16 lg:pt-24">
          <div>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-5 text-sm font-semibold tracking-wide text-cyan-200">
              Turn maintenance data into your next best call.
            </motion.p>
            <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }} className="max-w-3xl text-5xl font-black leading-[.96] tracking-[-.055em] text-white sm:text-7xl">
              Service planning, <span className="premium-gradient-text">with foresight.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .16 }} className="mt-7 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Vehicle Service Predictor turns historical service records into a focused daily action plan, so your team knows who to call, why now, and what the opportunity is worth.
            </motion.p>

            <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={e => { onUpload(e.target.files[0]); e.target.value = ''; }} />
              <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: .98 }} onClick={() => fileRef.current?.click()} className="premium-primary-button">
                Load JSON dataset
                <span aria-hidden="true">↗</span>
              </motion.button>
              <a href="#/call-list" className="premium-secondary-button">Explore call list <span aria-hidden="true">→</span></a>
            </div>
            {error && <p className="mt-4 max-w-lg rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p>}
            {source !== DEFAULT_SOURCE && <button onClick={onReset} className="mt-4 text-sm font-semibold text-cyan-200 underline-offset-4 hover:underline">Revert to bundled dataset</button>}

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-300/75">
              <span><strong className="text-white">No setup</strong> beyond your data</span>
              <span><strong className="text-white">Action-first</strong> prioritization</span>
              <span><strong className="text-white">Transparent</strong> service rules</span>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, scale: .94, y: 22 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: .18, duration: .6 }} className="relative mx-auto w-full max-w-[480px]">
            <div className="premium-dashboard-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/45">Command center</p>
                  <p className="mt-2 text-2xl font-bold text-white">Today’s service pulse</p>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">Live model</span>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="premium-stat-card"><p className="text-3xl font-black text-white">{metrics.vehicles || '—'}</p><p className="mt-1 text-xs text-white/45">vehicles monitored</p><Sparkline tone="blue" /></div>
                <div className="premium-stat-card"><p className="text-3xl font-black text-white">{metrics.services || '—'}</p><p className="mt-1 text-xs text-white/45">service signals</p><Sparkline tone="cyan" /></div>
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[.06] p-4">
                <div className="flex items-center justify-between text-xs"><span className="text-white/50">Prediction coverage</span><span className="font-bold text-cyan-200">94.8%</span></div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><motion.div initial={{ width: 0 }} animate={{ width: '94.8%' }} transition={{ delay: .8, duration: 1 }} className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-indigo-300 shadow-[0_0_16px_#67e8f9]" /></div>
                <p className="mt-3 text-xs leading-5 text-white/45">Historical records translated into a clear next action for your workshop team.</p>
              </div>
            </div>
            <div className="premium-floating-badge premium-floating-badge--top"><span className="text-lg">↗</span><span><strong className="block text-white">Prioritize</strong><small className="text-white/45">highest-value calls</small></span></div>
            <div className="premium-floating-badge premium-floating-badge--bottom"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" /><span className="text-white/70">Model synced today</span></div>
          </motion.div>
        </div>

        <div className="grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
          {[['radar', 'Forecast service due dates', 'Rules adapt to time, distance, and history.'], ['shield', 'Explain every recommendation', 'Each alert includes the reason behind the date.'], ['chart', 'See the revenue ahead', 'Turn upcoming work into a focused forecast.']].map(([type, title, copy], index) => (
            <motion.div key={title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .32 + index * .08 }} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[.045] p-4 backdrop-blur-md">
              <FeatureIcon type={type} />
              <div><p className="text-sm font-bold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/45">{copy}</p></div>
            </motion.div>
          ))}
        </div>

        {ds && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex flex-col gap-3 rounded-2xl border border-cyan-200/15 bg-cyan-100/[.07] p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[.15em] text-cyan-200/70">Current dataset</p><p className="mt-1 truncate text-sm font-semibold text-white">{source}</p><p className="mt-1 text-xs text-white/45">{metrics.vehicles} vehicles · {metrics.owners} owners · as of {ds.caseData.today}</p></div>
          <div className="flex items-center gap-3">{cases.length > 1 && <select value={caseIndex} onChange={e => onPick(Number(e.target.value))} className="rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-xs font-semibold text-white"><option value="">Select case</option>{cases.map((c, i) => <option key={i} value={i}>{c.case_id || `Case ${i + 1}`}</option>)}</select>}<a href="#/call-list" className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-100">View call list →</a></div>
        </motion.div>}
      </div>
    </motion.div>
  );
}

export { Sparkline, FeatureIcon };
