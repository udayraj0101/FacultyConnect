import { useCallback, useEffect, useState } from 'react';
import {
  listMyPublications,
  importFromOrcid,
  enrichViaCrossref,
  importFromScopus,
  importFromScholarCsv,
} from '../services/publication.service';
import { addPublication, deletePublication } from '../services/faculty.service';

/**
 * Owns the current user's publications list. Provides all import/enrichment
 * mutations. Accepts an optional `onFacultyMetricsChange` callback so Scopus
 * sync can trigger a profile refetch (Scopus sync updates faculty.hIndex,
 * citationCount, i10Index in addition to per-pub citation counts).
 */
export function usePublications({ onFacultyMetricsChange } = {}) {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    const data = await listMyPublications();
    setPublications(data.publications);
    return data.publications;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listMyPublications();
        if (!cancelled) setPublications(data.publications);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Failed to load publications');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const syncOrcid = async () => {
    const summary = await importFromOrcid();
    await refetch();
    return summary;
  };

  const enrichCrossref = async () => {
    const summary = await enrichViaCrossref();
    await refetch();
    return summary;
  };

  const syncScopus = async scopusAuthorId => {
    const summary = await importFromScopus(scopusAuthorId);
    await refetch();
    if (onFacultyMetricsChange) await onFacultyMetricsChange();
    return summary;
  };

  const importScholarCsv = async csv => {
    const summary = await importFromScholarCsv(csv);
    await refetch();
    return summary;
  };

  const addManual = async payload => {
    const pub = await addPublication(payload);
    await refetch();
    return pub;
  };

  const remove = async id => {
    await deletePublication(id);
    await refetch();
  };

  return {
    publications,
    loading,
    error,
    setError,
    refetch,
    syncOrcid,
    enrichCrossref,
    syncScopus,
    importScholarCsv,
    addManual,
    remove,
  };
}
