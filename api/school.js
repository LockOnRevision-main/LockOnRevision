/**
 * Beta 2.0 Part 2 — Stage 0.5: school-domain dispatcher.
 * Hobby plan allows 12 Vercel Functions per deployment; 31 single-file
 * routes exceeded it. This ONE function delegates to the handler modules
 * under server/handlers/ (imported, never copied), so authentication,
 * permission, rate-limit and audit behaviour is preserved by construction.
 * Legacy paths (/api/create-pin, …) keep working via vercel.json rewrites
 * that map each path to /api/school?action=<name>.
 */
import createPin from "../server/handlers/create-pin.js";
import revokePin from "../server/handlers/revoke-pin.js";
import redeemPin from "../server/handlers/redeem-pin.js";
import setJoinPolicy from "../server/handlers/set-join-policy.js";
import reviewRequest from "../server/handlers/review-request.js";
import provisionSchool from "../server/handlers/provision-school.js";
import revokeSchoolAdmin from "../server/handlers/revoke-school-admin.js";
import searchStudents from "../server/handlers/search-students.js";
import studentProfile from "../server/handlers/student-profile.js";
import manageMembership from "../server/handlers/manage-membership.js";
import schoolOverview from "../server/handlers/school-overview.js";
import enrollAcademy from "../server/handlers/enroll-academy.js";
import setPermissions from "../server/handlers/set-permissions.js";
import getPermissions from "../server/handlers/get-permissions.js";
import createInvitation from "../server/handlers/create-invitation.js";
import resendInvitation from "../server/handlers/resend-invitation.js";
import revokeInvitation from "../server/handlers/revoke-invitation.js";
import acceptInvitation from "../server/handlers/accept-invitation.js";
import listInvitations from "../server/handlers/list-invitations.js";

export const ACTIONS = {
  "create-pin": createPin,
  "revoke-pin": revokePin,
  "redeem-pin": redeemPin,
  "set-join-policy": setJoinPolicy,
  "review-request": reviewRequest,
  "provision-school": provisionSchool,
  "revoke-school-admin": revokeSchoolAdmin,
  "search-students": searchStudents,
  "student-profile": studentProfile,
  "manage-membership": manageMembership,
  "school-overview": schoolOverview,
  "enroll-academy": enrollAcademy,
  "set-permissions": setPermissions,
  "get-permissions": getPermissions,
  "create-invitation": createInvitation,
  "resend-invitation": resendInvitation,
  "revoke-invitation": revokeInvitation,
  "accept-invitation": acceptInvitation,
  "list-invitations": listInvitations,
};

export default async function handler(req, res) {
  const action = req.query?.action || req.body?.action;
  const fn = typeof action === "string" ? ACTIONS[action] : null;
  if (!fn) return res.status(404).json({ error: "Unknown action." });
  return fn(req, res);
}
