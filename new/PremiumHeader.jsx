import React from 'react';

export default function PremiumHeader({ route }) {
  const tabs = [
    ['#/call-list', 'Daily Call List', '01'],
    ['#/vehicles', 'Vehicles', '02'],
    ['#/forecast', 'Forecast', '03'],
  ];

  const active = hash => route === hash || (hash === '#/vehicles' && route.startsWith('#/vehicle/'));

  return (
    <header className="premium-header no-print">
      <div className="premium-header__glow" aria-hidden="true" />
      <div className="premium-header__inner">
        <a href="#" className="premium-brand" aria-label="Vehicle Service Predictor home">
          <span className="premium-brand__mark">VS</span>
          <span className="premium-brand__copy">
            <span className="premium-brand__title">Vehicle Service Predictor</span>
            <span className="premium-brand__subtitle">Workshop call planner</span>
          </span>
        </a>

        <nav className="premium-nav" aria-label="Primary navigation">
          {tabs.map(([hash, label, number]) => (
            <a key={hash} href={hash} className={`premium-nav__item ${active(hash) ? 'is-active' : ''}`}>
              <span className="premium-nav__number">{number}</span>
              <span>{label}</span>
              {active(hash) && <span className="premium-nav__indicator" aria-hidden="true" />}
            </a>
          ))}
        </nav>

        <div className="premium-header__status" title="Workspace connected">
          <span className="premium-header__status-dot" />
          <span className="hidden sm:inline">Workspace online</span>
        </div>
      </div>
    </header>
  );
}

export { PremiumHeader };
