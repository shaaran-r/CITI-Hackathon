import {
  Activity,
  ArrowUpRight,
  BookOpenCheck,
  ClipboardCheck,
  Compass,
  GraduationCap,
  Users,
} from 'lucide-react';
import { pathwayTypes } from '@kaushalsetu/types';
import ReviewQueue from './review-queue';

async function getApiStatus(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.API_BASE_URL ?? 'http://localhost:3001'}/health`, {
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}

const links = [
  { label: 'Overview', icon: Compass, active: true },
  { label: 'Students', icon: Users },
  { label: 'Pathways', icon: GraduationCap },
  { label: 'Missions', icon: ClipboardCheck, href: '#review-queue' },
  { label: 'Learning', icon: BookOpenCheck },
];

export default async function DashboardPage(): Promise<React.JSX.Element> {
  const apiOnline = await getApiStatus();

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <span className="brand-mark">K</span>
          <span>KaushalSetu</span>
        </div>
        <div className="nav-label">Facilitator workspace</div>
        <nav aria-label="Main navigation">
          {links.map(({ label, icon: Icon, active, href }) => (
            <a
              aria-current={active ? 'page' : undefined}
              className={`nav-link${active ? ' active' : ''}`}
              href={href ?? '#'}
              key={label}
            >
              <Icon aria-hidden="true" size={17} strokeWidth={1.8} />
              {label}
            </a>
          ))}
        </nav>
        <div className="rail-bottom">
          Rural student support
          <br />
          Demo workspace
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>Facilitator view</span>
          <div className="topbar-right">
            <span>Local workspace</span>
            <span className="avatar" aria-label="Demo facilitator">
              F
            </span>
          </div>
        </header>
        <div className="page">
          <div className="page-head">
            <div>
              <div className="eyebrow">FIELD SUPPORT · TODAY</div>
              <h1>Student journeys</h1>
              <p className="intro">
                Review mission evidence from your assigned group. Approved work adds verified skills
                and badges to each student’s wallet.
              </p>
            </div>
            <div className="status">
              <span className={`dot${apiOnline ? ' online' : ''}`} />
              API {apiOnline ? 'connected' : 'not connected'}
            </div>
          </div>
          <div className="sections">
            <section className="panel" aria-labelledby="students-title">
              <div className="panel-head">
                <h2 id="students-title">Mission review queue</h2>
                <span>Assigned group only</span>
              </div>
              <ReviewQueue />
            </section>
            <section className="panel" aria-labelledby="today-title">
              <div className="panel-head">
                <h2 id="today-title">Workspace status</h2>
                <Activity aria-hidden="true" color="#286b50" size={17} />
              </div>
              <div className="list">
                <div className="list-row">
                  <span className="list-icon">
                    <Activity size={15} />
                  </span>
                  <div>
                    <strong>API service</strong>
                    <small>
                      {apiOnline
                        ? 'Healthy · database connected'
                        : 'Start the API to connect services'}
                    </small>
                  </div>
                </div>
                <div className="list-row">
                  <span className="list-icon">
                    <GraduationCap size={15} />
                  </span>
                  <div>
                    <strong>Recommendation tracks</strong>
                    <small>{pathwayTypes.length} student pathways configured</small>
                  </div>
                </div>
                <div className="list-row">
                  <span className="list-icon">
                    <ClipboardCheck size={15} />
                  </span>
                  <div>
                    <strong>Mission review</strong>
                    <small>Review queue available</small>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <div className="note">
            <strong>Demo data note:</strong> pathway and opportunity examples are fictional and are
            not official programs, job listings, or income guarantees.{' '}
            <ArrowUpRight aria-hidden="true" size={14} style={{ verticalAlign: 'middle' }} />
          </div>
        </div>
      </main>
    </div>
  );
}
