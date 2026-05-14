import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { fmt, fmtFull } from '../data.js';

const CURRENT_YEAR  = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

// F buiten de component — anders verlies je focus na elke toetsaanslag
const F = ({ label, value, onChange, type = 'number', help, placeholder }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <input
      type={type} className="form-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
    {help && <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: 'var(--text-3)' }}>{help}</div>}
  </div>
);

export default function Voortgang({ params, start, vermogenUpdates, onVoortgangUpdate, birthYear, userType = 'dga' }) {
  const isPrive = userType === 'prive';
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    datum:   `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2,'0')}-15`,
    bv:      '',
    prive:   '',
    inlegBV: '',
    notitie: '',
  });

  const updates = [...(vermogenUpdates ?? [])]
    .sort((a, b) => b.datum.localeCompare(a.datum));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    onVoortgangUpdate({
      datum:   form.datum,
      bv:      isPrive ? 0 : (Number(form.bv) || 0),
      prive:   Number(form.prive)   || 0,
      inlegBV: isPrive ? 0 : (Number(form.inlegBV) || 0),
    });
    setShowForm(false);
    setForm({ datum: `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2,'0')}-15`, bv: '', prive: '', inlegBV: '', notitie: '' });
    setSaving(false);
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-eyebrow">Voortgang</div>
          <h2 className="section-title">Portefeuille-updates</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          <Plus size={14} />
          Update toevoegen
        </button>
      </div>

      {/* Nieuw formulier */}
      {showForm && (
        <div className="card fade-up" style={{ marginBottom: '1.25rem' }}>
          <div className="card-title" style={{ marginBottom: '1.25rem' }}>Nieuwe portefeuille-stand</div>
          <form onSubmit={handleSave}>
            <div className="grid-2">
              <F label="Datum" value={form.datum} onChange={v => setForm(f => ({...f, datum:v}))} type="date" />
              {!isPrive && (
                <F label="BV waarde (€)" value={form.bv} onChange={v => setForm(f => ({...f, bv:v}))} placeholder="0" />
              )}
              <F label={isPrive ? 'Portefeuille waarde (€)' : 'Privé waarde (€)'} value={form.prive} onChange={v => setForm(f => ({...f, prive:v}))} placeholder="0" />
              {!isPrive && (
                <F label="Inleg BV deze periode (€)" value={form.inlegBV} onChange={v => setForm(f => ({...f, inlegBV:v}))} placeholder="0" help="Gestorte bedragen in BV since vorige update" />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Notitie (optioneel)</label>
              <textarea
                className="form-textarea"
                value={form.notitie}
                onChange={e => setForm(f => ({...f, notitie: e.target.value}))}
                placeholder="Bijv. extra inleg, koerscorrectie…"
                style={{ minHeight: 60 }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Annuleer</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Opslaan…' : 'Opslaan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Huidige stand */}
      <div className={isPrive ? 'grid-2' : 'grid-3'} style={{ marginBottom: '1.25rem' }}>
        {!isPrive && (
          <div className="kpi blue">
            <div className="kpi-label">BV nu</div>
            <div className="kpi-value">{fmt(start.bv)}</div>
            <div className="kpi-sub">{start.jaar ? `per ${start.jaar}-${String(start.maand).padStart(2,'0')}` : '—'}</div>
          </div>
        )}
        <div className="kpi green">
          <div className="kpi-label">{isPrive ? 'Portefeuille nu' : 'Privé nu'}</div>
          <div className="kpi-value">{fmt(isPrive ? start.prive : start.prive)}</div>
          <div className="kpi-sub">beleggingsrekening</div>
        </div>
        {!isPrive && (
          <div className="kpi gold">
            <div className="kpi-label">Totaal</div>
            <div className="kpi-value">{fmt((start.bv ?? 0) + (start.prive ?? 0))}</div>
            <div className="kpi-sub">gecombineerd</div>
          </div>
        )}
      </div>

      {/* Historie tabel */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Historische updates</div>
          <div className="card-subtitle">{updates.length} records</div>
        </div>
        {updates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
            Nog geen updates. Voeg je eerste portefeuille-stand toe.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  {!isPrive && <th className="num">BV</th>}
                  <th className="num">{isPrive ? 'Portefeuille' : 'Privé'}</th>
                  <th className="num">Totaal</th>
                  {!isPrive && <th className="num">Inleg BV</th>}
                </tr>
              </thead>
              <tbody>
                {updates.map((u, i) => (
                  <tr key={i}>
                    <td>{u.datum}</td>
                    {!isPrive && <td className="num">{fmtFull(u.bv)}</td>}
                    <td className="num">{fmtFull(u.prive)}</td>
                    <td className="num"><b>{fmtFull((u.bv??0)+(u.prive??0))}</b></td>
                    {!isPrive && <td className="num">{u.inlegBV ? fmtFull(u.inlegBV) : '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
