// ============================================================
// SUPABASE — multi-user auth + data sync
// Tabellen:
//   user_profiles  — user_id (uuid), geboortejaar, pensioen_leeftijd,
//                    user_type ('dga'|'prive'), onboarding_completed
//   fire_data      — user_id, params (jsonb), pk_cache (jsonb), updated_at
//   voortgang      — id, user_id, datum, bv, prive, inleg_bv, bv_spaar,
//                    prive_spaar, notitie, created_at
// ============================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

export const supabaseEnabled = !!(SUPABASE_URL && SUPABASE_KEY);

// ── Lokale cache keys ─────────────────────────────────────
const LOCAL_KEY    = 'fire_app_v1';
const PK_CACHE_KEY = 'fire_app_pk_v1';

// ── Auth helpers ──────────────────────────────────────────

/** Stuur magic link naar e-mailadres */
export async function signInWithMagicLink(email) {
  if (!supabase) return { error: new Error('Supabase niet geconfigureerd') };
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

export function onAuthStateChange(callback) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

// ── Profiel ───────────────────────────────────────────────

export async function loadProfile(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.error('loadProfile:', error); return null; }
  return data;
}

export async function saveProfile(userId, profile) {
  if (!supabase) return false;
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ user_id: userId, ...profile, updated_at: new Date().toISOString() },
             { onConflict: 'user_id' });
  if (error) { console.error('saveProfile:', error); return false; }
  return true;
}

// ── Fire data (params + pk_cache) ────────────────────────

export async function loadFireData(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('fire_data')
    .select('params, pk_cache')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.error('loadFireData:', error); return null; }
  return data
    ? { params: data.params ?? {}, pkCache: data.pk_cache ?? null }
    : null;
}

export async function saveFireData(userId, params, pkCache) {
  if (!supabase) return false;
  const { error } = await supabase
    .from('fire_data')
    .upsert({
      user_id:    userId,
      params:     params   ?? {},
      pk_cache:   pkCache  ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  if (error) { console.error('saveFireData:', error); return false; }
  return true;
}

// ── Voortgang (portfolio-updates) ─────────────────────────

export async function loadVoortgang(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('voortgang')
    .select('*')
    .eq('user_id', userId)
    .order('datum', { ascending: true });
  if (error) { console.error('loadVoortgang:', error); return null; }
  return data ?? [];
}

export async function upsertVoortgang(userId, record) {
  if (!supabase) return false;
  const { error } = await supabase
    .from('voortgang')
    .upsert({
      user_id: userId,
      ...record,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) { console.error('upsertVoortgang:', error); return false; }
  return true;
}

export async function deleteVoortgang(id) {
  if (!supabase) return false;
  const { error } = await supabase.from('voortgang').delete().eq('id', id);
  if (error) { console.error('deleteVoortgang:', error); return false; }
  return true;
}

// ── localStorage helpers (offline fallback) ──────────────

export function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const pk  = localStorage.getItem(PK_CACHE_KEY);
    return {
      params:   raw ? JSON.parse(raw) : {},
      pkCache:  pk  ? JSON.parse(pk)  : null,
    };
  } catch {
    return { params: {}, pkCache: null };
  }
}

export function saveLocal(params, pkCache) {
  try {
    localStorage.setItem(LOCAL_KEY,    JSON.stringify(params));
    localStorage.setItem(PK_CACHE_KEY, JSON.stringify(pkCache));
  } catch {}
}
