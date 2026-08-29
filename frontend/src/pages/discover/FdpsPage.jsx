import React from 'react';
import DiscoverShell from './DiscoverShell';
import { TYPE_META } from '../../lib/opportunityTypes';

export default function FdpsPage() {
  return <DiscoverShell typeConfig={TYPE_META.fdp} />;
}
