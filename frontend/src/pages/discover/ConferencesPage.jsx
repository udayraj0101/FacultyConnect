import React from 'react';
import DiscoverShell from './DiscoverShell';
import { TYPE_META } from '../../lib/opportunityTypes';

export default function ConferencesPage() {
  return <DiscoverShell typeConfig={TYPE_META.conference} />;
}
