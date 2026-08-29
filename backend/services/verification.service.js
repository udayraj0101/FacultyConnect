import { Opportunity } from '../models/Opportunity.js';
import { lookupIssn } from '../data/ugcCareList.js';

export function verifyIssn(issn) {
  return lookupIssn(issn);
}

export async function setOpportunityVerification(id, { verificationBadge, lastVerifiedAgainstUgcCareOn }) {
  const opp = await Opportunity.findById(id);
  if (!opp) {
    const err = new Error('Opportunity not found');
    err.code = 'OPPORTUNITY_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  opp.verificationBadge = verificationBadge;
  if (verificationBadge === 'ugc_care_verified') {
    opp.lastVerifiedAgainstUgcCareOn = lastVerifiedAgainstUgcCareOn || new Date();
  } else if (lastVerifiedAgainstUgcCareOn) {
    opp.lastVerifiedAgainstUgcCareOn = lastVerifiedAgainstUgcCareOn;
  }
  await opp.save();
  return opp;
}
