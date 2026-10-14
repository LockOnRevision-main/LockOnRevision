/**
 * Invitation email delivery (Stage 1). Mechanism: Resend REST API via
 * plain fetch (no SDK dependency; Vercel-compatible, fits 300s/4.5MB
 * Hobby limits trivially). Free tier (verified resend.com/pricing):
 * $0/mo, 3,000 emails/mo, 100/day — invitation volume is a handful per
 * school, so the free tier is ample.
 *
 * Fail-soft: email failures NEVER fail invitation creation — the
 * copy-link fallback (returned to the platform admin, who transmits it
 * manually) is always available. Credentials live only in server env:
 * RESEND_API_KEY, INVITE_FROM_EMAIL. Never logged.
 */
export async function sendInviteEmail({ to, schoolName, acceptUrl }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL;
  if (!apiKey || !from) {
    return { sent: false, reason: "email-not-configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `You are invited as a school administrator — ${schoolName}`,
        text: [
          `You have been invited to administer "${schoolName}" on LockOnRevision.`,
          ``,
          `Accept within 7 days (single use, bound to this email address):`,
          acceptUrl,
          ``,
          `If you do not have an account yet, register with this exact email address first, verify it, then open the link again.`,
          `If you did not expect this invitation, ignore it.`,
        ].join("\n"),
      }),
    });
    if (!res.ok) return { sent: false, reason: "provider-rejected" };
    return { sent: true };
  } catch {
    return { sent: false, reason: "send-failed" };
  }
}

export function invitationAcceptUrl(token) {
  const base = (process.env.PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.PUBLIC_APP_URL || "").replace(/\/$/, "");
  // Fallback path when no public base is configured — admin copies the token.
  if (!base) return null;
  return `${base}/admin?invite=${encodeURIComponent(token)}`;
}
