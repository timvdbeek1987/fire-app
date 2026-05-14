import React from 'react';
import { FlaskConical } from 'lucide-react';

// TODO: kopieer/adapteer van fire-dashboard
export default function Scenarios({ params, start, mcResult, birthYear }) {
  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Analyse</div>
          <h2 className="section-title">Scenario's</h2>
        </div>
      </div>
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <FlaskConical size={32} style={{ color: 'var(--text-4)', marginBottom: '1rem' }} />
        <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-2)' }}>Binnenkort beschikbaar</h3>
        <p style={{ color: 'var(--text-3)', fontSize: '0.88rem', maxWidth: 400, margin: '0 auto' }}>
          Stress-tests met marktcrashes, hoge inflatie en historische MSCI World scenario's.
          In ontwikkeling.
        </p>
      </div>
    </div>
  );
}
