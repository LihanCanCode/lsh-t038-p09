const fs = require('fs');
let app = fs.readFileSync('app.jsx', 'utf8');
const premium = fs.readFileSync('new/PremiumCallList.jsx', 'utf8');
const startIdx = app.indexOf('function Stat({ value, label, sub, tone }) {');
const endIdx = app.indexOf('/* ---------- vehicles ---------- */');
if (startIdx !== -1 && endIdx !== -1) {
    let premiumComponents = premium.split('function PriorityMark')[1];
    premiumComponents = 'function PriorityMark' + premiumComponents;
    app = app.substring(0, startIdx) + premiumComponents + '\n\n' + app.substring(endIdx);
} else {
    console.log('Could not find start/end bounds for components');
}
app = app.replace('view = <CallList ds={ds} />;', 'view = <PremiumCallList ds={ds} />;');
if (!app.includes(import './premium-call-list.css';)) {
    app = app.replace(import './premium-home.css';, import './premium-home.css';\nimport './premium-call-list.css';);
}
app = app.replace(main className={route === '#' || route === '' ? 'w-full', main className={route === '#' || route === '' || route === '#/call-list' ? 'w-full'});
fs.writeFileSync('app.jsx', app);
console.log('Updated app.jsx successfully');

