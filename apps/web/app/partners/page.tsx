'use client';

import { useState, type FormEvent } from 'react';
import { ArrowLeft, Handshake } from 'lucide-react';
import Link from 'next/link';

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

async function responseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    return Array.isArray(body.message)
      ? body.message.join(', ')
      : (body.message ?? 'Request failed.');
  } catch {
    return 'Could not reach the API. Try again when connected.';
  }
}

export default function PartnerIntakePage(): React.JSX.Element {
  const [partnerType, setPartnerType] = useState<'MENTOR' | 'EMPLOYER' | 'NGO'>('MENTOR');
  const [contactName, setContactName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [message, setMessage] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${apiBase}/partners/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerType,
          contactName,
          organizationName,
          email,
          website,
          state,
          district,
          focusAreas: focusAreas
            .split(',')
            .map((area) => area.trim())
            .filter(Boolean),
          message,
          consentAccepted,
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      setSubmitted(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not submit the application.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="partner-page">
      <div className="partner-shell">
        <Link className="partner-back" href="/">
          <ArrowLeft aria-hidden="true" size={16} /> Facilitator workspace
        </Link>
        <div className="partner-heading">
          <span className="partner-mark">
            <Handshake aria-hidden="true" size={20} />
          </span>
          <div>
            <div className="eyebrow">COMMUNITY PARTNERSHIPS</div>
            <h1>Open a door for learners</h1>
            <p>Mentor, employ, or support a local learning pathway.</p>
          </div>
        </div>
        {submitted ? (
          <section className="partner-confirmation" role="status">
            <h2>Application received</h2>
            <p>
              A facilitator will review your interest. This prototype does not create accounts or
              verify organizations.
            </p>
            <Link className="partner-submit" href="/">
              Return to workspace
            </Link>
          </section>
        ) : (
          <form className="partner-form" onSubmit={(event) => void submit(event)}>
            <label htmlFor="partner-type">I’m joining as</label>
            <select
              id="partner-type"
              value={partnerType}
              onChange={(event) => setPartnerType(event.target.value as typeof partnerType)}
            >
              <option value="MENTOR">Mentor</option>
              <option value="EMPLOYER">Employer</option>
              <option value="NGO">NGO or community organization</option>
            </select>
            <label htmlFor="partner-contact">Contact name</label>
            <input
              id="partner-contact"
              autoComplete="name"
              maxLength={80}
              required
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
            />
            <label htmlFor="partner-organization">Organization</label>
            <input
              id="partner-organization"
              autoComplete="organization"
              maxLength={120}
              value={organizationName}
              onChange={(event) => setOrganizationName(event.target.value)}
            />
            <div className="partner-fields">
              <div>
                <label htmlFor="partner-email">Work email</label>
                <input
                  id="partner-email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="partner-website">Website (optional)</label>
                <input
                  id="partner-website"
                  autoComplete="url"
                  type="url"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                />
              </div>
            </div>
            <div className="partner-fields">
              <div>
                <label htmlFor="partner-state">State</label>
                <input
                  id="partner-state"
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="partner-district">District</label>
                <input
                  id="partner-district"
                  value={district}
                  onChange={(event) => setDistrict(event.target.value)}
                />
              </div>
            </div>
            <label htmlFor="partner-focus">Focus areas (comma-separated)</label>
            <input
              id="partner-focus"
              maxLength={600}
              placeholder="Career guidance, agriculture, electrical skills"
              value={focusAreas}
              onChange={(event) => setFocusAreas(event.target.value)}
            />
            <label htmlFor="partner-message">How would you like to contribute?</label>
            <textarea
              id="partner-message"
              maxLength={1200}
              minLength={10}
              required
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <label className="partner-consent">
              <input
                checked={consentAccepted}
                onChange={(event) => setConsentAccepted(event.target.checked)}
                required
                type="checkbox"
              />
              <span>I agree to be contacted about this partnership application.</span>
            </label>
            {error && (
              <p className="review-error" role="alert">
                {error}
              </p>
            )}
            <button className="partner-submit" disabled={busy || !consentAccepted} type="submit">
              {busy ? 'Submitting…' : 'Submit interest'}
            </button>
            <p className="partner-privacy">
              Do not include student details, Aadhaar numbers, or other sensitive information.
              Contact details are visible to facilitator accounts in this prototype.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
