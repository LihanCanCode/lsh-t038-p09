/* Vehicle Service Due Predictor — calculation engine.
   Pure: no DOM, no globals, no wall clock. `today` is always passed in from case.today.
   Kept in a separate file from the UI so it can be unit-tested headlessly in Node. */
const Engine = (function () {

  const DUE_SOON_DAYS   = 14;    // within this many days of due => "due soon"
  const CHRONIC_DAYS    = 90;    // overdue beyond this is standing backlog, not fresh work
  const MAX_PROJECT_DAYS= 3650;  // ceiling on a distance projection, so sort keys stay sane
  const REQUIRED_RULES  = ['fixed_date', 'period_months', 'distance_km'];

  /* ---- dates -------------------------------------------------------------
     Date-only strings must be parsed to LOCAL midnight. `new Date("2026-08-30")`
     parses as UTC midnight, which combined with local getters shifts every result
     by a day west of UTC. */
  function parseLocalDate(str) {
    if (!str) return null;
    const [y, m, d] = String(str).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
  function fmtISO(d) {
    if (!d) return '';
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  // Whole calendar days, DST-proof: compares UTC triples built from local fields.
  function dateDiffDays(a, b) {
    return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
                       Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
  }
  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + Math.trunc(n));
  }
  // Clamps to the last day of the target month; setMonth would overflow
  // 2026-08-31 + 6 to 2027-03-03 instead of 2027-02-28.
  function addMonths(d, n) {
    const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    const last = new Date(y, m + n + 1, 0).getDate();
    return new Date(y, m + n, Math.min(day, last));
  }

  /* ---- money ---- */
  function parseCost(s) {
    const n = parseFloat(String(s).replace(/,/g, ''));
    return isFinite(n) ? n : 0;
  }
  function tk(n) { return 'Tk ' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

  /* ---- daily running rate, from this vehicle's own odometer only ---- */
  function getDailyKm(vehicle) {
    const r = vehicle.odometer_readings;
    if (!r || r.length < 2) return null;
    for (let i = r.length - 1; i > 0; i--) {
      for (let j = i - 1; j >= 0; j--) {
        const days = dateDiffDays(parseLocalDate(r[j].date), parseLocalDate(r[i].date));
        if (days > 0) {
          const rate = (r[i].km - r[j].km) / days;
          return rate < 0 ? 0 : rate;   // rollback => never a negative rate
        }
      }
    }
    return null;
  }

  /* ---- next due date + status for one item ---- */
  function calculateItemDue(vehicle, item, today) {
    const history = vehicle.service_history.filter(h => h.item === item.name);
    const lastService = history.length ? history[history.length - 1] : null;
    const firstOdo = vehicle.odometer_readings[0];
    const latestOdo = vehicle.odometer_readings[vehicle.odometer_readings.length - 1];
    const currentKm = latestOdo ? latestOdo.km : 0;

    let dueDate = null, basis = '', dueAtKm = null;

    if (item.rule === 'fixed_date') {
      if (item.due_date) { dueDate = parseLocalDate(item.due_date); basis = `Expires ${item.due_date}`; }
      else basis = 'No due date on record';

    } else if (item.rule === 'period_months') {
      let base;
      if (lastService) base = parseLocalDate(lastService.date);
      else if (firstOdo) { base = parseLocalDate(firstOdo.date); basis = 'Estimated from first reading. '; }
      if (base) {
        dueDate = addMonths(base, item.every_months);
        basis += `Last done ${fmtISO(base)}, every ${item.every_months} months`;
      } else basis = 'No baseline date found';

    } else if (item.rule === 'distance_km') {
      let baseKm = 0;
      if (lastService) baseKm = lastService.km !== null ? lastService.km : (firstOdo ? firstOdo.km : 0);
      else if (firstOdo) { baseKm = firstOdo.km; basis = 'Estimated from first reading. '; }

      dueAtKm = baseKm + item.every_km;
      const remaining = dueAtKm - currentKm;
      const rate = getDailyKm(vehicle);

      if (rate !== null && rate > 0) {
        // Round away from today, and clamp: a raw fraction would floor (14.6 reads as 14,
        // flipping fine -> due soon), and an unclamped 2,578-day estimate would swamp any sort.
        const raw = remaining / rate;
        const days = raw < 0 ? -Math.min(Math.ceil(-raw), MAX_PROJECT_DAYS)
                             :  Math.min(Math.ceil( raw), MAX_PROJECT_DAYS);
        dueDate = addDays(today, days);
        basis += remaining < 0
          ? `${Math.abs(remaining).toLocaleString()} km past due at ${rate.toFixed(1)} km/day`
          : `Due at ${dueAtKm.toLocaleString()} km — ${remaining.toLocaleString()} km away at ${rate.toFixed(1)} km/day`;
      } else {
        basis += remaining < 0
          ? `${Math.abs(remaining).toLocaleString()} km past due (daily rate unknown)`
          : `Due at ${dueAtKm.toLocaleString()} km — ${remaining.toLocaleString()} km away (daily rate unknown)`;
      }
    }

    let status = 'unknown', daysOverdue = 0, daysUntil = null;
    if (dueDate) {
      daysUntil = dateDiffDays(today, dueDate);
      if (daysUntil < 0) { status = 'overdue'; daysOverdue = -daysUntil; }
      else status = daysUntil <= DUE_SOON_DAYS ? 'due_soon' : 'fine';
    } else if (item.rule === 'distance_km') {
      if (currentKm >= dueAtKm) {
        status = 'overdue';
        const rate = getDailyKm(vehicle);
        daysOverdue = (rate !== null && rate > 0) ? Math.round((currentKm - dueAtKm) / rate) : 0;
      } else status = 'fine';
    }

    return { item, dueDate, dueAtKm, status, basis, daysUntil, daysOverdue,
             cost: parseCost(item.cost_bdt),
             isChronic: status === 'overdue' && daysOverdue > CHRONIC_DAYS };
  }

  /* ---- call list ---- */
  function buildCallList(caseData, ownerById, today) {
    const rows = [];
    caseData.vehicles.forEach(v => {
      const overdue = [], dueSoon = [], unknown = [];
      let cost = 0, maxOverdue = -1, minUntil = Infinity;

      const items = v.service_items.map(it => {
        const a = calculateItemDue(v, it, today);
        if (a.status === 'overdue')      { overdue.push(a); cost += a.cost; maxOverdue = Math.max(maxOverdue, a.daysOverdue); }
        else if (a.status === 'due_soon'){ dueSoon.push(a); cost += a.cost; minUntil = Math.min(minUntil, a.daysUntil); }
        // An item we cannot date is not "fine" — it is unmeasured. Dropping it would
        // hide real work from the workshop entirely.
        else if (a.status === 'unknown') { unknown.push(a); cost += a.cost; }
        return a;
      });

      if (overdue.length || dueSoon.length || unknown.length) {
        rows.push({
          vehicle: v, owner: ownerById[v.owner_id], items, overdue, dueSoon, unknown,
          totalCost: cost, maxDaysOverdue: maxOverdue,
          minDaysUntil: minUntil === Infinity ? null : minUntil,
          // Tagged only if EVERY overdue item is stale. A vehicle with one 220-day item and
          // one 12-day item still has a fresh problem and must not be muted.
          chronicOnly: overdue.length > 0 && overdue.every(i => i.daysOverdue > CHRONIC_DAYS),
          score: overdue.length ? 1000 + maxOverdue : dueSoon.length ? 500 - minUntil : 100
        });
      }
    });

    rows.sort((a, b) =>
      b.score - a.score ||
      b.totalCost - a.totalCost ||
      (a.owner.id < b.owner.id ? -1 : a.owner.id > b.owner.id ? 1 : 0)   // deterministic: id, never name
    );
    return rows;
  }

  function buildForecast(caseData, today, weeks) {
    weeks = weeks || 8;
    const count = Array(weeks).fill(0), revenue = Array(weeks).fill(0);
    caseData.vehicles.forEach(v => v.service_items.forEach(it => {
      const a = calculateItemDue(v, it, today);
      if (!a.dueDate) return;
      const d = dateDiffDays(today, a.dueDate);
      const w = d < 0 ? 0 : Math.floor(d / 7);
      if (w < weeks) { count[w]++; revenue[w] += a.cost; }
    }));
    return { count, revenue };
  }

  /* ---- validation: returns an error string, or null when acceptable ---- */
  function validateRecordService(v, item, { date, km, newDueDate }, today) {
    if (!date) return 'Enter the service date.';
    if (parseLocalDate(date) > today) return `Service date cannot be after ${fmtISO(today)}.`;

    const prior = v.service_history.filter(h => h.item === item.name);
    const last = prior.length ? prior[prior.length - 1] : null;
    if (last && parseLocalDate(date) < parseLocalDate(last.date))
      return `A later service is already recorded for this item (${last.date}).`;

    if (item.rule === 'distance_km') {
      const cur = v.odometer_readings[v.odometer_readings.length - 1];
      const currentKm = cur ? cur.km : 0;
      if (km === null || km === '' || isNaN(km)) return 'Enter the odometer reading for this service.';
      if (km > currentKm) return `Service km cannot exceed the current odometer reading (${currentKm.toLocaleString()} km).`;
      if (last && last.km !== null && km < last.km)
        return `Service km cannot be below the previous service km (${last.km.toLocaleString()} km).`;
    }
    if (item.rule === 'fixed_date') {
      if (!newDueDate) return 'Enter the new due date.';
      if (parseLocalDate(newDueDate) <= parseLocalDate(date)) return 'New due date must be after the service date.';
    }
    return null;
  }

  function validateOdometer(v, km) {
    const cur = v.odometer_readings[v.odometer_readings.length - 1];
    if (km === null || km === '' || isNaN(km)) return 'Enter the new odometer reading in km.';
    if (cur && km < cur.km) return `Odometer cannot decrease. Current reading is ${cur.km.toLocaleString()} km.`;
    if (cur && km === cur.km) return `That is already the current reading (${cur.km.toLocaleString()} km).`;
    return null;
  }

  /* ---- dataset loading ---- */
  function validateCase(c, label) {
    const e = [];
    if (!c || typeof c !== 'object') return [`${label} is not an object`];
    if (!c.today || !parseLocalDate(c.today)) e.push(`${label}: missing a valid "today" date (YYYY-MM-DD)`);
    if (!Array.isArray(c.owners)   || !c.owners.length)   e.push(`${label}: "owners" must be a non-empty array`);
    if (!Array.isArray(c.vehicles) || !c.vehicles.length) e.push(`${label}: "vehicles" must be a non-empty array`);
    if (e.length) return e;
    c.vehicles.forEach((v, i) => {
      const vl = `${label} vehicle ${v && v.id ? v.id : '#' + (i + 1)}`;
      if (!v.id) e.push(`${vl}: missing "id"`);
      if (!Array.isArray(v.service_items))     e.push(`${vl}: missing "service_items" array`);
      if (!Array.isArray(v.odometer_readings)) e.push(`${vl}: missing "odometer_readings" array`);
      (v.service_items || []).forEach(it => {
        if (!it.name) e.push(`${vl}: a service item has no "name"`);
        if (!REQUIRED_RULES.includes(it.rule))
          e.push(`${vl} / ${it.name || '?'}: unknown rule "${it.rule}" (expected ${REQUIRED_RULES.join(', ')})`);
      });
    });
    return e.slice(0, 8);
  }

  function normaliseCases(json) {
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.cases)) return json.cases;
    if (json && (json.vehicles || json.owners)) return [json];
    throw new Error('Could not find any cases. Expected an object with a "cases" array, or a single case with "owners" and "vehicles".');
  }

  // Sorts the arrays the engine assumes are ordered and indexes owners/vehicles.
  // A vehicle pointing at a missing owner gets a placeholder rather than blanking the view.
  function prepareCase(c) {
    const ownerById = {}, vehicleById = {}, warnings = [];
    c.owners.forEach(o => { ownerById[o.id] = o; });
    c.vehicles.forEach(v => {
      v.odometer_readings = (v.odometer_readings || []).slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
      v.service_history   = (v.service_history   || []).slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
      if (!ownerById[v.owner_id]) {
        ownerById[v.owner_id] = { id: v.owner_id, name: `Unknown owner (${v.owner_id})`, phone: '' };
        warnings.push(`Vehicle ${v.id} references owner "${v.owner_id}", which is not in the owners list.`);
      }
      vehicleById[v.id] = v;
    });
    return { caseData: c, today: parseLocalDate(c.today), ownerById, vehicleById, warnings };
  }

  return { DUE_SOON_DAYS, CHRONIC_DAYS, MAX_PROJECT_DAYS,
           parseLocalDate, fmtISO, dateDiffDays, addDays, addMonths, parseCost, tk,
           getDailyKm, calculateItemDue, buildCallList, buildForecast,
           validateRecordService, validateOdometer, validateCase, normaliseCases, prepareCase };
})();

export default Engine;
