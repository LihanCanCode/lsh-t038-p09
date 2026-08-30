import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

/*
  Drop-in replacements for the existing CallList and CallRow components.
  These components intentionally use the existing Engine, Chip, Empty, and
  STATUS helpers from your current App file.
*/

function PriorityMark({ tone = 'blue' }) {
  return <span className={`premium-call-list__priority premium-call-list__priority--${tone}`} aria-hidden="true" />;
}

function PremiumCallRow({ row, onCopy, copied, index = 0 }) {
  const actionable = [...row.overdue, ...row.dueSoon, ...row.unknown];
  const severity = row.overdue.length ? 'critical' : row.dueSoon.length ? 'soon' : 'review';

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '40px' }}
      transition={{ delay: (index % 12) * .035, duration: .35, ease: 'easeOut' }}
      whileHover={{ y: -3 }}
      className="premium-call-card group"
    >
      <div className={`premium-call-card__accent premium-call-card__accent--${severity}`} />
      <div className="relative z-10 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityMark tone={severity === 'critical' ? 'rose' : severity === 'soon' ? 'amber' : 'blue'} />
              <h3 className="text-base font-bold tracking-tight text-slate-950 sm:text-lg">{row.owner.name}</h3>
              {row.chronicOnly && <span className="premium-call-card__microtag">Backlog</span>}
            </div>
            {row.owner.phone && (
              <a href={`tel:${row.owner.phone}`} className="mt-1 inline-flex text-sm font-semibold text-indigo-600 transition hover:text-cyan-600 hover:underline tnum">
                {row.owner.phone}
              </a>
            )}
            <p className="mt-3 text-sm text-slate-600">
              <a href={`#/vehicle/${row.vehicle.id}`} className="font-bold text-slate-900 underline decoration-slate-300 underline-offset-4 transition group-hover:decoration-cyan-400">
                {row.vehicle.model}
              </a>
              <span className="mx-1.5 text-slate-300">/</span>
              <span className="tnum text-slate-500">{row.vehicle.plate}</span>
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Estimated value</p>
              <p className="mt-1 text-xl font-black tracking-tight text-slate-950 tnum">{Engine.tk(row.totalCost)}</p>
            </div>
            <button onClick={() => onCopy(row)} className={`premium-copy-button ${copied ? 'premium-copy-button--success' : ''}`}>
              <span aria-hidden="true">{copied ? '✓' : '↗'}</span>
              {copied ? 'Copied' : 'Copy reminder'}
            </button>
          </div>
        </div>
      </div>

      <div className="premium-call-card__items">
        {actionable.map((a, i) => {
          const tone = a.status === 'overdue' ? 'rose' : a.status === 'due_soon' ? 'amber' : 'slate';
          return (
            <div key={i} className="premium-service-line">
              <Chip status={a.status}>{a.item.name}</Chip>
              <p className="min-w-0 text-xs leading-5 text-slate-600 sm:text-sm">
                {a.status === 'overdue' && <span className="font-bold text-rose-600">{a.daysOverdue} days overdue <span className="font-normal text-slate-300">·</span> </span>}
                {a.status === 'due_soon' && <span className="font-bold text-amber-600">Due in {a.daysUntil} days <span className="font-normal text-slate-300">·</span> </span>}
                <span className={`premium-service-line__rule premium-service-line__rule--${tone}`}>{a.basis}</span>
              </p>
            </div>
          );
        })}
      </div>
    </motion.article>
  );
}

export default function PremiumCallList({ ds }) {
  const [copied, setCopied] = useState(null);
  const rows = useMemo(() => Engine.buildCallList(ds.caseData, ds.ownerById, ds.today), [ds]);

  const stats = useMemo(() => ({
    vehicles: rows.length,
    owners: new Set(rows.map(r => r.vehicle.owner_id)).size,
    overdue: rows.reduce((n, r) => n + r.overdue.length, 0),
    soon: rows.reduce((n, r) => n + r.dueSoon.length, 0),
    review: rows.reduce((n, r) => n + r.unknown.length, 0),
    backlog: rows.filter(r => r.chronicOnly).length,
    value: rows.reduce((n, r) => n + r.totalCost, 0),
  }), [rows]);

  const copy = useCallback(row => {
    const lines = [`Dear ${row.owner.name},`, `Your ${row.vehicle.model} (${row.vehicle.plate}) has service due:`];
    row.overdue.forEach(i => lines.push(`- ${i.item.name} (overdue ${i.daysOverdue} days, est. ${Engine.tk(i.cost)})`));
    row.dueSoon.forEach(i => lines.push(`- ${i.item.name} (due in ${i.daysUntil} days, est. ${Engine.tk(i.cost)})`));
    row.unknown.forEach(i => lines.push(`- ${i.item.name} (needs review, est. ${Engine.tk(i.cost)})`));
    lines.push('', `Estimated total: ${Engine.tk(row.totalCost)}`);
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => { setCopied(row.vehicle.id); setTimeout(() => setCopied(null), 1800); })
      .catch(() => alert(lines.join('\n')));
  }, []);

  if (!rows.length) return <Empty title="All caught up">No vehicle has overdue or due-soon work today.</Empty>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-call-list space-y-6">
      <section className="premium-call-list__summary">
        <div className="premium-call-list__summary-glow" aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-cyan-200"><span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" />Priority queue</div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">Your next best calls.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Start with the most overdue vehicles, then work down by estimated value. Every row includes the reason behind the recommendation.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="premium-mini-stat"><span className="text-xl font-black text-white">{stats.vehicles}</span><span>vehicles</span></div>
            <div className="premium-mini-stat"><span className="text-xl font-black text-rose-300">{stats.overdue}</span><span>overdue</span></div>
            <div className="premium-mini-stat"><span className="text-xl font-black text-cyan-200">{stats.soon}</span><span>up next</span></div>
          </div>
        </div>
      </section>

      <section className="premium-call-list__stat-grid" aria-label="Call list summary">
        <div className="premium-call-list__stat"><span className="premium-call-list__stat-number">{stats.vehicles}</span><span className="premium-call-list__stat-label">vehicles to call</span><span className="premium-call-list__stat-sub">{stats.owners} owners</span></div>
        <div className="premium-call-list__stat"><span className="premium-call-list__stat-number premium-call-list__stat-number--rose">{stats.overdue}</span><span className="premium-call-list__stat-label">items overdue</span><span className="premium-call-list__stat-sub">{stats.backlog} backlog-only</span></div>
        <div className="premium-call-list__stat"><span className="premium-call-list__stat-number premium-call-list__stat-number--amber">{stats.soon}</span><span className="premium-call-list__stat-label">due within {Engine.DUE_SOON_DAYS} days</span><span className="premium-call-list__stat-sub">{stats.review ? `${stats.review} need review` : 'All rules understood'}</span></div>
        <div className="premium-call-list__stat"><span className="premium-call-list__stat-number">{Engine.tk(stats.value)}</span><span className="premium-call-list__stat-label">estimated value</span><span className="premium-call-list__stat-sub">today’s opportunity</span></div>
      </section>

      <section className="space-y-3" aria-label="Vehicles to call">
        {rows.map((row, i) => <PremiumCallRow key={row.vehicle.id} row={row} copied={copied === row.vehicle.id} onCopy={copy} index={i} />)}
      </section>
    </motion.div>
  );
}

export { PremiumCallRow };
