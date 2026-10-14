import { useState } from "react";
import { auth } from "../config/firebase.js";
import { apiFetch } from "../utils/apiFetch.js";
import { EmptyState } from "./EmptyState.jsx";
import { PERMISSIONS, PERMISSION_NAMES } from "../utils/schoolPermissions.js";

/**
 * Prompt 45 (Stage 5) + Beta 2.0 Part 1 (Stage 1: invitations):
 * minimum school-workflow interface.
 * Reuses Admin Panel card/field/alert conventions, mobile-first.
 * Visibility is convenience only — every action is enforced server-side
 * (verified-token routes + Firestore rules), proven by tests.
 * Invitations section is platform-admin-only (server-enforced); this page
 * itself is platform-gated, so no separate gate is needed.
 */
async function callRoute(path, body) {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again.");
  const res = await apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export function SchoolAdminPanel({ t }) {
  const [schoolId, setSchoolId] = useState("");
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [freshPin, setFreshPin] = useState(null);
  const [classroomId, setClassroomId] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [searchPrefix, setSearchPrefix] = useState("");
  const [students, setStudents] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [freshInvite, setFreshInvite] = useState(null);
  const [invites, setInvites] = useState(null);
  const [acceptToken, setAcceptToken] = useState("");
  const [permUid, setPermUid] = useState("");
  const [permView, setPermView] = useState(null);
  const [permGrants, setPermGrants] = useState([]);
  const [permDenies, setPermDenies] = useState([]);
  const [permScopes, setPermScopes] = useState("all");

  async function loadOverview(id) {
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const data = await callRoute("/api/school-overview", { schoolId: id });
      setOverview(data);
    } catch (e) {
      setOverview(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function createPin() {
    setError("");
    setNotice("");
    setFreshPin(null);
    try {
      const data = await callRoute("/api/create-pin", {
        schoolId, classroomId: classroomId.trim() || null,
      });
      // Plaintext shown ONCE — staff must share it out-of-band now.
      setFreshPin(data);
      setNotice("PIN created. Share it now — it cannot be shown again.");
      await loadOverview(schoolId);
    } catch (e) {
      setError(e.message);
    }
  }

  async function revokePin(pinId) {
    setError("");
    setNotice("");
    try {
      await callRoute("/api/revoke-pin", { schoolId, pinId });
      setNotice("PIN revoked.");
      await loadOverview(schoolId);
    } catch (e) {
      setError(e.message);
    }
  }

  async function review(requestId, decision) {
    setError("");
    setNotice("");
    try {
      await callRoute("/api/review-request", { requestId, decision });
      setNotice(`Request ${decision}.`);
      await loadOverview(schoolId);
    } catch (e) {
      setError(e.message);
    }
  }

  async function setPolicy(joinPolicy) {
    setError("");
    setNotice("");
    try {
      await callRoute("/api/set-join-policy", { schoolId, joinPolicy });
      setNotice(`Joining policy: ${joinPolicy}.`);
      await loadOverview(schoolId);
    } catch (e) {
      setError(e.message);
    }
  }

  async function search() {
    setError("");
    setNotice("");
    try {
      const data = await callRoute("/api/search-students", {
        schoolId, prefix: searchPrefix, page: 1, pageSize: 20,
      });
      setStudents(data);
    } catch (e) {
      setStudents(null);
      setError(e.message);
    }
  }

  async function removeStudent(uid) {
    setError("");
    setNotice("");
    try {
      await callRoute("/api/manage-membership", { action: "remove-school", uid, schoolId });
      setNotice("Membership removed. Profile and learning history kept.");
      await search();
    } catch (e) {
      setError(e.message);
    }
  }

  async function createInvite() {
    setError("");
    setNotice("");
    setFreshInvite(null);
    try {
      const data = await callRoute("/api/create-invitation", { schoolId, email: inviteEmail.trim() });
      // Token shown ONCE — transmit now or rely on the emailed link.
      setFreshInvite(data);
      setNotice(data.emailed ? "Invitation emailed." : "Email not configured — copy the link below and send it manually.");
      await listInvites();
    } catch (e) {
      setError(e.message);
    }
  }

  async function listInvites() {
    setError("");
    try {
      const data = await callRoute("/api/list-invitations", { schoolId });
      setInvites(data.items);
    } catch (e) {
      setInvites(null);
      setError(e.message);
    }
  }

  async function resendInvite(invitationId) {
    setError("");
    setNotice("");
    setFreshInvite(null);
    try {
      const data = await callRoute("/api/resend-invitation", { invitationId });
      setFreshInvite(data);
      setNotice("New token issued. The previous token no longer works.");
      await listInvites();
    } catch (e) {
      setError(e.message);
    }
  }

  async function revokeInvite(invitationId) {
    setError("");
    setNotice("");
    try {
      await callRoute("/api/revoke-invitation", { invitationId });
      setNotice("Invitation revoked.");
      await listInvites();
    } catch (e) {
      setError(e.message);
    }
  }

  async function acceptInvite() {
    setError("");
    setNotice("");
    try {
      const r = await callRoute("/api/accept-invitation", { token: acceptToken.trim() });
      setNotice(r.already ? "Invitation already applied." : `Joined ${r.schoolId} as school administrator.`);
      setAcceptToken("");
    } catch (e) {
      setError(e.message);
    }
  }

  async function loadPerms() {
    setError("");
    setNotice("");
    try {
      const data = await callRoute("/api/get-permissions", { uid: permUid.trim(), schoolId });
      setPermView(data);
      setPermGrants(data.overrides.grants || []);
      setPermDenies(data.overrides.denies || []);
      setPermScopes(Array.isArray(data.scopes) ? data.scopes.join(",") : "all");
    } catch (e) {
      setPermView(null);
      setError(e.message);
    }
  }

  function toggle(list, setList, name) {
    setList(list.includes(name) ? list.filter((x) => x !== name) : [...list, name]);
  }

  async function savePerms() {
    setError("");
    setNotice("");
    try {
      const scopes = permScopes.trim() === "" || permScopes.trim().toLowerCase() === "all"
        ? "all"
        : permScopes.split(",").map((s) => s.trim()).filter(Boolean);
      const data = await callRoute("/api/set-permissions", {
        uid: permUid.trim(), schoolId, grants: permGrants, denies: permDenies, accessScopes: scopes,
      });
      setNotice(`Saved. Effective: ${data.effective.length} permissions. Change is audited and immediate.`);
      await loadPerms();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section className="grid gap-4">
      <article className="card card-pad">
        <p className="eyebrow">{t("admin.schools_tab", "Schools")}</p>
        <h2 className="mt-0.5">School workflows</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={schoolId}
            onChange={(e) => setSchoolId(e.target.value)}
            placeholder="school-id (e.g. academy)"
            aria-label="School ID"
            className="field min-w-0 flex-1"
          />
          <button type="button" disabled={loading || !schoolId.trim()} onClick={() => loadOverview(schoolId.trim())} className="btn-secondary shrink-0">
            {loading ? t("common.loading", "Loading…") : "Load school"}
          </button>
        </div>
        {error ? <p className="alert alert-error mt-3" role="alert">{error}</p> : null}
        {notice ? <p className="rounded-lg border border-info/20 bg-info/10 p-3 text-sm font-bold text-info mt-3" role="status">{notice}</p> : null}
      </article>

      {overview ? (
        <>
          <article className="card card-pad">
            <h3>{overview.school.name} — {overview.counts.students} students, {overview.counts.staff} staff</h3>
            <p className="text-sm text-text-secondary">Joining policy: <strong>{overview.school.joinPolicy}</strong></p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="btn-secondary" onClick={() => setPolicy("APPROVAL_REQUIRED")}>Require approval</button>
              <button type="button" className="btn-secondary" onClick={() => setPolicy("IMMEDIATE")}>Immediate join</button>
            </div>
          </article>

          <article className="card card-pad">
            <h3>Joining PINs</h3>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input value={classroomId} onChange={(e) => setClassroomId(e.target.value)} placeholder="classroom-id (optional)" aria-label="Classroom ID" className="field min-w-0 flex-1" />
              <button type="button" className="btn-secondary shrink-0" onClick={createPin}>Generate PIN</button>
            </div>
            {freshPin ? (
              <p className="mt-2 rounded-lg border border-warning/20 bg-warning/10 p-3 font-mono text-lg font-black" role="status">
                {freshPin.pin} <span className="font-sans text-xs font-bold">(expires {freshPin.expiresAt || "—"})</span>
              </p>
            ) : null}
            <div className="mt-3">
              {overview.pins.length ? overview.pins.map((p) => (
                <div key={p.pinId} className="flex items-center justify-between gap-2 border-b border-border/50 py-2 text-sm last:border-b-0">
                  <span className="font-mono text-xs">{p.pinId.slice(0, 14)}… · {p.classroomId || "school"} · uses {p.useCount}</span>
                  <button type="button" className="btn-secondary" onClick={() => revokePin(p.pinId)}>Revoke</button>
                </div>
              )) : <EmptyState title="No active PINs" copy="Generate one above." />}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={redeemCode} onChange={(e) => setRedeemCode(e.target.value.toUpperCase())} placeholder="Redeem a PIN (student test)" aria-label="Redeem PIN" className="field min-w-0 flex-1 font-mono" maxLength={8} />
              <button type="button" className="btn-secondary shrink-0" onClick={async () => {
                setError(""); setNotice("");
                try {
                  const r = await callRoute("/api/redeem-pin", { code: redeemCode.trim() });
                  setNotice(r.joined ? "Joined." : r.pending ? "Request pending approval." : "Done.");
                } catch (e) { setError(e.message); }
              }}>Redeem</button>
            </div>
          </article>

          <article className="card card-pad">
            <h3>Pending requests ({overview.pendingRequests.length})</h3>
            <div className="mt-2">
              {overview.pendingRequests.length ? overview.pendingRequests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2 text-sm last:border-b-0">
                  <span className="font-mono text-xs">{r.uid.slice(0, 8)}… · {r.classroomId || "school"}</span>
                  <span className="flex gap-2">
                    <button type="button" className="btn-secondary" onClick={() => review(r.id, "approved")}>Approve</button>
                    <button type="button" className="btn-secondary" onClick={() => review(r.id, "rejected")}>Reject</button>
                  </span>
                </div>
              )) : <EmptyState title="No pending requests" copy="New requests appear here." />}
            </div>
          </article>

          <article className="card card-pad">
            <h3>School administrator invitations (platform only)</h3>
            <p className="text-sm text-text-secondary">Single-use, 7-day, bound to the invited email. Manual provisioning remains available as fallback.</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="invitee work email" aria-label="Invitee email" type="email" className="field min-w-0 flex-1" />
              <button type="button" className="btn-secondary shrink-0" onClick={createInvite}>Invite admin</button>
              <button type="button" className="btn-secondary shrink-0" onClick={listInvites}>Refresh list</button>
            </div>
            {freshInvite ? (
              <p className="mt-2 break-all rounded-lg border border-warning/20 bg-warning/10 p-3 font-mono text-sm font-bold" role="status">
                {freshInvite.acceptUrl || freshInvite.token}
                <span className="block font-sans text-xs font-bold">One-time — copy now. It cannot be shown again.</span>
              </p>
            ) : null}
            <div className="mt-3">
              {!invites ? <EmptyState title="Not listed yet" copy="Refresh to see this school's invitations." /> :
                invites.length ? invites.map((v) => (
                  <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2 text-sm last:border-b-0">
                    <span className="font-mono text-xs">{v.email} · {v.status}</span>
                    <span className="flex gap-2">
                      {v.status === "pending" ? (
                        <>
                          <button type="button" className="btn-secondary" onClick={() => resendInvite(v.id)}>Resend</button>
                          <button type="button" className="btn-secondary" onClick={() => revokeInvite(v.id)}>Revoke</button>
                        </>
                      ) : null}
                    </span>
                  </div>
                )) : <EmptyState title="No invitations" copy="Invite above to begin." />}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={acceptToken} onChange={(e) => setAcceptToken(e.target.value.trim())} placeholder="Paste invitation token to accept" aria-label="Invitation token" className="field min-w-0 flex-1 font-mono" />
              <button type="button" className="btn-secondary shrink-0" onClick={acceptInvite}>Accept</button>
            </div>
          </article>

          <article className="card card-pad">
            <h3>{t("admin.perms_title", "Staff permissions")}</h3>
            <p className="text-sm text-text-secondary">{t("admin.perms_desc", "Configurable overrides on top of role defaults. Changes are audited and take effect immediately.")}</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input value={permUid} onChange={(e) => setPermUid(e.target.value)} placeholder="staff uid" aria-label="Staff UID" className="field min-w-0 flex-1 font-mono" />
              <button type="button" className="btn-secondary shrink-0" onClick={loadPerms}>Load</button>
            </div>
            {permView ? (
              <div className="mt-3 text-sm">
                <p><strong>Role:</strong> {permView.role} · <strong>Effective:</strong> {permView.effective.length}</p>
                <p className="text-text-secondary">Defaults: {permView.defaults.join(", ") || "—"}</p>
                <div className="mt-2 grid gap-1">
                  {PERMISSION_NAMES.filter((p) => p !== "*").map((p) => (
                    <div key={p} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border/50 py-1.5 last:border-b-0">
                      <span className="min-w-0 flex-1">
                        <span className="font-mono text-xs font-bold">{p}</span>
                        <span className="block text-xs text-text-secondary">{PERMISSIONS[p]?.description}</span>
                      </span>
                      <span className={`text-xs font-black ${permView.effective.includes(p) ? "text-success" : "text-text-secondary"}`}>
                        {permView.effective.includes(p) ? "ON" : "off"}
                      </span>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={permGrants.includes(p)} onChange={() => toggle(permGrants, setPermGrants, p)} aria-label={`Grant ${p}`} /> grant
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={permDenies.includes(p)} onChange={() => toggle(permDenies, setPermDenies, p)} aria-label={`Deny ${p}`} /> deny
                      </label>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input value={permScopes} onChange={(e) => setPermScopes(e.target.value)} placeholder="all or classroom ids, comma-separated" aria-label="Access scopes" className="field min-w-0 flex-1" />
                  <button type="button" className="btn-secondary shrink-0" onClick={savePerms}>Save</button>
                </div>
              </div>
            ) : null}
          </article>

          <article className="card card-pad">
            <h3>Students</h3>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input value={searchPrefix} onChange={(e) => setSearchPrefix(e.target.value)} placeholder="Name prefix" aria-label="Name prefix" className="field min-w-0 flex-1" />
              <button type="button" className="btn-secondary shrink-0" onClick={search}>Search</button>
            </div>
            <div className="mt-3">
              {!students ? <EmptyState title="Not searched yet" copy="Search lists only this school's students." /> :
                students.items.length ? students.items.map((s) => (
                  <div key={s.uid} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2 text-sm last:border-b-0">
                    <span><strong>{s.name || "Unnamed"}</strong> <span className="text-text-secondary">· {s.classroomId || "no class"}</span></span>
                    <button type="button" className="btn-secondary" onClick={() => removeStudent(s.uid)}>Remove</button>
                  </div>
                )) : <EmptyState title="No students" copy="No matches in this school." />}
            </div>
          </article>
        </>
      ) : null}
    </section>
  );
}
