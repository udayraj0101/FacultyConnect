// Indian states + UTs, canonical order. Mirrored from
// backend/models/Opportunity.js INDIAN_STATES — keep in sync manually.

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

// Fee-cap presets for the FDP / conference filter. Users think in
// rounded thousands ("under a thousand", "under 5k") — bucketing the
// dropdown into these values matches how they actually budget for
// travel + registration.
export const FEE_PRESETS = [
  { value: '', label: 'Any fee' },
  { value: '0', label: 'Free only' },
  { value: '1000', label: 'Under Rs. 1,000' },
  { value: '2500', label: 'Under Rs. 2,500' },
  { value: '5000', label: 'Under Rs. 5,000' },
  { value: '10000', label: 'Under Rs. 10,000' },
  { value: '25000', label: 'Under Rs. 25,000' },
];
