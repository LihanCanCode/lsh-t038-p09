const STATE = {
    data: null,
    today: null,
    ownerById: {},
    vehicleById: {}
};

// Utilities
function dateDiffDays(d1, d2) {
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

function formatDate(dateObj) {
    if (!dateObj) return 'N/A';
    return dateObj.toISOString().split('T')[0];
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
            const days = dateDiffDays(new Date(r2.date), new Date(r1.date));
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
            dueDate = new Date(item.due_date);
            basis = `Fixed date: ${item.due_date}`;
        } else {
            basis = `Missing due date`;
        }
    } 
    else if (item.rule === 'period_months') {
        let baseDate;
        if (lastService) {
            baseDate = new Date(lastService.date);
        } else if (firstOdo) {
            baseDate = new Date(firstOdo.date);
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
            const daysRemaining = kmRemaining / rate;
            dueDate = addDays(STATE.today, daysRemaining);
            basis += `Due at ${dueAtKm} km (~${kmRemaining} km away at ${rate.toFixed(1)} km/day)`;
        } else {
            basis += `Due at ${dueAtKm} km (~${kmRemaining} km away, daily rate unknown)`;
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
        } else if (daysUntil <= 14) {
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
            daysOverdue = 999;
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
            }
            return analysis;
        });
        
        if (vOverdueItems.length > 0 || vDueSoonItems.length > 0) {
            let score = vOverdueItems.length > 0 ? (1000 + maxDaysOverdue) : (500 - minDaysUntil);
            callListEntries.push({
                vehicle: v,
                owner: STATE.ownerById[v.owner_id],
                overdue: vOverdueItems,
                dueSoon: vDueSoonItems,
                totalCost: totalCost,
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
        container.innerHTML = '<div class="empty-state">No calls needed today</div>';
        return;
    }
    
    let html = '<table><thead><tr><th class="owner-col">Owner</th><th class="vehicle-col">Vehicle</th><th class="items-col">Action Items</th><th class="cost-col">Est. Cost</th></tr></thead><tbody>';

    STATE.smsByVehicle = {};

    entries.forEach(e => {
        let itemsHtml = '';
        e.overdue.forEach(i => {
            itemsHtml += `<span class="item-badge status-overdue">${i.item.name}</span> <span class="item-reason">${i.basis}</span>`;
        });
        e.dueSoon.forEach(i => {
            itemsHtml += `<span class="item-badge status-due_soon">${i.item.name}</span> <span class="item-reason">${i.basis}</span>`;
        });

        let smsText = `Dear ${e.owner.name},\nYour vehicle ${e.vehicle.model} (${e.vehicle.plate}) has services due:\n`;
        e.overdue.forEach(i => smsText += `- ${i.item.name} (Overdue, Est: ৳${i.cost})\n`);
        e.dueSoon.forEach(i => smsText += `- ${i.item.name} (Due Soon, Est: ৳${i.cost})\n`);
        smsText += `\nTotal estimated cost: ৳${e.totalCost.toFixed(2)}`;
        STATE.smsByVehicle[e.vehicle.id] = smsText;

        html += `
        <tr>
            <td>
                <strong>${e.owner.name}</strong><br>
                <a href="tel:${e.owner.phone}" style="color:var(--primary);text-decoration:none;">${e.owner.phone}</a><br>
                <button class="btn btn-small btn-secondary" style="margin-top:0.5rem;" onclick="copySms('${e.vehicle.id}')">Copy SMS</button>
            </td>
            <td>
                <strong><a href="#/vehicle/${e.vehicle.id}" style="color:var(--text-main);">${e.vehicle.model}</a></strong><br>
                ${e.vehicle.plate}
            </td>
            <td>${itemsHtml}</td>
            <td class="text-right"><strong>৳${e.totalCost.toFixed(2)}</strong></td>
        </tr>`;
    });

    html += '</tbody></table>';
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
        container.innerHTML = html;
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
        <div class="form-group" style="margin-bottom:0;">
            <label>Update Odometer</label>
            <input type="number" id="new-odo" class="form-control" placeholder="Enter new km..." min="${latestOdo ? latestOdo.km : 0}">
        </div>
        <button class="btn" onclick="updateOdometer('${v.id}')">Update</button>
    </div>
    
    <h3 class="section-title">Service Items</h3>
    <table>
        <thead><tr><th>Item</th><th>Rule</th><th>Next Due</th><th>Cost</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
    `;
    
    v.analyzedItems.forEach((a, index) => {
        let badgeClass = `status-${a.status}`;
        
        html += `
        <tr>
            <td><strong>${a.item.name}</strong></td>
            <td><span style="font-size:0.85rem;color:var(--text-muted);">${a.item.rule}</span></td>
            <td>${a.dueDate ? formatDate(a.dueDate) : 'Unknown'}<br><span style="font-size:0.75rem;color:var(--text-muted);">${a.basis}</span></td>
            <td>৳${a.cost.toFixed(2)}</td>
            <td><span class="item-badge ${badgeClass}">${a.status.replace('_', ' ').toUpperCase()}</span></td>
            <td>
                <button class="btn btn-small btn-secondary" onclick="document.getElementById('record-form-${index}').style.display='block'">Record</button>
                <div id="record-form-${index}" style="display:none; margin-top:0.5rem; background:var(--bg-dark); padding:0.5rem; border-radius:4px; border:1px solid var(--border);">
                    <input type="date" id="record-date-${index}" class="form-control" value="${STATE.today.toISOString().split('T')[0]}" style="margin-bottom:0.5rem;">
                    <input type="number" id="record-km-${index}" class="form-control" placeholder="Odometer km" value="${latestOdo ? latestOdo.km : ''}" style="margin-bottom:0.5rem;">
                    <button class="btn btn-small" onclick="recordService('${v.id}', ${index})">Save</button>
                    <button class="btn btn-small btn-secondary" onclick="document.getElementById('record-form-${index}').style.display='none'">Cancel</button>
                </div>
            </td>
        </tr>`;
    });
    
    html += `</tbody></table>`;
    
    html += `<h3 class="section-title">Service History</h3>`;
    if (v.service_history && v.service_history.length > 0) {
        html += `<table><thead><tr><th>Date</th><th>Item</th><th>Odometer</th><th>Cost</th></tr></thead><tbody>`;
        [...v.service_history].reverse().forEach(h => {
            html += `<tr>
                <td>${h.date}</td>
                <td><strong>${h.item}</strong></td>
                <td>${h.km !== null ? h.km.toLocaleString() + ' km' : '—'}</td>
                <td>৳${parseFloat(h.cost_bdt).toFixed(2)}</td>
            </tr>`;
        });
        html += `</tbody></table>`;
    } else {
        html += `<div style="color:var(--text-muted);">No service history found.</div>`;
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
    
    if (isNaN(newKm) || (latestOdo && newKm <= latestOdo.km)) {
        alert("Please enter a valid km reading greater than the current reading.");
        return;
    }
    
    v.odometer_readings.push({
        date: STATE.today.toISOString().split('T')[0],
        km: newKm
    });
    
    showToast("Odometer updated!");
    renderVehicleDetail(vid); // re-render
}

window.recordService = function(vid, itemIndex) {
    const v = STATE.vehicleById[vid];
    const item = v.service_items[itemIndex];
    const dateStr = document.getElementById(`record-date-${itemIndex}`).value;
    const kmStr = document.getElementById(`record-km-${itemIndex}`).value;
    
    if (!dateStr) return alert("Date is required.");
    const km = kmStr ? parseInt(kmStr, 10) : null;
    
    if (item.rule === 'distance_km' && km === null) {
        return alert("Odometer reading is required for distance based items.");
    }
    
    v.service_history.push({
        item: item.name,
        date: dateStr,
        km: km,
        cost_bdt: item.cost_bdt
    });
    
    // re-sort history
    v.service_history.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    showToast(`Service recorded for ${item.name}!`);
    renderVehicleDetail(vid); // re-render
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

// Init
async function init() {
    try {
        const res = await fetch('P09_vehicle_service_public.json');
        if (!res.ok) throw new Error("Failed to load JSON file. Are you running a local server?");
        const json = await res.json();
        
        STATE.data = json.cases[0];
        STATE.today = new Date(STATE.data.today);
        
        STATE.data.owners.forEach(o => STATE.ownerById[o.id] = o);
        STATE.data.vehicles.forEach(v => {
            v.odometer_readings.sort((a, b) => new Date(a.date) - new Date(b.date));
            if (v.service_history) {
                v.service_history.sort((a, b) => new Date(a.date) - new Date(b.date));
            } else {
                v.service_history = [];
            }
            STATE.vehicleById[v.id] = v;
        });
        
        window.addEventListener('hashchange', router);
        router();
    } catch (e) {
        document.getElementById('app-root').innerHTML = `<div class="error" style="text-align:center; padding:3rem;">
            <h2>Initialization Error</h2>
            <p>${e.message}</p>
            <p style="margin-top:1rem; color:var(--text-muted); font-size:0.9rem;">If opening directly from disk (file://), try using a local web server (e.g. <code>python -m http.server</code>) to allow fetch API to work.</p>
        </div>`;
    }
}

init();
