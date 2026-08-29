import { useCallback, useEffect, useState } from 'react';
import {
  getMe,
  updateMe,
  setDirectoryVisibility,
  setPublicProfileEnabled,
  getOrcidAuthorizeUrl,
  downloadCv,
} from '../services/faculty.service';

/**
 * Owns the current user's Faculty document. Exposes fetch + all
 * profile-level mutations. UI-side loading flags (per-button spinners) live
 * in the components that trigger them; this hook only tracks global load/error.
 */
export function useProfile() {
  const [faculty, setFaculty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    try {
      const me = await getMe();
      setFaculty(me);
      return me;
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load profile');
      throw err;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (!cancelled) setFaculty(me);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error?.message || 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = useCallback(async fields => {
    const updated = await updateMe(fields);
    setFaculty(updated);
    return updated;
  }, []);

  const updateTags = tags => patch({ domainTags: tags });
  const updateBasicInfo = fields => patch(fields);
  const updateBio = bio => patch({ bio });
  const updateEmployment = list => patch({ employmentHistory: list });
  const updateEducation = list => patch({ education: list });
  const updateAwards = list => patch({ awards: list });
  const updateGrants = list => patch({ grantsReceived: list });
  const updateLinks = links => patch({ externalLinks: links });

  const toggleVisibility = async next => {
    const updated = await setDirectoryVisibility(next);
    setFaculty(updated);
    return updated;
  };

  const togglePublicProfile = async next => {
    const updated = await setPublicProfileEnabled(next);
    setFaculty(updated);
    return updated;
  };

  const connectOrcid = async () => {
    const url = await getOrcidAuthorizeUrl();
    window.location.href = url;
  };

  const exportCv = async () => {
    await downloadCv();
  };

  return {
    faculty,
    loading,
    error,
    setError,
    setFaculty,
    refetch,
    patch,
    updateTags,
    updateBasicInfo,
    updateBio,
    updateEmployment,
    updateEducation,
    updateAwards,
    updateGrants,
    updateLinks,
    toggleVisibility,
    togglePublicProfile,
    connectOrcid,
    exportCv,
  };
}
