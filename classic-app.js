const STATE = {
    data: null,        // the active case
    today: null,       // parsed from case.today — the only clock this app uses
    cases: [],         // every case in the loaded file
    caseIndex: 0,
    source: '',        // filename shown in the data bar
    warnings: [],
    ownerById: {},
    vehicleById: {}
};

const DUE_SOON_DAYS = 14;      // an item within this many days of due is "due soon"
const MAX_PROJECT_DAYS = 3650; // ceiling on a distance projection, so sort keys stay sane
const CHRONIC_DAYS = 90;       // overdue beyond this is standing backlog, not fresh work

// Date utilities.
// Every date in this dataset is date-only ("2026-08-30"). `new Date(str)` would parse those as
// UTC midnight while the getters below read local fields, which shifts every result by a day in
// any negative-offset timezone. So: parse to LOCAL midnight explicitly, and never round-trip
// through toISOString() for display.
function parseLocalDate(str) {
    if (!str) return null;
    const [y, m, d] = String(str).split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
}

function fmtISO(dateObj) {
    if (!dateObj) return '';
    const p = n => String(n).padStart(2, '0');
    return `${dateObj.getFullYear()}-${p(dateObj.getMonth() + 1)}-${p(dateObj.getDate())}`;
}

// Whole calendar days between two dates, immune to DST because it compares UTC triples
// built from the local Y/M/D fields rather than subtracting raw timestamps.
function dateDiffDays(d1, d2) {
    const a = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const b = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.round((b - a) / 86400000);
}

function addDays(date, days) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + Math.trunc(days));
}

// Clamps to the last day of the target month. Plain setMonth() overflows instead:
// 2026-08-31 + 6 months would give 2027-03-03 rather than 2027-02-28.
function addMonths(date, months) {
    const y = date.getFullYear(), m = date.getMonth(), day = date.getDate();
    const lastDayOfTarget = new Date(y, m + months + 1, 0).getDate();
    return new Date(y, m + months, Math.min(day, lastDayOfTarget));
}

function formatDate(dateObj) {
    if (!dateObj) return 'N/A';
    return fmtISO(dateObj);
}

function setFieldError(elId, msg) {
    const el = document.getElementById(elId);
    if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
    return false;
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

// Engine Functions
function getDailyKm(vehicle) {
    const readings = vehicle.odometer_readings;
    if (!readings || readings.length < 2) return null;
    
    for (let i = readings.length - 1; i > 0; i--) {
        const r1 = readings[i];
        for (let j = i - 1; j >= 0; j--) {
            const r2 = readings[j];
            const days = dateDiffDays(parseLocalDate(r2.date), parseLocalDate(r1.date));
            if (days > 0) {
                let rate = (r1.km - r2.km) / days;
                if (rate < 0) rate = 0; 
                return rate;
            }
        }
    }
    return null; 
}

function calculateItemDue(vehicle, item) {
    const history = vehicle.service_history.filter(h => h.item === item.name);
    const lastService = history.length > 0 ? history[history.length - 1] : null;
    const firstOdo = vehicle.odometer_readings[0];
    const latestOdo = vehicle.odometer_readings[vehicle.odometer_readings.length - 1];
    
    let dueDate = null;
    let basis = '';
    
    if (item.rule === 'fixed_date') {
        if (item.due_date) {
            dueDate = parseLocalDate(item.due_date);
            basis = `Fixed date: ${item.due_date}`;
        } else {
            basis = `Missing due date`;
        }
    } 
    else if (item.rule === 'period_months') {
        let baseDate;
        if (lastService) {
            baseDate = parseLocalDate(lastService.date);
        } else if (firstOdo) {
            baseDate = parseLocalDate(firstOdo.date);
            basis = 'Estimated from first reading. ';
        }
        
        if (baseDate) {
            dueDate = addMonths(baseDate, item.every_months);
            basis += `Every ${item.every_months} months, last done ${formatDate(baseDate)}, next due ${formatDate(dueDate)}`;
        } else {
            basis = 'No baseline date found';
        }
    }
    else if (item.rule === 'distance_km') {
        let baseKm = 0;
        if (lastService) {
            baseKm = lastService.km !== null ? lastService.km : (firstOdo ? firstOdo.km : 0);
        } else if (firstOdo) {
            baseKm = firstOdo.km;
            basis = 'Estimated from first reading. ';
        }
        
        const dueAtKm = baseKm + item.every_km;
        const currentKm = latestOdo ? latestOdo.km : 0;
        const kmRemaining = dueAtKm - currentKm;
        const rate = getDailyKm(vehicle);
        
        if (rate !== null && rate > 0) {
            // Round away from today and clamp: a raw fraction would floor (14.6 days reads as 14,
            // flipping "fine" to "due soon"), and an unclamped 2,578-day projection would dominate
            // every sort key it touches.
            const raw = kmRemaining / rate;
            const daysRemaining = raw < 0
                ? -Math.min(Math.ceil(-raw), MAX_PROJECT_DAYS)
                : Math.min(Math.ceil(raw), MAX_PROJECT_DAYS);
            dueDate = addDays(STATE.today, daysRemaining);
            if (kmRemaining < 0) {
                basis += `Threshold passed by ${Math.abs(kmRemaining)} km at ${rate.toFixed(1)} km/day`;
            } else {
                basis += `Due at ${dueAtKm} km (~${kmRemaining} km away at ${rate.toFixed(1)} km/day)`;
            }
        } else {
            if (kmRemaining < 0) {
                basis += `Threshold passed by ${Math.abs(kmRemaining)} km (daily rate unknown)`;
            } else {
                basis += `Due at ${dueAtKm} km (~${kmRemaining} km away, daily rate unknown)`;
            }
        }
    }
    
    let status = 'unknown';
    let daysOverdue = 0;
    let daysUntil = null;
    
    if (dueDate) {
        daysUntil = dateDiffDays(STATE.today, dueDate);
        if (daysUntil < 0) {
            status = 'overdue';
            daysOverdue = Math.abs(daysUntil);
        } else if (daysUntil <= DUE_SOON_DAYS) {
            status = 'due_soon';
        } else {
            status = 'fine';
        }
    } else if (item.rule === 'distance_km') {
        const baseKm = lastService ? (lastService.km !== null ? lastService.km : (firstOdo ? firstOdo.km : 0)) : (firstOdo ? firstOdo.km : 0);
        const dueAtKm = baseKm + item.every_km;
        const currentKm = latestOdo ? latestOdo.km : 0;
        if (currentKm >= dueAtKm) {
            status = 'overdue';
            const rate = getDailyKm(vehicle);
            daysOverdue = (rate !== null && rate > 0) ? Math.round((currentKm - dueAtKm) / rate) : 999;
        } else {
            status = 'fine';
        }
    }
    
    return {
        item: item,
        dueDate: dueDate,
        status: status,
        basis: basis,
        daysUntil: daysUntil,
        daysOverdue: daysOverdue,
        cost: parseFloat(item.cost_bdt) || 0
    };
}

function analyzeAll() {
    let callListEntries = [];
    
    STATE.data.vehicles.forEach(v => {
        let vOverdueItems = [];
        let vDueSoonItems = [];
        let vUnknownItems = [];   // no computable due date — needs a human to look
        let totalCost = 0;
        let maxDaysOverdue = -1;
        let minDaysUntil = 9999;
        
        v.analyzedItems = v.service_items.map(item => {
            const analysis = calculateItemDue(v, item);
            if (analysis.status === 'overdue') {
                vOverdueItems.push(analysis);
                totalCost += analysis.cost;
                if (analysis.daysOverdue > maxDaysOverdue) maxDaysOverdue = analysis.daysOverdue;
            } else if (analysis.status === 'due_soon') {
                vDueSoonItems.push(analysis);
                totalCost += analysis.cost;
                if (analysis.daysUntil < minDaysUntil) minDaysUntil = analysis.daysUntil;
            } else if (analysis.status === 'unknown') {
                // An item we cannot date (no due_date, no baseline) is not "fine" — it is
                // unmeasured. Dropping it would hide real work from the workshop entirely.
                vUnknownItems.push(analysis);
                totalCost += analysis.cost;
            }
            return analysis;
        });
        
        if (vOverdueItems.length > 0 || vDueSoonItems.length > 0 || vUnknownItems.length > 0) {
            // overdue > due-soon > needs-review, so unmeasurable items surface without
            // ever outranking work with a real date on it.
            let score = vOverdueItems.length > 0 ? (1000 + maxDaysOverdue)
                      : vDueSoonItems.length > 0 ? (500 - minDaysUntil)
                      : 100;
            callListEntries.push({
                vehicle: v,
                owner: STATE.ownerById[v.owner_id],
                overdue: vOverdueItems,
                dueSoon: vDueSoonItems,
                unknown: vUnknownItems,
                totalCost: totalCost,
                maxDaysOverdue: maxDaysOverdue,
                // Every overdue item here is more than CHRONIC_DAYS old. Period-based items build
                // a standing backlog that never clears, so without this the same names sit at the
                // top of the list every morning and crowd out work that just became due.
                chronicOnly: vOverdueItems.length > 0 &&
                             vOverdueItems.every(i => i.daysOverdue > CHRONIC_DAYS),
                score: score
            });
        }
    });
    
    // Sort logic
    callListEntries.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score; // Most overdue first
        if (b.totalCost !== a.totalCost) return b.totalCost - a.totalCost; // Highest cost first
        return a.owner.name.localeCompare(b.owner.name); // Alphabetical
    });
    
    return callListEntries;
}

// Router & Views
function router() {
    const hash = window.location.hash || '#/call-list';
    const root = document.getElementById('app-root');
    root.innerHTML = '';
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    if (hash === '#/call-list') {
        document.getElementById('nav-call-list').classList.add('active');
        const tpl = document.getElementById('tpl-call-list').content.cloneNode(true);
        root.appendChild(tpl);
        renderCallList();
    } else if (hash === '#/vehicles') {
        document.getElementById('nav-vehicles').classList.add('active');
        const tpl = document.getElementById('tpl-vehicles').content.cloneNode(true);
        root.appendChild(tpl);
        renderVehicles();
    } else if (hash.startsWith('#/vehicle/')) {
        document.getElementById('nav-vehicles').classList.add('active');
        const id = hash.split('/')[2];
        const tpl = document.getElementById('tpl-vehicle-detail').content.cloneNode(true);
        root.appendChild(tpl);
        renderVehicleDetail(id);
    } else if (hash === '#/forecast') {
        document.getElementById('nav-forecast').classList.add('active');
        const tpl = document.getElementById('tpl-forecast').content.cloneNode(true);
        root.appendChild(tpl);
        renderForecast();
    } else {
        window.location.hash = '#/call-list';
    }
}

function renderCallList() {
    const entries = analyzeAll();
    const container = document.getElementById('call-list-container');
    
    if (entries.length === 0) {
        container.innerHTML = '<div class="empty-state"><strong>All caught up</strong>No vehicle has overdue or due-soon work today.</div>';
        return;
    }
    
    const totVeh = entries.length;
    const totOwners = new Set(entries.map(e => e.vehicle.owner_id)).size;
    const totOverdue = entries.reduce((n, e) => n + e.overdue.length, 0);
    const totSoon = entries.reduce((n, e) => n + e.dueSoon.length, 0);
    const totChronic = entries.filter(e => e.chronicOnly).length;
    const totUnknown = entries.reduce((n, e) => n + (e.unknown ? e.unknown.length : 0), 0);
    const totValue = entries.reduce((n, e) => n + e.totalCost, 0);

    let html = `<div class="summary-bar">
        <div class="summary-stat"><span class="summary-num">${totVeh}</span>vehicles to call<small>${totOwners} owners</small></div>
        <div class="summary-stat"><span class="summary-num danger">${totOverdue}</span>items overdue<small>${totChronic} vehicles backlog-only</small></div>
        <div class="summary-stat"><span class="summary-num warn">${totSoon}</span>due within ${DUE_SOON_DAYS} days${totUnknown ? `<small>${totUnknown} need review</small>` : ''}</div>
        <div class="summary-stat"><span class="summary-num">৳${totValue.toLocaleString()}</span>estimated value</div>
    </div>`;

    html += '<div class="table-wrap"><table class="stacked"><thead><tr><th class="owner-col">Owner</th><th class="vehicle-col">Vehicle</th><th class="items-col">Action Items</th><th class="cost-col">Est. Cost</th></tr></thead><tbody>';

    STATE.smsByVehicle = {};

    entries.forEach(e => {
        let itemsHtml = '';
        e.overdue.forEach(i => {
            itemsHtml += `<span class="item-badge status-overdue">${i.item.name}</span> <span class="item-reason">${i.basis}</span>`;
        });
        e.dueSoon.forEach(i => {
            itemsHtml += `<span class="item-badge status-due_soon">${i.item.name}</span> <span class="item-reason">${i.basis}</span>`;
        });
        (e.unknown || []).forEach(i => {
            itemsHtml += `<span class="item-badge status-unknown">${i.item.name} — needs review</span> <span class="item-reason">${i.basis || 'No due date on record.'}</span>`;
        });

        let smsText = `Dear ${e.owner.name},\nYour vehicle ${e.vehicle.model} (${e.vehicle.plate}) has services due:\n`;
        e.overdue.forEach(i => smsText += `- ${i.item.name} (Overdue, Est: ৳${i.cost})\n`);
        e.dueSoon.forEach(i => smsText += `- ${i.item.name} (Due Soon, Est: ৳${i.cost})\n`);
        (e.unknown || []).forEach(i => smsText += `- ${i.item.name} (Needs review, Est: ৳${i.cost})\n`);
        smsText += `\nTotal estimated cost: ৳${e.totalCost.toFixed(2)}`;
        STATE.smsByVehicle[e.vehicle.id] = smsText;

        html += `
        <tr>
            <td data-label="Owner">
                <strong>${e.owner.name}</strong>${e.chronicOnly ? ' <span class="chronic-tag" title="Every overdue item on this vehicle is more than ' + CHRONIC_DAYS + ' days old — standing backlog rather than new work">BACKLOG</span>' : ''}<br>
                <a href="tel:${e.owner.phone}" style="color:var(--primary);text-decoration:none;">${e.owner.phone}</a><br>
                <button class="btn btn-small btn-secondary" style="margin-top:0.5rem;" onclick="copySms('${e.vehicle.id}')">Copy SMS</button>
            </td>
            <td data-label="Vehicle">
                <strong><a href="#/vehicle/${e.vehicle.id}" style="color:var(--text-main);">${e.vehicle.model}</a></strong><br>
                ${e.vehicle.plate}
            </td>
            <td data-label="Action Items">${itemsHtml}</td>
            <td class="text-right" data-label="Estimated Cost"><strong>৳${e.totalCost.toFixed(2)}</strong></td>
        </tr>`;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function renderVehicles() {
    const container = document.getElementById('vehicles-container');
    const search = document.getElementById('vehicle-search');
    
    function draw(filter = '') {
        let html = '';
        const lowerFilter = filter.toLowerCase();
        STATE.data.vehicles.forEach(v => {
            const owner = STATE.ownerById[v.owner_id];
            if (filter && !v.model.toLowerCase().includes(lowerFilter) && !v.plate.toLowerCase().includes(lowerFilter) && !owner.name.toLowerCase().includes(lowerFilter)) {
                return;
            }
            html += `
            <div class="card" onclick="window.location.hash='#/vehicle/${v.id}'">
                <div class="card-title">${v.model}</div>
                <div class="card-subtitle">${v.plate}</div>
                <div style="color:var(--text-muted);font-size:0.875rem;">Owner: ${owner.name}</div>
            </div>`;
        });
        container.innerHTML = html || `<div class="empty-state"><strong>No vehicles match "${filter}"</strong>Try a model, plate, or owner name.</div>`;
    }
    
    search.addEventListener('input', e => draw(e.target.value));
    draw();
}

function renderVehicleDetail(id) {
    const v = STATE.vehicleById[id];
    if (!v) {
        document.getElementById('vehicle-detail-container').innerHTML = '<div class="error">Vehicle not found.</div>';
        return;
    }
    const owner = STATE.ownerById[v.owner_id];
    const latestOdo = v.odometer_readings[v.odometer_readings.length - 1];

    document.getElementById('vd-title').textContent = `${v.model} — ${v.plate}`;

    // Ensure analysis is up to date
    v.analyzedItems = v.service_items.map(item => calculateItemDue(v, item));
    
    let html = `
    <div class="info-panel">
        <div class="info-item">
            <h3>Owner</h3>
            <p>${owner.name} <br> <a href="tel:${owner.phone}" style="color:var(--primary);font-size:0.9rem;text-decoration:none;">${owner.phone}</a></p>
        </div>
        <div class="info-item">
            <h3>Vehicle</h3>
            <p>${v.model} <br> <span style="font-size:0.9rem;color:var(--text-muted);">${v.plate}</span></p>
        </div>
        <div class="info-item">
            <h3>Current Odometer</h3>
            <p>${latestOdo ? latestOdo.km.toLocaleString() + ' km' : 'Unknown'}</p>
            <div style="font-size:0.75rem;color:var(--text-muted);">As of ${latestOdo ? latestOdo.date : 'N/A'}</div>
        </div>
    </div>
    
    <div class="flex-row">
        <div class="form-group" style="margin-bottom:0; flex:1;">
            <label for="new-odo">Update odometer (km)</label>
            <input type="number" id="new-odo" class="form-control" placeholder="e.g. ${latestOdo ? (latestOdo.km + 250).toLocaleString() : '50,000'}" min="${latestOdo ? latestOdo.km : 0}">
        </div>
        <button class="btn" onclick="updateOdometer('${v.id}')">Update</button>
    </div>
    <div class="field-error" id="odo-err"></div>
    
    <h3 class="section-title">Service Items</h3>
    <div class="table-wrap"><table class="stacked">
        <thead><tr><th>Item</th><th>Rule</th><th>Next Due</th><th>Cost</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
    `;
    
    v.analyzedItems.forEach((a, index) => {
        let badgeClass = `status-${a.status}`;
        
        html += `
        <tr>
            <td data-label="Item"><strong>${a.item.name}</strong></td>
            <td data-label="Rule"><span style="font-size:0.85rem;color:var(--text-muted);">${a.item.rule}</span></td>
            <td data-label="Next Due">${a.dueDate ? formatDate(a.dueDate) : 'Unknown'}<br><span style="font-size:0.75rem;color:var(--text-muted);">${a.basis}</span></td>
            <td data-label="Cost">৳${a.cost.toFixed(2)}</td>
            <td data-label="Status"><span class="item-badge ${badgeClass}">${a.status.replace('_', ' ').toUpperCase()}</span></td>
            <td data-label="Action">
                <button class="btn btn-small btn-secondary" onclick="document.getElementById('record-form-${index}').style.display='block'">Record</button>
                <div id="record-form-${index}" class="record-form" style="display:none;">
                    <label class="field-label" for="record-date-${index}">Service date</label>
                    <input type="date" id="record-date-${index}" class="form-control" value="${fmtISO(STATE.today)}" max="${fmtISO(STATE.today)}">
                    ${a.item.rule === 'distance_km' ? `
                    <label class="field-label" for="record-km-${index}">Odometer at service (km)</label>
                    <input type="number" id="record-km-${index}" class="form-control" placeholder="Odometer km" value="${latestOdo ? latestOdo.km : ''}">` : ''}
                    ${a.item.rule === 'fixed_date' ? `
                    <label class="field-label" for="record-due-${index}">New due date <span class="req">required</span></label>
                    <input type="date" id="record-due-${index}" class="form-control" value="${fmtISO(addMonths(STATE.today, 12))}">
                    <div class="field-hint">The certificate authority sets this date, so it is entered, not calculated.</div>` : ''}
                    <div class="field-error" id="record-err-${index}"></div>
                    <button class="btn btn-small" onclick="recordService('${v.id}', ${index})">Save</button>
                    <button class="btn btn-small btn-secondary" onclick="document.getElementById('record-form-${index}').style.display='none'">Cancel</button>
                </div>
            </td>
        </tr>`;
    });
    
    html += `</tbody></table></div>`;

    html += `<h3 class="section-title">Service History</h3>`;
    if (v.service_history && v.service_history.length > 0) {
        html += `<div class="table-wrap"><table class="stacked"><thead><tr><th>Date</th><th>Item</th><th>Odometer</th><th>Cost</th></tr></thead><tbody>`;
        [...v.service_history].reverse().forEach(h => {
            html += `<tr>
                <td data-label="Date">${h.date}</td>
                <td data-label="Item"><strong>${h.item}</strong></td>
                <td data-label="Odometer">${h.km !== null ? h.km.toLocaleString() + ' km' : '—'}</td>
                <td data-label="Cost">৳${parseFloat(h.cost_bdt).toFixed(2)}</td>
            </tr>`;
        });
        html += `</tbody></table></div>`;
    } else {
        html += `<div class="empty-state">No service recorded for this vehicle yet.</div>`;
    }
    
    document.getElementById('vehicle-detail-container').innerHTML = html;
}

window.copySms = function(vid) {
    const text = STATE.smsByVehicle && STATE.smsByVehicle[vid];
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showToast('SMS copied!');
    }).catch(() => {
        showToast('Could not copy — clipboard access blocked');
    });
}

window.updateOdometer = function(vid) {
    const v = STATE.vehicleById[vid];
    const newKm = parseInt(document.getElementById('new-odo').value, 10);
    const latestOdo = v.odometer_readings[v.odometer_readings.length - 1];
    
    if (isNaN(newKm)) {
        return setFieldError('odo-err', "Enter the new odometer reading in km.");
    }
    if (latestOdo && newKm < latestOdo.km) {
        return setFieldError('odo-err', `Odometer cannot decrease. Current reading is ${latestOdo.km.toLocaleString()} km.`);
    }
    if (latestOdo && newKm === latestOdo.km) {
        return setFieldError('odo-err', `That is already the current reading (${latestOdo.km.toLocaleString()} km).`);
    }
    setFieldError('odo-err', '');
    
    v.odometer_readings.push({
        date: fmtISO(STATE.today),
        km: newKm
    });
    
    showToast("Odometer updated!");
    renderVehicleDetail(vid); // re-render
}

window.recordService = function(vid, itemIndex) {
    const v = STATE.vehicleById[vid];
    const item = v.service_items[itemIndex];
    const err = (msg) => setFieldError(`record-err-${itemIndex}`, msg);

    const dateStr = document.getElementById(`record-date-${itemIndex}`).value;
    const kmEl = document.getElementById(`record-km-${itemIndex}`);
    const dueEl = document.getElementById(`record-due-${itemIndex}`);
    const latestOdo = v.odometer_readings[v.odometer_readings.length - 1];
    const currentKm = latestOdo ? latestOdo.km : 0;

    if (!dateStr) return err("Enter the service date.");
    if (parseLocalDate(dateStr) > STATE.today) {
        return err(`Service date cannot be after ${fmtISO(STATE.today)}.`);
    }

    const priorForItem = v.service_history.filter(h => h.item === item.name);
    const lastForItem = priorForItem.length ? priorForItem[priorForItem.length - 1] : null;
    if (lastForItem && parseLocalDate(dateStr) < parseLocalDate(lastForItem.date)) {
        return err(`A later service is already recorded for this item (${lastForItem.date}).`);
    }

    // Odometer km is meaningful only for distance-based items.
    let km = null;
    if (item.rule === 'distance_km') {
        const kmStr = kmEl ? kmEl.value : '';
        km = kmStr === '' ? null : parseInt(kmStr, 10);
        if (km === null || isNaN(km)) return err("Enter the odometer reading for this service.");
        if (km > currentKm) {
            return err(`Service km cannot exceed the current odometer reading (${currentKm.toLocaleString()} km).`);
        }
        if (lastForItem && lastForItem.km !== null && km < lastForItem.km) {
            return err(`Service km cannot be below the previous service km (${lastForItem.km.toLocaleString()} km).`);
        }
    }

    // fixed_date items carry no renewal period in the schema, so the new expiry is entered,
    // not derived. Without this the item would stay overdue forever after being recorded.
    let newDueDate = null;
    if (item.rule === 'fixed_date') {
        newDueDate = dueEl ? dueEl.value : '';
        if (!newDueDate) return err("Enter the new due date.");
        if (parseLocalDate(newDueDate) <= parseLocalDate(dateStr)) {
            return err("New due date must be after the service date.");
        }
    }

    v.service_history.push({
        item: item.name,
        date: dateStr,
        km: km,
        cost_bdt: item.cost_bdt
    });
    v.service_history.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

    if (newDueDate) item.due_date = newDueDate;

    showToast(`Service recorded for ${item.name}`);
    renderVehicleDetail(vid); // re-render — only this item's baseline moved
}

function renderForecast() {
    const container = document.getElementById('forecast-container');
    let weeks = [0,0,0,0,0,0,0,0]; // 8 weeks, [0] is overdue/this week
    let weekRevenue = [0,0,0,0,0,0,0,0];
    
    STATE.data.vehicles.forEach(v => {
        v.service_items.forEach(item => {
            const analysis = calculateItemDue(v, item);
            if (analysis.dueDate) {
                const diff = dateDiffDays(STATE.today, analysis.dueDate);
                let w = diff < 0 ? 0 : Math.floor(diff / 7);
                if (w < 8) {
                    weeks[w]++;
                    weekRevenue[w] += analysis.cost;
                }
            } else if (analysis.status === 'overdue') {
                weeks[0]++;
                weekRevenue[0] += analysis.cost;
            }
        });
    });
    
    let maxCount = Math.max(...weeks, 1);
    
    let html = '';
    for (let i = 0; i < 8; i++) {
        let heightPct = (weeks[i] / maxCount) * 100;
        if (heightPct < 5 && weeks[i] > 0) heightPct = 5;
        let label = i === 0 ? 'Overdue/<br>Week 1' : `Week ${i+1}`;
        html += `
        <div style="display:flex; flex-direction:column; justify-content:flex-end; height:100%;">
            <div style="text-align:center; margin-bottom:0.5rem; font-size:0.75rem; color:var(--primary); font-weight:bold;">৳${weekRevenue[i].toLocaleString()}</div>
            <div class="forecast-col" style="height:${heightPct}%; position:relative;" title="${weeks[i]} items due">
                <span style="position:absolute; top:-20px; font-weight:bold; font-size:0.875rem;">${weeks[i]}</span>
            </div>
            <div class="forecast-label">${label}</div>
        </div>
        `;
    }
    
    container.innerHTML = html;
}

// ---- Dataset loading ----------------------------------------------------------
// The engine never assumes the bundled fixture. Any JSON of the same shape can be loaded,
// either from disk on startup or uploaded by the user, and everything recomputes from it.

const REQUIRED_RULES = ['fixed_date', 'period_months', 'distance_km'];

// Returns an array of problems, empty if the case is usable.
function validateCase(c, label) {
    const errs = [];
    if (!c || typeof c !== 'object') return [`${label} is not an object`];
    if (!c.today || !parseLocalDate(c.today)) errs.push(`${label}: missing a valid "today" date (YYYY-MM-DD)`);
    if (!Array.isArray(c.owners) || c.owners.length === 0) errs.push(`${label}: "owners" must be a non-empty array`);
    if (!Array.isArray(c.vehicles) || c.vehicles.length === 0) errs.push(`${label}: "vehicles" must be a non-empty array`);
    if (errs.length) return errs;

    c.vehicles.forEach((v, i) => {
        const vl = `${label} vehicle ${v && v.id ? v.id : '#' + (i + 1)}`;
        if (!v.id) errs.push(`${vl}: missing "id"`);
        if (!Array.isArray(v.service_items)) errs.push(`${vl}: missing "service_items" array`);
        if (!Array.isArray(v.odometer_readings)) errs.push(`${vl}: missing "odometer_readings" array`);
        (v.service_items || []).forEach(it => {
            if (!it.name) errs.push(`${vl}: a service item has no "name"`);
            if (!REQUIRED_RULES.includes(it.rule)) {
                errs.push(`${vl} / ${it.name || '?'}: unknown rule "${it.rule}" (expected ${REQUIRED_RULES.join(', ')})`);
            }
        });
    });
    return errs.slice(0, 8); // enough to diagnose, not a wall of text
}

// Accepts either { cases: [...] }, a bare array of cases, or one case object.
function normaliseCases(json) {
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.cases)) return json.cases;
    if (json && (json.vehicles || json.owners)) return [json];
    throw new Error('Could not find any cases. Expected an object with a "cases" array, or a single case with "owners" and "vehicles".');
}

// Prepares one case for use: sorts the arrays the engine assumes are ordered, indexes
// owners and vehicles, and substitutes a placeholder for any vehicle whose owner_id
// does not resolve, so one bad reference cannot blank the whole dashboard.
function activateCase(index) {
    const c = STATE.cases[index];
    STATE.caseIndex = index;
    STATE.data = c;
    STATE.today = parseLocalDate(c.today);
    STATE.ownerById = {};
    STATE.vehicleById = {};
    STATE.warnings = [];

    c.owners.forEach(o => { STATE.ownerById[o.id] = o; });
    c.vehicles.forEach(v => {
        v.odometer_readings = (v.odometer_readings || []).slice()
            .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
        v.service_history = (v.service_history || []).slice()
            .sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
        if (!STATE.ownerById[v.owner_id]) {
            STATE.ownerById[v.owner_id] = { id: v.owner_id, name: `Unknown owner (${v.owner_id})`, phone: '' };
            STATE.warnings.push(`Vehicle ${v.id} references owner "${v.owner_id}", which is not in the owners list.`);
        }
        STATE.vehicleById[v.id] = v;
    });
    renderDataBar();
}

// Validates a parsed JSON payload and makes it the active dataset.
// goHome is for a *user-initiated* dataset change, where the vehicle currently on screen may not
// exist in the new file. On first load it must stay false, or deep links and refreshes get
// bounced to the call list.
function applyDataset(json, sourceLabel, goHome) {
    const cases = normaliseCases(json);
    if (!cases.length) throw new Error('The file contains an empty "cases" array.');

    const errs = validateCase(cases[0], cases[0].case_id || 'Case 1');
    if (errs.length) throw new Error('This file does not match the expected schema:\n• ' + errs.join('\n• '));

    STATE.cases = cases;
    STATE.source = sourceLabel;
    activateCase(0);

    if (goHome && window.location.hash && window.location.hash !== '#/call-list') {
        window.location.hash = '#/call-list';   // fires hashchange, which routes
    } else {
        router();                                // honour whatever route was asked for
    }
    return cases.length;
}

function renderDataBar() {
    const bar = document.getElementById('data-bar');
    if (!bar) return;
    const c = STATE.data;
    if (!c) {   // no dataset yet (bundled fetch failed) — still offer the upload control
        bar.innerHTML = `<div class="data-bar-inner">
            <div class="data-meta"><span class="data-source">No dataset loaded</span>
            <span class="data-facts">Load a JSON file to begin</span></div>
            <div class="data-actions"><button class="btn btn-small" id="btn-upload">Load JSON</button></div>
          </div><div class="field-error" id="data-err"></div>`;
        document.getElementById('btn-upload').addEventListener('click',
            () => document.getElementById('file-input').click());
        return;
    }
    const options = STATE.cases.map((x, i) =>
        `<option value="${i}"${i === STATE.caseIndex ? ' selected' : ''}>${x.case_id || 'Case ' + (i + 1)}</option>`).join('');

    bar.innerHTML = `
      <div class="data-bar-inner">
        <div class="data-meta">
          <span class="data-source" title="${STATE.source}">${STATE.source}</span>
          <span class="data-facts">${c.vehicles.length} vehicles · ${c.owners.length} owners · as of ${c.today}</span>
        </div>
        <div class="data-actions">
          ${STATE.cases.length > 1 ? `<label class="data-case"><span>Case</span>
            <select id="case-select" class="data-select">${options}</select></label>` : ''}
          <button class="btn btn-small btn-secondary" id="btn-upload">Load JSON</button>
          ${STATE.source !== DEFAULT_SOURCE ? `<button class="btn btn-small btn-secondary" id="btn-reset-data">Use bundled data</button>` : ''}
        </div>
      </div>
      <div class="field-error" id="data-err"></div>`;

    const sel = document.getElementById('case-select');
    if (sel) sel.addEventListener('change', e => { activateCase(Number(e.target.value)); router(); });
    document.getElementById('btn-upload').addEventListener('click', () => document.getElementById('file-input').click());
    const reset = document.getElementById('btn-reset-data');
    if (reset) reset.addEventListener('click', () => loadBundled(true).catch(e => setFieldError('data-err', e.message)));

    if (STATE.warnings.length) {
        setFieldError('data-err', `${STATE.warnings.length} data issue(s): ${STATE.warnings.slice(0, 3).join(' ')}`);
    }
}

function handleFile(file) {
    if (!file) return;
    if (!/\.json$/i.test(file.name)) {
        return setFieldError('data-err', `"${file.name}" is not a .json file.`);
    }
    const reader = new FileReader();
    reader.onload = () => {
        let json;
        try {
            json = JSON.parse(reader.result);
        } catch (err) {
            return setFieldError('data-err', `That file is not valid JSON — ${err.message}`);
        }
        try {
            const n = applyDataset(json, file.name, true);
            showToast(`Loaded ${file.name}${n > 1 ? ` (${n} cases)` : ''}`);
        } catch (err) {
            setFieldError('data-err', err.message);
        }
    };
    reader.onerror = () => setFieldError('data-err', 'Could not read that file.');
    reader.readAsText(file);
}

const DEFAULT_SOURCE = 'P09_vehicle_service_public.json (bundled)';

async function loadBundled(goHome) {
    const res = await fetch('P09_vehicle_service_public.json');
    if (!res.ok) throw new Error('Failed to load the bundled JSON file.');
    applyDataset(await res.json(), DEFAULT_SOURCE, goHome);
}

// Init
async function init() {
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', e => {
        handleFile(e.target.files[0]);
        e.target.value = ''; // let the same file be picked twice
    });

    // Drag a file anywhere onto the page to load it.
    ['dragover', 'drop'].forEach(evt => document.addEventListener(evt, e => e.preventDefault()));
    document.addEventListener('dragenter', () => document.body.classList.add('dragging'));
    document.addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('dragging'); });
    document.addEventListener('drop', e => {
        document.body.classList.remove('dragging');
        handleFile(e.dataTransfer.files[0]);
    });

    window.addEventListener('hashchange', router);

    try {
        await loadBundled(false);
    } catch (e) {
        document.getElementById('app-root').innerHTML = `<div class="error" style="text-align:center; padding:3rem;">
            <h2>Could not load the bundled dataset</h2>
            <p>${e.message}</p>
            <p style="margin-top:1rem; color:var(--text-muted); font-size:0.9rem;">
              This page reads its data with <code>fetch</code>, which browsers block on <code>file://</code>.
              Serve the folder over HTTP (e.g. <code>python3 -m http.server</code>), or use
              <strong>Load JSON</strong> above to pick a file from disk.</p>
        </div>`;
        renderDataBar();
    }
}

init();
