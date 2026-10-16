import { Link } from "react-router-dom";
import { Footer } from "../components/Footer.jsx";

function DraftBanner() {
  return (
    <p role="note" className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm font-bold text-warning">
      Draft – owner review required. This text is a placeholder and is not a final policy.
    </p>
  );
}

function LegalShell({ title, children }) {
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/" className="text-sm font-bold text-primary hover:underline">
          &larr; Home
        </Link>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-text-primary">{title}</h1>
        <div className="mt-4">
          <DraftBanner />
        </div>
        <div className="mt-6 grid gap-4 text-sm leading-relaxed text-text-secondary">{children}</div>
      </main>
      <Footer />
    </>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy">
      <p>
        LockOnRevision helps students revise by storing study activity such as accounts, lesson
        progress, scores, timetables, and uploaded study files. The owner must confirm the exact
        list of data collected before this page is finalised.
      </p>
      <p>
        Data is stored with our hosting and database providers. The owner must confirm where data
        is stored and who can see it (students, school staff, administrators) before this page is
        finalised.
      </p>
      <p>
        The owner must confirm how long data is kept and how deletion requests are handled before
        this page is finalised.
      </p>
      <p>Contact: [owner-contact-to-be-confirmed].</p>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of Use">
      <p>
        LockOnRevision is a study tool. Accounts must be used fairly: do not share accounts, do not
        attempt to access other users&apos; data, and do not misuse AI features. The owner must
        confirm the acceptable-use rules before this page is finalised.
      </p>
      <p>
        AI-generated content can make mistakes. Students should check AI output against their own
        study materials. The owner must confirm the exact wording of this disclaimer before this
        page is finalised.
      </p>
      <p>
        The owner must confirm account suspension rules, liability limits, and change procedures
        before this page is finalised.
      </p>
      <p>Contact: [owner-contact-to-be-confirmed].</p>
    </LegalShell>
  );
}

export function ContactPage() {
  return (
    <LegalShell title="Contact and Support">
      <p>
        For help with accounts, studying, or data requests, contact the LockOnRevision team. The
        owner must confirm the support contact and expected response time before this page is
        finalised.
      </p>
      <p>Contact: [owner-contact-to-be-confirmed].</p>
    </LegalShell>
  );
}
