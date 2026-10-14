'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, CircleAlert, LoaderCircle, LogOut, RefreshCw, RotateCcw, X } from 'lucide-react';

interface ReviewItem {
  id: string;
  assignmentId: string;
  evidenceType: string;
  evidenceNote: string;
  submittedAt: string;
  assignedAt: string;
  dueAt: string | null;
  student: { id: string; displayName: string; gradeLevel: string | null };
  mission: { id: string; title: string; isDemo: boolean };
}

interface AuthResult {
  accessToken: string;
  devCode?: string;
}

interface ReviewResult {
  status: string;
  awardedBadges: { title: string }[];
}

interface ApplicationSupportItem {
  id: string;
  status: string;
  helpRequestNote: string | null;
  facilitatorNote: string | null;
  student: { id: string; displayName: string; gradeLevel: string | null };
  opportunity: { id: string; title: string; type: string; isDemo: boolean };
}

interface LearningModuleItem {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  lessons: string[];
  pricingModel: 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';
  priceInr: number;
  status: 'DRAFT' | 'PUBLISHED';
}

interface PartnerApplicationItem {
  id: string;
  partnerType: 'MENTOR' | 'EMPLOYER' | 'NGO';
  contactName: string;
  organizationName: string | null;
  email: string;
  website: string | null;
  state: string | null;
  district: string | null;
  focusAreas: string[];
  message: string;
  status: string;
  createdAt: string;
}

const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    return Array.isArray(body.message)
      ? body.message.join(', ')
      : (body.message ?? 'Request failed.');
  } catch {
    return 'Request failed. Check that the API is running.';
  }
}

export default function ReviewQueue(): React.JSX.Element {
  const [phone, setPhone] = useState('+919100000001');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [token, setToken] = useState('');
  const [queue, setQueue] = useState<ReviewItem[]>([]);
  const [applicationQueue, setApplicationQueue] = useState<ApplicationSupportItem[]>([]);
  const [learningModules, setLearningModules] = useState<LearningModuleItem[]>([]);
  const [partnerApplications, setPartnerApplications] = useState<PartnerApplicationItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');
  const [moduleBusy, setModuleBusy] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [moduleCategory, setModuleCategory] = useState('Practical skills');
  const [moduleLanguage, setModuleLanguage] = useState('hi');
  const [moduleLessons, setModuleLessons] = useState('');
  const [pricingModel, setPricingModel] = useState<'FREE' | 'ONE_TIME' | 'SUBSCRIPTION'>('FREE');
  const [priceInr, setPriceInr] = useState('0');
  const [moduleError, setModuleError] = useState('');
  const [moduleMessage, setModuleMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadQueue = useCallback(async (authToken: string): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const [reviewResponse, applicationResponse] = await Promise.all([
        fetch(`${apiBase}/facilitator/review-queue`, { headers, cache: 'no-store' }),
        fetch(`${apiBase}/facilitator/applications`, { headers, cache: 'no-store' }),
      ]);
      if (!reviewResponse.ok) throw new Error(await readError(reviewResponse));
      if (!applicationResponse.ok) throw new Error(await readError(applicationResponse));
      setQueue((await reviewResponse.json()) as ReviewItem[]);
      setApplicationQueue((await applicationResponse.json()) as ApplicationSupportItem[]);
      const moduleResponse = await fetch(`${apiBase}/facilitator/modules`, {
        headers,
        cache: 'no-store',
      });
      if (!moduleResponse.ok) throw new Error(await readError(moduleResponse));
      setLearningModules((await moduleResponse.json()) as LearningModuleItem[]);
      const partnerResponse = await fetch(`${apiBase}/facilitator/partner-applications`, {
        headers,
        cache: 'no-store',
      });
      if (!partnerResponse.ok) throw new Error(await readError(partnerResponse));
      setPartnerApplications((await partnerResponse.json()) as PartnerApplicationItem[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load the review queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) void loadQueue(token);
  }, [token, loadQueue]);

  async function requestCode(): Promise<void> {
    setBusyId('login');
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${apiBase}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const result = (await response.json()) as { devCode?: string };
      setCodeSent(true);
      if (result.devCode) setCode(result.devCode);
      setMessage('Demo code sent.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not request a code.');
    } finally {
      setBusyId('');
    }
  }

  async function signIn(): Promise<void> {
    setBusyId('login');
    setError('');
    try {
      const response = await fetch(`${apiBase}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const result = (await response.json()) as AuthResult;
      setToken(result.accessToken);
      setMessage('Signed in.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.');
    } finally {
      setBusyId('');
    }
  }

  async function review(
    item: ReviewItem,
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_RESUBMISSION',
  ): Promise<void> {
    const reviewNote = notes[item.id]?.trim() ?? '';
    if (decision !== 'APPROVE' && !reviewNote) {
      setError('Add a short note before rejecting or requesting a resubmission.');
      return;
    }
    setBusyId(item.id);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${apiBase}/missions/submissions/${item.id}/review`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reviewNote }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const result = (await response.json()) as ReviewResult;
      const badgeText = result.awardedBadges.length
        ? ` Badge earned: ${result.awardedBadges.map((badge) => badge.title).join(', ')}.`
        : '';
      setMessage(`Review saved.${badgeText}`);
      setNotes((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      await loadQueue(token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this review.');
    } finally {
      setBusyId('');
    }
  }

  async function recommendOpportunity(item: ApplicationSupportItem): Promise<void> {
    const note = notes[`recommend-${item.id}`]?.trim() ?? '';
    setBusyId(item.id);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${apiBase}/facilitator/opportunities/recommend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: item.student.id,
          opportunityId: item.opportunity.id,
          note,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setMessage(`Opportunity recommendation saved for ${item.student.displayName}.`);
      await loadQueue(token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not recommend this opportunity.');
    } finally {
      setBusyId('');
    }
  }

  async function updateApplication(
    item: ApplicationSupportItem,
    status: 'IN_PROGRESS' | 'SELECTED' | 'REJECTED',
  ): Promise<void> {
    const facilitatorNote = notes[`application-${item.id}`]?.trim() ?? '';
    setBusyId(item.id);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`${apiBase}/facilitator/applications/${item.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, facilitatorNote }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setMessage(`Application updated for ${item.student.displayName}.`);
      await loadQueue(token);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this application.');
    } finally {
      setBusyId('');
    }
  }

  async function createLearningModule(): Promise<void> {
    const lessons = moduleLessons
      .split('\n')
      .map((lesson) => lesson.trim())
      .filter(Boolean);
    const price = Number(priceInr);
    if (!moduleTitle.trim() || !moduleDescription.trim() || lessons.length === 0) {
      setModuleError('Add a title, a short description, and at least one lesson.');
      return;
    }
    if (!Number.isInteger(price) || price < 0 || (pricingModel !== 'FREE' && price === 0)) {
      setModuleError('Set a valid whole-rupee price for the selected pricing model.');
      return;
    }
    setModuleBusy(true);
    setModuleError('');
    setModuleMessage('');
    try {
      const response = await fetch(`${apiBase}/facilitator/modules`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: moduleTitle,
          description: moduleDescription,
          category: moduleCategory,
          language: moduleLanguage,
          lessons,
          pricingModel,
          priceInr: pricingModel === 'FREE' ? 0 : price,
        }),
      });
      if (!response.ok) throw new Error(await readError(response));
      const created = (await response.json()) as LearningModuleItem;
      setLearningModules((current) => [created, ...current]);
      setModuleTitle('');
      setModuleDescription('');
      setModuleLessons('');
      setModuleMessage('Draft saved. Review it before publishing.');
    } catch (cause) {
      setModuleError(cause instanceof Error ? cause.message : 'Could not save this module.');
    } finally {
      setModuleBusy(false);
    }
  }

  async function publishLearningModule(moduleId: string): Promise<void> {
    setModuleBusy(true);
    setModuleError('');
    setModuleMessage('');
    try {
      const response = await fetch(`${apiBase}/facilitator/modules/${moduleId}/publish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(await readError(response));
      const published = (await response.json()) as LearningModuleItem;
      setLearningModules((current) =>
        current.map((module) => (module.id === published.id ? published : module)),
      );
      setModuleMessage('Module published to the student library.');
    } catch (cause) {
      setModuleError(cause instanceof Error ? cause.message : 'Could not publish this module.');
    } finally {
      setModuleBusy(false);
    }
  }

  async function updatePartnerStatus(
    applicationId: string,
    status: 'REVIEWED' | 'ACCEPTED' | 'DECLINED',
  ): Promise<void> {
    setModuleBusy(true);
    setModuleError('');
    setModuleMessage('');
    try {
      const response = await fetch(
        `${apiBase}/facilitator/partner-applications/${applicationId}/status`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        },
      );
      if (!response.ok) throw new Error(await readError(response));
      setPartnerApplications((current) =>
        current.filter((application) => application.id !== applicationId),
      );
      setModuleMessage(`Partner application marked ${status.toLowerCase()}.`);
    } catch (cause) {
      setModuleError(
        cause instanceof Error ? cause.message : 'Could not update this partner application.',
      );
    } finally {
      setModuleBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="review-login">
        <div className="review-login-mark">
          <CircleAlert aria-hidden="true" size={19} />
        </div>
        <div className="review-login-copy">
          <h3>Facilitator sign-in</h3>
          <p>Use the seeded demo facilitator to review student evidence.</p>
        </div>
        <div className="review-login-fields">
          <label htmlFor="facilitator-phone">Mobile number</label>
          <input
            id="facilitator-phone"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          {codeSent && (
            <>
              <label htmlFor="facilitator-code">One-time code</label>
              <input
                id="facilitator-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </>
          )}
          {error && (
            <p className="review-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="review-message" role="status">
              {message}
            </p>
          )}
          <button
            className="review-primary"
            disabled={busyId === 'login'}
            onClick={() => void (codeSent ? signIn() : requestCode())}
          >
            {busyId === 'login' ? (
              <LoaderCircle aria-hidden="true" className="spin" size={16} />
            ) : null}
            {codeSent ? 'Continue' : 'Get demo code'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="review-queue" id="review-queue">
      <div className="review-toolbar">
        <span className="queue-count">{queue.length} awaiting review</span>
        <div className="review-toolbar-actions">
          <button
            className="review-icon-button"
            aria-label="Refresh review queue"
            title="Refresh queue"
            disabled={loading}
            onClick={() => void loadQueue(token)}
          >
            <RefreshCw aria-hidden="true" className={loading ? 'spin' : ''} size={16} />
          </button>
          <button
            className="review-icon-button"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => {
              setToken('');
              setQueue([]);
              setApplicationQueue([]);
              setLearningModules([]);
              setPartnerApplications([]);
              setMessage('');
            }}
          >
            <LogOut aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
      {error && (
        <p className="review-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="review-message" role="status">
          {message}
        </p>
      )}
      {loading && !queue.length && (
        <div className="review-empty">
          <LoaderCircle aria-hidden="true" className="spin" size={22} />
          <span>Loading submissions…</span>
        </div>
      )}
      {!loading && !queue.length && (
        <div className="review-empty">
          <Check aria-hidden="true" size={22} />
          <span>No submissions need review.</span>
        </div>
      )}
      <div className="review-list">
        {queue.map((item) => (
          <article className="submission" key={item.id}>
            <div className="submission-heading">
              <div>
                <div className="submission-student">
                  {item.student.displayName}
                  <span>
                    {item.student.gradeLevel ? `Class ${item.student.gradeLevel}` : 'Student'}
                  </span>
                </div>
                <h3>
                  {item.mission.title}
                  {item.mission.isDemo && <span className="demo-tag">DEMO</span>}
                </h3>
              </div>
              <span className="submission-state">Pending</span>
            </div>
            <div className="submission-meta">
              <span>Assigned {new Date(item.assignedAt).toLocaleDateString()}</span>
              {item.dueAt && <span>Due {new Date(item.dueAt).toLocaleDateString()}</span>}
              <span>Submitted {new Date(item.submittedAt).toLocaleString()}</span>
              <span>{item.evidenceType.toLowerCase()} · synced</span>
            </div>
            <div className="evidence-text">{item.evidenceNote}</div>
            <label className="review-note-label" htmlFor={`note-${item.id}`}>
              Feedback
            </label>
            <textarea
              id={`note-${item.id}`}
              maxLength={1000}
              placeholder="A helpful note for the student"
              value={notes[item.id] ?? ''}
              onChange={(event) =>
                setNotes((current) => ({ ...current, [item.id]: event.target.value }))
              }
            />
            <div className="review-actions">
              <button
                className="review-approve"
                disabled={busyId === item.id}
                onClick={() => void review(item, 'APPROVE')}
              >
                <Check aria-hidden="true" size={15} />
                Approve
              </button>
              <button
                className="review-resubmit"
                disabled={busyId === item.id}
                onClick={() => void review(item, 'REQUEST_RESUBMISSION')}
              >
                <RotateCcw aria-hidden="true" size={15} />
                Request changes
              </button>
              <button
                className="review-reject"
                disabled={busyId === item.id}
                onClick={() => void review(item, 'REJECT')}
              >
                <X aria-hidden="true" size={15} />
                Reject
              </button>
              {busyId === item.id && (
                <LoaderCircle aria-hidden="true" className="spin action-spinner" size={17} />
              )}
            </div>
          </article>
        ))}
      </div>
      <section className="application-support" aria-labelledby="application-support-title">
        <div className="support-heading">
          <h3 id="application-support-title">Opportunity support</h3>
          <span>{applicationQueue.length} students need follow-up</span>
        </div>
        {!applicationQueue.length && (
          <div className="support-empty">
            Submitted applications and help requests will appear here.
          </div>
        )}
        <div className="support-list">
          {applicationQueue.map((item) => (
            <article className="support-item" key={item.id}>
              <div className="support-person">
                <strong>{item.student.displayName}</strong>
                <span>
                  {item.student.gradeLevel ? `Class ${item.student.gradeLevel}` : 'Student'}
                </span>
                <span className="support-status">{item.status.replaceAll('_', ' ')}</span>
              </div>
              <h4>
                {item.opportunity.title}
                {item.opportunity.isDemo && <span className="demo-tag">DEMO</span>}
              </h4>
              {item.helpRequestNote && (
                <p className="support-help">Student asks: {item.helpRequestNote}</p>
              )}
              <label className="review-note-label" htmlFor={`recommend-${item.id}`}>
                Door-opener note
              </label>
              <textarea
                id={`recommend-${item.id}`}
                maxLength={1000}
                placeholder="Add a helpful introduction or next step"
                value={notes[`recommend-${item.id}`] ?? ''}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [`recommend-${item.id}`]: event.target.value,
                  }))
                }
              />
              <div className="review-actions">
                <button
                  className="review-approve"
                  disabled={busyId === item.id}
                  onClick={() => void recommendOpportunity(item)}
                >
                  Recommend opportunity
                </button>
                {item.status === 'SUBMITTED' && (
                  <>
                    <button
                      className="review-resubmit"
                      disabled={busyId === item.id}
                      onClick={() => void updateApplication(item, 'SELECTED')}
                    >
                      Mark selected
                    </button>
                    <button
                      className="review-reject"
                      disabled={busyId === item.id}
                      onClick={() => void updateApplication(item, 'REJECTED')}
                    >
                      Not selected
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="module-studio" id="learning-studio" aria-labelledby="module-studio-title">
        <div className="support-heading">
          <h3 id="module-studio-title">Learning module studio</h3>
          <span>Create for your assigned learning community</span>
        </div>
        <p className="module-disclaimer">
          Set a free, one-time, or monthly price label. This prototype does not collect payments.
          Confirm course quality, learner safety, and all costs before publishing.
        </p>
        <div className="module-form">
          <label htmlFor="module-title">Module title</label>
          <input
            id="module-title"
            maxLength={100}
            value={moduleTitle}
            onChange={(event) => setModuleTitle(event.target.value)}
          />
          <label htmlFor="module-description">What learners will practice</label>
          <textarea
            id="module-description"
            maxLength={1000}
            value={moduleDescription}
            onChange={(event) => setModuleDescription(event.target.value)}
          />
          <div className="module-form-row">
            <div>
              <label htmlFor="module-category">Skill area</label>
              <input
                id="module-category"
                maxLength={80}
                value={moduleCategory}
                onChange={(event) => setModuleCategory(event.target.value)}
              />
            </div>
            <div>
              <label htmlFor="module-language">Language</label>
              <select
                id="module-language"
                value={moduleLanguage}
                onChange={(event) => setModuleLanguage(event.target.value)}
              >
                <option value="hi">Hindi</option>
                <option value="en">English</option>
                <option value="mr">Marathi</option>
                <option value="bn">Bengali</option>
              </select>
            </div>
          </div>
          <label htmlFor="module-lessons">Lessons, one per line</label>
          <textarea
            id="module-lessons"
            maxLength={6000}
            placeholder="Observe a local example\nPractice one safe task\nReflect with your facilitator"
            value={moduleLessons}
            onChange={(event) => setModuleLessons(event.target.value)}
          />
          <div className="module-form-row">
            <div>
              <label htmlFor="module-pricing">Offer type</label>
              <select
                id="module-pricing"
                value={pricingModel}
                onChange={(event) => {
                  const next = event.target.value as typeof pricingModel;
                  setPricingModel(next);
                  if (next === 'FREE') setPriceInr('0');
                  else if (priceInr === '0') setPriceInr('1');
                }}
              >
                <option value="FREE">Free</option>
                <option value="ONE_TIME">Pay per module</option>
                <option value="SUBSCRIPTION">Monthly subscription</option>
              </select>
            </div>
            <div>
              <label htmlFor="module-price">
                {pricingModel === 'SUBSCRIPTION' ? 'Monthly price (₹)' : 'Price (₹)'}
              </label>
              <input
                id="module-price"
                disabled={pricingModel === 'FREE'}
                inputMode="numeric"
                min="0"
                value={priceInr}
                onChange={(event) => setPriceInr(event.target.value)}
              />
            </div>
          </div>
          {moduleError && (
            <p className="review-error" role="alert">
              {moduleError}
            </p>
          )}
          {moduleMessage && (
            <p className="review-message" role="status">
              {moduleMessage}
            </p>
          )}
          <button
            className="review-primary module-save"
            disabled={moduleBusy}
            onClick={() => void createLearningModule()}
          >
            {moduleBusy ? 'Saving…' : 'Save draft'}
          </button>
        </div>
        <div className="module-list">
          {learningModules.map((module) => (
            <article className="module-item" key={module.id}>
              <div>
                <span className={`module-status ${module.status.toLowerCase()}`}>
                  {module.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                </span>
                <h4>{module.title}</h4>
                <p>{module.description}</p>
                <small>
                  {module.category} · {module.language.toUpperCase()} · {module.lessons.length}{' '}
                  lessons ·{' '}
                  {module.pricingModel === 'FREE'
                    ? 'Free'
                    : module.pricingModel === 'SUBSCRIPTION'
                      ? `₹${module.priceInr}/month`
                      : `₹${module.priceInr} one-time`}
                </small>
              </div>
              {module.status === 'DRAFT' && (
                <button
                  className="review-approve"
                  disabled={moduleBusy}
                  onClick={() => void publishLearningModule(module.id)}
                >
                  Publish
                </button>
              )}
            </article>
          ))}
          {!learningModules.length && (
            <p className="support-empty">Your modules will appear here.</p>
          )}
        </div>
      </section>
      <section className="partner-review" aria-labelledby="partner-review-title">
        <div className="support-heading">
          <h3 id="partner-review-title">Partner applications</h3>
          <span>{partnerApplications.length} awaiting review</span>
        </div>
        {!partnerApplications.length && (
          <p className="support-empty">
            New mentor, employer, and NGO applications will appear here.
          </p>
        )}
        <div className="module-list">
          {partnerApplications.map((application) => (
            <article className="module-item" key={application.id}>
              <div>
                <span className="module-status">{application.partnerType}</span>
                <h4>{application.organizationName || application.contactName}</h4>
                <p>{application.message}</p>
                <small>
                  {application.contactName} · {application.email}
                  {application.district || application.state
                    ? ` · ${[application.district, application.state].filter(Boolean).join(', ')}`
                    : ''}
                </small>
                <small>Focus: {application.focusAreas.join(', ')}</small>
              </div>
              <div className="partner-review-actions">
                <button
                  className="review-approve"
                  disabled={moduleBusy}
                  onClick={() => void updatePartnerStatus(application.id, 'ACCEPTED')}
                >
                  Accept
                </button>
                <button
                  className="review-resubmit"
                  disabled={moduleBusy}
                  onClick={() => void updatePartnerStatus(application.id, 'REVIEWED')}
                >
                  Mark reviewed
                </button>
                <button
                  className="review-reject"
                  disabled={moduleBusy}
                  onClick={() => void updatePartnerStatus(application.id, 'DECLINED')}
                >
                  Decline
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
