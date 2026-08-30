const { useState, useEffect, useMemo, useRef, useCallback } = React;

const DEFAULT_SOURCE = 'P09_vehicle_service_public.json';

/* ---------- small presentational pieces ---------- */

const STATUS = {
  overdue:  { label: 'Overdue',  chip: 'bg-rose-50 text-rose-700 ring-rose-600/20',
              dot: 'bg-rose-500',  num: 'text-rose-600' },
  due_soon: { label: 'Due soon', chip: 'bg-amber-50 text-amber-700 ring-amber-600/20',
              dot: 'bg-amber-500', num: 'text-amber-600' },
  fine:     { label: 'Fine',     chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
              dot: 'bg-emerald-500', num: 'text-emerald-600' },
  unknown:  { label: 'Needs review', chip: 'bg-slate-100 text-slate-600 ring-slate-500/20',
              dot: 'bg-slate-400', num: 'text-slate-500' },
};

function Chip({ status, children }) {
  const s = STATUS[status] || STATUS.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {children || s.label}
    </span>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}{required && <span className="text-rose-600 normal-case tracking-normal">required</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs leading-snug text-slate-500">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-snug text-rose-700">
      {children}
    </div>
  );
}

function Empty({ title, children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {children && <p className="mt-1 text-sm text-slate-500">{children}</p>}
    </div>
  );
}

/* ---------- header + dataset bar ---------- */

function Header({ route }) {
  const tabs = [['#/call-list','Daily Call List'], ['#/vehicles','Vehicles'], ['#/forecast','Forecast']];
  const active = h => route === h || (h === '#/vehicles' && route.startsWith('#/vehicle/'));
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur no-print">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">VS</div>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold text-slate-900">Vehicle Service Predictor</h1>
            <p className="text-xs text-slate-500">Workshop call planner</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map(([h, label]) => (
            <a key={h} href={h}
               className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                 active(h) ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              {label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

function DataBar({ ds, cases, caseIndex, source, onPick, onUpload, onReset, error }) {
  const fileRef = useRef(null);
  return (
    <div className="border-b border-slate-200 bg-white no-print">
      <div className="mx-auto max-w-7xl px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-700">{source}</p>
            <p className="text-xs text-slate-500 tnum">
              {ds ? `${ds.caseData.vehicles.length} vehicles · ${ds.caseData.owners.length} owners · as of ${ds.caseData.today}` : 'No dataset loaded'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {cases.length > 1 && (
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Case
                <select value={caseIndex} onChange={e => onPick(Number(e.target.value))}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none">
                  {cases.map((c, i) => <option key={i} value={i}>{c.case_id || `Case ${i+1}`}</option>)}
                </select>
              </label>
            )}
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
                   onChange={e => { onUpload(e.target.files[0]); e.target.value = ''; }} />
            <button onClick={() => fileRef.current.click()}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/20">
              Load JSON
            </button>
            {source !== DEFAULT_SOURCE && (
              <button onClick={onReset} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Use bundled
              </button>
            )}
          </div>
        </div>
        <ErrorNote>{error}</ErrorNote>
      </div>
    </div>
  );
}

/* ---------- call list ---------- */

function Stat({ value, label, sub, tone }) {
  return (
    <div className="px-4 py-3.5 sm:px-5 sm:py-4">
      <p className={`text-xl font-bold tnum sm:text-2xl ${tone || 'text-slate-900'}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-600">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function ItemLine({ a }) {
  return (
    <li className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:gap-3">
      <div className="shrink-0"><Chip status={a.status}>{a.item.name}</Chip></div>
      <p className="text-xs leading-relaxed text-slate-600">
        {a.status === 'overdue' && <span className="font-semibold text-rose-700">{a.daysOverdue} days overdue · </span>}
        {a.status === 'due_soon' && <span className="font-semibold text-amber-700">in {a.daysUntil} days · </span>}
        {a.basis}
      </p>
    </li>
  );
}

function CallRow({ row, onCopy, copied }) {
  const actionable = [...row.overdue, ...row.dueSoon, ...row.unknown];
  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-card transition hover:shadow-lift">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">{row.owner.name}</h3>
            {row.chronicOnly && (
              <span title="Every overdue item here is more than 90 days old — standing backlog, not new work"
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-inset ring-slate-300">
                Backlog
              </span>
            )}
          </div>
          {row.owner.phone && (
            <a href={`tel:${row.owner.phone}`} className="mt-0.5 inline-block text-sm font-medium text-blue-600 hover:underline tnum">
              {row.owner.phone}
            </a>
          )}
          <p className="mt-2 text-sm text-slate-700">
            <a href={`#/vehicle/${row.vehicle.id}`} className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-900">
              {row.vehicle.model}
            </a>
            <span className="text-slate-400"> · </span>
            <span className="text-slate-500 tnum">{row.vehicle.plate}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          <p className="text-lg font-bold text-slate-900 tnum">{Engine.tk(row.totalCost)}</p>
          <button onClick={() => onCopy(row)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            {copied ? 'Copied' : 'Copy reminder'}
          </button>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 border-t border-slate-100 px-5 py-1">
        {actionable.map((a, i) => <ItemLine key={i} a={a} />)}
      </ul>
    </article>
  );
}

function CallList({ ds }) {
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
    const lines = [`Dear ${row.owner.name},`,
      `Your ${row.vehicle.model} (${row.vehicle.plate}) has service due:`];
    row.overdue.forEach(i => lines.push(`- ${i.item.name} (overdue ${i.daysOverdue} days, est. ${Engine.tk(i.cost)})`));
    row.dueSoon.forEach(i => lines.push(`- ${i.item.name} (due in ${i.daysUntil} days, est. ${Engine.tk(i.cost)})`));
    row.unknown.forEach(i => lines.push(`- ${i.item.name} (needs review, est. ${Engine.tk(i.cost)})`));
    lines.push(``, `Estimated total: ${Engine.tk(row.totalCost)}`);
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => { setCopied(row.vehicle.id); setTimeout(() => setCopied(null), 1800); })
      .catch(() => alert(lines.join('\n')));
  }, []);

  if (!rows.length) return <Empty title="All caught up">No vehicle has overdue or due-soon work today.</Empty>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card sm:grid-cols-4 sm:divide-y-0">
        <Stat value={stats.vehicles} label="vehicles to call" sub={`${stats.owners} owners`} />
        <Stat value={stats.overdue} label="items overdue" tone="text-rose-600" sub={`${stats.backlog} backlog-only`} />
        <Stat value={stats.soon} label={`due within ${Engine.DUE_SOON_DAYS} days`} tone="text-amber-600"
              sub={stats.review ? `${stats.review} need review` : null} />
        <Stat value={Engine.tk(stats.value)} label="estimated value" />
      </div>
      <div className="space-y-3">
        {rows.map(r => <CallRow key={r.vehicle.id} row={r} onCopy={copy} copied={copied === r.vehicle.id} />)}
      </div>
    </div>
  );
}

/* ---------- vehicles ---------- */

function Vehicles({ ds }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return ds.caseData.vehicles.filter(v => {
      if (!t) return true;
      const o = ds.ownerById[v.owner_id];
      return v.model.toLowerCase().includes(t) || v.plate.toLowerCase().includes(t) ||
             (o && o.name.toLowerCase().includes(t));
    });
  }, [q, ds]);

  return (
    <div className="space-y-5">
      <input value={q} onChange={e => setQ(e.target.value)} className={`${inputCls} max-w-md`}
             placeholder="Search by model, plate, or owner…" aria-label="Search vehicles" />
      {list.length === 0
        ? <Empty title={`No vehicles match “${q}”`}>Try a model, plate, or owner name.</Empty>
        : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(v => {
              const o = ds.ownerById[v.owner_id];
              const items = v.service_items.map(i => Engine.calculateItemDue(v, i, ds.today));
              const od = items.filter(i => i.status === 'overdue').length;
              const so = items.filter(i => i.status === 'due_soon').length;
              return (
                <a key={v.id} href={`#/vehicle/${v.id}`}
                   className="group rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lift">
                  <p className="font-semibold text-slate-900 group-hover:text-blue-700">{v.model}</p>
                  <p className="text-sm text-slate-500 tnum">{v.plate}</p>
                  <p className="mt-2 text-xs text-slate-500">{o ? o.name : '—'}</p>
                  <div className="mt-3 flex gap-1.5">
                    {od > 0 && <Chip status="overdue">{od} overdue</Chip>}
                    {so > 0 && <Chip status="due_soon">{so} soon</Chip>}
                    {od === 0 && so === 0 && <Chip status="fine">All fine</Chip>}
                  </div>
                </a>
              );
            })}
          </div>}
    </div>
  );
}

/* ---------- vehicle detail ---------- */

function RecordForm({ v, item, ds, onSave, onCancel }) {
  const today = Engine.fmtISO(ds.today);
  const cur = v.odometer_readings[v.odometer_readings.length - 1];
  const [date, setDate] = useState(today);
  const [km, setKm] = useState(cur ? String(cur.km) : '');
  const [due, setDue] = useState(Engine.fmtISO(Engine.addMonths(ds.today, 12)));
  const [err, setErr] = useState(null);

  function submit() {
    const kmNum = item.rule === 'distance_km' ? (km === '' ? NaN : parseInt(km, 10)) : null;
    const e = Engine.validateRecordService(v, item, { date, km: kmNum, newDueDate: due }, ds.today);
    if (e) return setErr(e);
    onSave({ date, km: kmNum, newDueDate: item.rule === 'fixed_date' ? due : null });
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <Field label="Service date">
        <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className={inputCls} />
      </Field>
      {item.rule === 'distance_km' && (
        <Field label="Odometer at service (km)">
          <input type="number" value={km} onChange={e => setKm(e.target.value)} className={inputCls} />
        </Field>
      )}
      {item.rule === 'fixed_date' && (
        <Field label="New due date" required
               hint="The issuing authority sets this, so it is entered rather than calculated.">
          <input type="date" value={due} onChange={e => setDue(e.target.value)} className={inputCls} />
        </Field>
      )}
      <ErrorNote>{err}</ErrorNote>
      <div className="flex gap-2">
        <button onClick={submit} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">Save</button>
        <button onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-white">Cancel</button>
      </div>
    </div>
  );
}

function VehicleDetail({ id, ds, onMutate }) {
  const v = ds.vehicleById[id];
  const [open, setOpen] = useState(null);
  const [odo, setOdo] = useState('');
  const [odoErr, setOdoErr] = useState(null);
  const [flash, setFlash] = useState(null);

  if (!v) return <Empty title="Vehicle not found">That vehicle is not in the current dataset.</Empty>;

  const owner = ds.ownerById[v.owner_id];
  const cur = v.odometer_readings[v.odometer_readings.length - 1];
  const rate = Engine.getDailyKm(v);
  const items = v.service_items.map(i => Engine.calculateItemDue(v, i, ds.today));

  function saveService(item, { date, km, newDueDate }) {
    onMutate(draft => {
      const dv = draft.vehicleById[v.id];
      const di = dv.service_items.find(x => x.name === item.name);
      dv.service_history.push({ item: item.name, date, km, cost_bdt: item.cost_bdt });
      dv.service_history.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
      if (newDueDate) di.due_date = newDueDate;   // fixed_date items reset by rewriting due_date
    });
    setOpen(null); setFlash(`${item.name} recorded`); setTimeout(() => setFlash(null), 2200);
  }

  function saveOdo() {
    const km = odo === '' ? NaN : parseInt(odo, 10);
    const e = Engine.validateOdometer(v, km);
    if (e) return setOdoErr(e);
    setOdoErr(null);
    onMutate(draft => {
      const dv = draft.vehicleById[v.id];
      const last = dv.odometer_readings[dv.odometer_readings.length - 1];
      const today = Engine.fmtISO(ds.today);
      if (last && last.date === today) last.km = km;      // same date replaces, never duplicates
      else dv.odometer_readings.push({ date: today, km });
    });
    setOdo(''); setFlash('Odometer updated'); setTimeout(() => setFlash(null), 2200);
  }

  return (
    <div className="space-y-6">
      <a href="#/vehicles" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline no-print">← All vehicles</a>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card sm:grid-cols-4">
        {[['Owner', owner ? owner.name : '—', owner && owner.phone],
          ['Vehicle', v.model, v.plate],
          ['Current odometer', cur ? `${cur.km.toLocaleString()} km` : 'Unknown', cur ? `as of ${cur.date}` : null],
          ['Daily running rate', rate ? `${rate.toFixed(1)} km/day` : 'Unknown', 'from this vehicle only']
        ].map(([k, a, b]) => (
          <div key={k}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</p>
            <p className="mt-1 font-semibold text-slate-900 tnum">{a}</p>
            {b && <p className="text-xs text-slate-500 tnum">{b}</p>}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card no-print">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Update odometer (km)">
              <input type="number" value={odo} onChange={e => setOdo(e.target.value)} className={inputCls}
                     placeholder={cur ? `e.g. ${(cur.km + 250).toLocaleString()}` : '50,000'} />
            </Field>
          </div>
          <button onClick={saveOdo} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Update</button>
        </div>
        <ErrorNote>{odoErr}</ErrorNote>
        {flash && <p className="mt-2 text-xs font-semibold text-emerald-700">{flash}</p>}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Service items</h2>
        <div className="space-y-3">
          {items.map((a, idx) => (
            <div key={a.item.name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{a.item.name}</h3>
                    <Chip status={a.status} />
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{a.item.rule}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-700 tnum">
                    {a.dueDate ? `Next due ${Engine.fmtISO(a.dueDate)}` : 'No projectable date'}
                  </p>
                  <p className="text-xs text-slate-500">{a.basis}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 tnum">{Engine.tk(a.cost)}</span>
                  <button onClick={() => setOpen(open === idx ? null : idx)}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 no-print">
                    {open === idx ? 'Close' : 'Record'}
                  </button>
                </div>
              </div>
              {open === idx && (
                <RecordForm v={v} item={a.item} ds={ds}
                            onSave={d => saveService(a.item, d)} onCancel={() => setOpen(null)} />
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Service history</h2>
        {v.service_history.length === 0
          ? <Empty title="No service recorded yet" />
          : <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>{['Date','Item','Odometer','Cost'].map(h =>
                    <th key={h} className="px-4 py-2.5 text-left font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...v.service_history].reverse().map((h, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 tnum text-slate-600">{h.date}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{h.item}</td>
                      <td className="px-4 py-2.5 tnum text-slate-600">{h.km !== null ? `${h.km.toLocaleString()} km` : '—'}</td>
                      <td className="px-4 py-2.5 tnum text-slate-600">{Engine.tk(Engine.parseCost(h.cost_bdt))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </section>
    </div>
  );
}

/* ---------- forecast ---------- */

function Forecast({ ds }) {
  const f = useMemo(() => Engine.buildForecast(ds.caseData, ds.today), [ds]);
  const max = Math.max(...f.revenue, 1);
  const total = f.revenue.reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next 8 weeks</p>
        <p className="mt-1 text-2xl font-bold text-slate-900 tnum">{Engine.tk(total)}</p>
        <p className="text-xs text-slate-500">{f.count.reduce((a, b) => a + b, 0)} service items falling due</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex min-w-[560px] items-end gap-3" style={{ height: 260 }}>
          {f.revenue.map((rev, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
              <span className="text-xs font-semibold text-slate-700 tnum">{Engine.tk(rev)}</span>
              <div className={`w-full rounded-t-md transition-all ${i === 0 ? 'bg-rose-500' : 'bg-blue-500'}`}
                   style={{ height: `${Math.max((rev / max) * 100, 2)}%` }}
                   title={`${f.count[i]} items`} />
              <span className="text-xs text-slate-500 tnum">{f.count[i]}</span>
              <span className="text-center text-[11px] leading-tight text-slate-500">
                {i === 0 ? 'This week + backlog' : `Week ${i + 1}`}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Week 1 carries everything already overdue as well as work due in the next 7 days, so it is not fresh demand alone.
      </p>
    </div>
  );
}

/* ---------- app shell ---------- */

function App() {
  const [cases, setCases] = useState([]);
  const [caseIndex, setCaseIndex] = useState(0);
  const [ds, setDs] = useState(null);
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [error, setError] = useState(null);
  const [fatal, setFatal] = useState(null);
  const [route, setRoute] = useState(window.location.hash || '#/call-list');
  const [dragging, setDragging] = useState(false);
  const [, bump] = useState(0);

  useEffect(() => {
    const on = () => setRoute(window.location.hash || '#/call-list');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const activate = useCallback((list, idx, label) => {
    const prepared = Engine.prepareCase(list[idx]);
    setCases(list); setCaseIndex(idx); setDs(prepared); setSource(label);
    setError(prepared.warnings.length ? `${prepared.warnings.length} data issue(s): ${prepared.warnings.slice(0,2).join(' ')}` : null);
  }, []);

  const apply = useCallback((json, label, goHome) => {
    const list = Engine.normaliseCases(json);
    if (!list.length) throw new Error('The file contains an empty "cases" array.');
    const errs = Engine.validateCase(list[0], list[0].case_id || 'Case 1');
    if (errs.length) throw new Error('This file does not match the expected schema: ' + errs.join('; '));
    activate(list, 0, label);
    if (goHome) window.location.hash = '#/call-list';
    return list.length;
  }, [activate]);

  useEffect(() => {
    fetch(DEFAULT_SOURCE)
      .then(r => { if (!r.ok) throw new Error('Failed to load the bundled dataset.'); return r.json(); })
      .then(j => apply(j, DEFAULT_SOURCE, false))
      .catch(e => setFatal(e.message));
  }, [apply]);

  const onUpload = useCallback(file => {
    if (!file) return;
    if (!/\.json$/i.test(file.name)) return setError(`“${file.name}” is not a .json file.`);
    const fr = new FileReader();
    fr.onload = () => {
      let json;
      try { json = JSON.parse(fr.result); }
      catch (err) { return setError(`That file is not valid JSON — ${err.message}`); }
      try { apply(json, file.name, true); setFatal(null); }
      catch (err) { setError(err.message); }
    };
    fr.onerror = () => setError('Could not read that file.');
    fr.readAsText(file);
  }, [apply]);

  // Mutations edit the prepared dataset in place, then force a re-render. Everything on
  // screen is derived, so only the item that changed can move.
  const onMutate = useCallback(fn => { setDs(d => { fn(d); return d; }); bump(n => n + 1); }, []);

  useEffect(() => {
    const over = e => { e.preventDefault(); setDragging(true); };
    const leave = e => { if (!e.relatedTarget) setDragging(false); };
    const drop = e => { e.preventDefault(); setDragging(false); onUpload(e.dataTransfer.files[0]); };
    document.addEventListener('dragover', over);
    document.addEventListener('dragleave', leave);
    document.addEventListener('drop', drop);
    return () => { document.removeEventListener('dragover', over);
                   document.removeEventListener('dragleave', leave);
                   document.removeEventListener('drop', drop); };
  }, [onUpload]);

  let view = null, title = '', subtitle = '';
  if (ds) {
    if (route.startsWith('#/vehicle/')) {
      title = 'Vehicle'; subtitle = 'Every item, its rule, and the reason behind the date.';
      view = <VehicleDetail id={route.split('/')[2]} ds={ds} onMutate={onMutate} />;
    } else if (route === '#/vehicles') {
      title = 'Vehicles'; subtitle = `All ${ds.caseData.vehicles.length} vehicles in this case.`;
      view = <Vehicles ds={ds} />;
    } else if (route === '#/forecast') {
      title = '8-Week Forecast'; subtitle = 'Upcoming workload and revenue.';
      view = <Forecast ds={ds} />;
    } else {
      title = 'Daily Call List'; subtitle = 'Most overdue first, then highest value.';
      view = <CallList ds={ds} />;
    }
  }

  return (
    <div className="min-h-screen">
      <Header route={route} />
      <DataBar ds={ds} cases={cases} caseIndex={caseIndex} source={source} error={error}
               onPick={i => activate(cases, i, source)} onUpload={onUpload}
               onReset={() => fetch(DEFAULT_SOURCE).then(r => r.json()).then(j => apply(j, DEFAULT_SOURCE, true))} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        {fatal ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
            <h2 className="font-semibold text-rose-800">Could not load the bundled dataset</h2>
            <p className="mt-1 text-sm text-rose-700">{fatal}</p>
            <p className="mt-2 text-sm text-rose-700">
              This page reads its data with <code className="rounded bg-white px-1">fetch</code>, which browsers block on
              <code className="rounded bg-white px-1">file://</code>. Serve the folder over HTTP, or use <strong>Load JSON</strong> above.
            </p>
          </div>
        ) : !ds ? (
          <p className="py-20 text-center text-sm text-slate-500">Loading dataset…</p>
        ) : (
          <>
            <div className="mb-5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
              <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
            </div>
            {view}
          </>
        )}
      </main>
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center border-4 border-dashed border-blue-500 bg-blue-500/10">
          <p className="rounded-lg bg-white px-4 py-2 text-lg font-semibold text-blue-700 shadow-lift">Drop a JSON file to load it</p>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
