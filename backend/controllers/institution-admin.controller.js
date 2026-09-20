import * as inviteService from '../services/faculty-invite.service.js';
import * as approvalService from '../services/faculty-approval.service.js';
import {
  inviteFacultySchema,
  bulkInviteFacultySchema,
  rejectFacultySchema,
  listFacultyQuerySchema,
  offboardFacultySchema,
} from '../schemas/institution-admin.schema.js';

function validationError(res, parsed) {
  const details = parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
  return res.status(400).json({
    error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details },
  });
}

export async function inviteHandler(req, res) {
  const parsed = inviteFacultySchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);
  try {
    const result = await inviteService.inviteOneByActor(req.user.id, parsed.data);
    return res.status(201).json(result);
  } catch (error) {
    // Surface DOMAIN_MISMATCH metadata so the frontend can render the
    // right override prompt (invited vs institution domain).
    return res.status(error.status || 500).json({
      error: {
        code: error.code || 'INVITE_FAILED',
        message: error.message,
        ...(error.meta ? { meta: error.meta } : {}),
      },
    });
  }
}

export async function bulkInviteHandler(req, res) {
  const parsed = bulkInviteFacultySchema.safeParse(req.body);
  if (!parsed.success) return validationError(res, parsed);
  try {
    const result = await inviteService.inviteBulkByActor(
      req.user.id,
      parsed.data.invites,
      { allowDomainMismatch: parsed.data.allowDomainMismatch },
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'BULK_INVITE_FAILED', message: error.message },
    });
  }
}

export async function offboardHandler(req, res) {
  const parsed = offboardFacultySchema.safeParse(req.body || {});
  if (!parsed.success) return validationError(res, parsed);
  try {
    const result = await inviteService.offboardFacultyByActor(
      req.user.id,
      req.params.id,
      { purge: parsed.data.purge },
    );
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'OFFBOARD_FAILED', message: error.message },
    });
  }
}

export async function listFacultyHandler(req, res) {
  const parsed = listFacultyQuerySchema.safeParse(req.query);
  if (!parsed.success) return validationError(res, parsed);
  try {
    const result = await approvalService.listAtInstitution(req.user.id, parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'LIST_FAILED', message: error.message },
    });
  }
}

export async function pendingFacultyHandler(req, res) {
  try {
    const result = await approvalService.pendingAtInstitution(req.user.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'PENDING_FAILED', message: error.message },
    });
  }
}

export async function approveHandler(req, res) {
  try {
    const result = await approvalService.approveFaculty(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'APPROVE_FAILED', message: error.message },
    });
  }
}

export async function rejectHandler(req, res) {
  const parsed = rejectFacultySchema.safeParse(req.body || {});
  if (!parsed.success) return validationError(res, parsed);
  try {
    const result = await approvalService.rejectFaculty(req.user.id, req.params.id, parsed.data);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({
      error: { code: error.code || 'REJECT_FAILED', message: error.message },
    });
  }
}
