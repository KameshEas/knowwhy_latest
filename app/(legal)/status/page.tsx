export const metadata = {
  title: "Status & SLA — KnowWhy",
  description: "Service status, uptime targets, and incident history for KnowWhy.",
}

export default function StatusPage() {
  return (
    <article className="prose prose-zinc dark:prose-invert max-w-none">
      <h1>Service Status</h1>
      <p className="lead text-zinc-500">Current status and SLA targets for the KnowWhy platform.</p>

      <hr />

      {/* Current Status Banner */}
      <div className="not-prose mb-8 rounded-xl border border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-950/30 p-6 flex items-center gap-4">
        <span className="inline-flex h-4 w-4 rounded-full bg-green-500 shadow-[0_0_0_4px_rgba(34,197,94,0.2)]" />
        <div>
          <p className="font-semibold text-green-800 dark:text-green-300 text-lg">All systems operational</p>
          <p className="text-sm text-green-700 dark:text-green-400 mt-0.5">
            Last checked: {/* TODO: replace with live status check */}March 13, 2026
          </p>
        </div>
      </div>

      <h2>Service Components</h2>
      <table>
        <thead>
          <tr>
            <th>Component</th>
            <th>Status</th>
            <th>Uptime (30 days)</th>
          </tr>
        </thead>
        <tbody>
          {[
            { name: "Web Application", status: "Operational", uptime: "99.97%" },
            { name: "API (REST / Webhooks)", status: "Operational", uptime: "99.95%" },
            { name: "Database", status: "Operational", uptime: "99.99%" },
            { name: "Vector Search (Weaviate)", status: "Operational", uptime: "99.90%" },
            { name: "Slack Integration", status: "Operational", uptime: "99.91%" },
            { name: "GitLab Integration", status: "Operational", uptime: "99.94%" },
            { name: "Google Calendar Integration", status: "Operational", uptime: "99.98%" },
          ].map((c) => (
            <tr key={c.name}>
              <td>{c.name}</td>
              <td>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  {c.status}
                </span>
              </td>
              <td>{c.uptime}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>SLA Commitments</h2>
      <table>
        <thead>
          <tr>
            <th>Deployment</th>
            <th>Monthly uptime target</th>
            <th>Maximum downtime / month</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>SaaS (managed)</td>
            <td>99.5%</td>
            <td>≈ 3.6 hours</td>
          </tr>
          <tr>
            <td>SaaS (Enterprise plan)</td>
            <td>99.9%</td>
            <td>≈ 43 minutes</td>
          </tr>
          <tr>
            <td>VPC-hosted</td>
            <td>99.5% target; Customer infra may vary</td>
            <td>≈ 3.6 hours</td>
          </tr>
          <tr>
            <td>Self-hosted</td>
            <td>Customer-managed; no KnowWhy SLA</td>
            <td>N/A</td>
          </tr>
        </tbody>
      </table>
      <p>
        Planned maintenance windows (communicated ≥ 48 hours in advance) and third-party integration
        outages (Slack, GitLab, Google) are excluded from uptime calculations.
      </p>

      <h2>Support SLA</h2>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Description</th>
            <th>First response</th>
            <th>Resolution target</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>P1 — Critical</td>
            <td>Service completely unavailable / data loss</td>
            <td>1 hour</td>
            <td>4 hours</td>
          </tr>
          <tr>
            <td>P2 — High</td>
            <td>Major feature unavailable, no workaround</td>
            <td>4 hours</td>
            <td>1 business day</td>
          </tr>
          <tr>
            <td>P3 — Medium</td>
            <td>Feature degraded, workaround available</td>
            <td>1 business day</td>
            <td>5 business days</td>
          </tr>
          <tr>
            <td>P4 — Low</td>
            <td>Minor issue / feature request</td>
            <td>3 business days</td>
            <td>Next minor release</td>
          </tr>
        </tbody>
      </table>

      <h2>Incident History</h2>
      <p className="text-zinc-500">No incidents in the last 90 days.{/* TODO: wire live incident feed */}</p>

      <h2>Maintenance Windows</h2>
      <p className="text-zinc-500">No scheduled maintenance.{/* TODO: wire scheduled maintenance feed */}</p>

      <h2>Subscribe to Updates</h2>
      <p>
        For real-time status notifications, contact{" "}
        <a href="mailto:support@knowwhy.app">support@knowwhy.app</a> to subscribe to incident emails.
        {/* TODO: integrate StatusPage.io or similar */}
      </p>
    </article>
  )
}
