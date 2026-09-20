import api from './api';

export async function getCasScore() {
  const { data } = await api.get('/faculty/me/cas-score');
  return data;
}

// PATCH with a partial manual-input patch (any subset of the counters).
// Returns the full recomputed score so callers can re-render in one
// round-trip without a follow-up GET.
export async function updateCasManualInputs(patch) {
  const { data } = await api.patch('/faculty/me/cas-score/manual', patch);
  return data;
}
