import React from 'react';
import { ArrowDownCircle } from 'lucide-react';

// TODO: kopieer/adapteer van fire-dashboard
export default function Onttrekking({ params, start, mcResult, birthYear }) {
  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Strategie</div>
          <h2 className="section-title">Onttrekkingsstrategie</h2>
        </div>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <ArrowDownCircle size={32} style={{ color: 'var(--text-4)', marginBottom: '1rem' }} />
        <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-2)' }}>Binnenkort beschikbaar</h3>
        <p style={{ color: 'var(--text-3)', fontSize: '0.88rem', maxWidth: 400, margin: '0 auto' }}>
          Vergelijk SWR, VPW, Guardrails en percentage-strategieën.
          In ontwikkeling.
        </p>
      </div>
    </div>
  );
}
