export const metadata = {
  title: "Security & Architecture — KnowWhy",
  description: "Architecture whitepaper and security controls for KnowWhy.",
}

export default function SecurityPage() {
  return (
    <article className="prose prose-zinc dark:prose-invert max-w-none">
      <h1>Security & Architecture Whitepaper</h1>
      <p className="lead text-zinc-500">Last updated: March 13, 2026</p>

      <p>
        This document describes the security architecture, controls, and practices in KnowWhy.
        It is intended to support enterprise security questionnaires, procurement reviews, and
        internal risk assessments.
      </p>

      <hr />

      <h2>1. Architecture Overview</h2>
      <p>KnowWhy is a Next.js 15 application with the following key layers:</p>
      <ul>
        <li>
          <strong>Frontend:</strong> React Server/Client Components served from Vercel Edge Network
          (or any Node.js host in self-hosted mode). All routes behind authenticated sessions except
          <code>/login</code>, <code>/api/webhooks/*</code>, and the <code>/(legal)/*</code> pages.
        </li>
        <li>
          <strong>API:</strong> Next.js Route Handlers enforcing session validation at the middleware
          layer before any business logic executes.
        </li>
        <li>
          <strong>Database:</strong> PostgreSQL via Prisma ORM. Parameterised queries throughout — no
          raw SQL string concatenation.
        </li>
        <li>
          <strong>Vector store:</strong> Weaviate for semantic search over decision embeddings.
          Embeddings are generated locally (via Ollama) or by the Customer&apos;s chosen embedding
          provider — no text is sent to third parties unless explicitly configured.
        </li>
        <li>
          <strong>LLM inference:</strong> Groq API (default) or self-hosted Ollama. Customers can
          switch inference to a fully air-gapped local model via environment variable configuration.
        </li>
      </ul>

      <h2>2. Deployment Models</h2>
      <table>
        <thead>
          <tr><th>Model</th><th>Who controls infra</th><th>Data leaves customer network?</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>SaaS (managed)</td>
            <td>KnowWhy</td>
            <td>No — data stays in Customer-selected region</td>
          </tr>
          <tr>
            <td>VPC-hosted</td>
            <td>KnowWhy deploys into Customer VPC</td>
            <td>No — Customer controls the VPC boundary</td>
          </tr>
          <tr>
            <td>Self-hosted</td>
            <td>Customer</td>
            <td>No — KnowWhy has zero access</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Authentication & Access Control</h2>
      <ul>
        <li>
          <strong>Sign-in:</strong> Google OAuth 2.0 (OIDC) via NextAuth v5. No passwords stored.
        </li>
        <li>
          <strong>Sessions:</strong> JWT-based short-lived sessions validated on every request by
          edge middleware.
        </li>
        <li>
          <strong>RBAC:</strong> Two roles — <code>USER</code> (default) and <code>ADMIN</code>.
          Admin routes require elevated role check; admin panel exposes cross-user audit logs.
        </li>
        <li>
          <strong>OAuth scopes minimisation:</strong> Only <code>openid email profile</code> at
          sign-in; Calendar scopes requested on-demand when the feature is first used.
        </li>
        <li>
          <strong>SSO / SAML:</strong> Available via the OIDC layer in NextAuth.{" "}
          {/* TODO: legal review — add SAML/enterprise SSO provider support timeline */}
          Enterprise SAML support roadmap: Q3 2026.
        </li>
      </ul>

      <h2>4. Encryption</h2>
      <table>
        <thead>
          <tr><th>Layer</th><th>Standard</th><th>Key management</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Tokens at rest</td>
            <td>AES-256-GCM, 12-byte random IV, 16-byte auth tag</td>
            <td><code>ENCRYPTION_KEY</code> env var (64-char hex); customer manages in self-hosted</td>
          </tr>
          <tr>
            <td>Database at rest</td>
            <td>PostgreSQL transparent disk encryption</td>
            <td>Provider-managed (Neon / AWS RDS) or customer-managed in self-hosted</td>
          </tr>
          <tr>
            <td>In transit</td>
            <td>TLS 1.2+ (TLS 1.3 preferred); HSTS enforced</td>
            <td>Certificate management by Vercel or customer CDN</td>
          </tr>
        </tbody>
      </table>
      <p>
        Encryption is implemented in <code>lib/crypto.ts</code> using Node.js native crypto —
        no third-party cryptography libraries.
      </p>

      <h2>5. Secret & Token Management</h2>
      <ul>
        <li>All OAuth tokens (Slack, GitLab, Google) are encrypted before writing to the database.</li>
        <li>The encryption key is never logged or stored in code — loaded exclusively from environment variables.</li>
        <li>Token rotation: users can disconnect and reconnect integrations at any time from Settings.</li>
        <li>GitLab tokens are scoped to the minimum necessary API access at connect time.</li>
        <li>Slack tokens use the <code>chat:write</code>, <code>channels:read</code>, <code>users:read</code> scopes only.</li>
      </ul>

      <h2>6. Webhook Security</h2>
      <ul>
        <li>All inbound webhooks (Slack, GitLab) are signature-verified before processing.</li>
        <li>Idempotency: duplicate events are detected and ignored via a <code>WebhookEvent</code> deduplication table keyed on <code>(source, eventId)</code>.</li>
        <li>Rate limiting is applied to all webhook and API endpoints.</li>
        <li>Webhook payloads are PII-stripped before logging: display names are dropped; only opaque IDs are retained.</li>
        <li>Failed signature verifications are recorded in the audit log as <code>WEBHOOK_SIGNATURE_FAILED</code>.</li>
      </ul>

      <h2>7. Audit Logging</h2>
      <p>
        KnowWhy maintains an append-only <code>AuditLog</code> table. The application never exposes
        an update or delete endpoint for this table. Events logged include:
      </p>
      <ul>
        <li>LOGIN / LOGOUT</li>
        <li>INTEGRATION_CONNECTED / INTEGRATION_DISCONNECTED</li>
        <li>DECISION_DELETED / DECISION_EXPORTED</li>
        <li>SETTINGS_CHANGED</li>
        <li>TOKEN_ROTATED</li>
        <li>WEBHOOK_SIGNATURE_FAILED</li>
        <li>RATE_LIMIT_HIT</li>
        <li>ACCOUNT_DELETED</li>
      </ul>
      <p>
        Users can review their own audit log from Settings → Security → Audit Log.
        Admins can view all users&apos; logs from the Admin panel.
        Logs are retained for 12 months.
      </p>

      <h2>8. Data Minimisation & Privacy by Design</h2>
      <ul>
        <li>Integrations (Slack, GitLab, Calendar) are opt-in per user.</li>
        <li>Outbound LLM calls can be replaced by a local Ollama model, sending zero data externally.</li>
        <li>The Service stores only the data needed to deliver the requested features.</li>
        <li>Users can delete individual decisions, export all data, or delete their entire account from the Settings page.</li>
      </ul>

      <h2>9. Vulnerability Management</h2>
      <ul>
        <li>Dependencies: <code>npm audit</code> runs in CI on every PR; high/critical issues block merge.</li>
        <li>Dependency updates: automated via Dependabot (weekly patch / monthly minor).</li>
        <li>Penetration testing: {/* TODO: legal review */}annual third-party pen-test; most recent report available under NDA to enterprise customers.</li>
        <li>Responsible disclosure: <a href="mailto:security@knowwhy.app">security@knowwhy.app</a> — we aim to acknowledge within 48 hours and remediate critical issues within 7 days.</li>
      </ul>

      <h2>10. Compliance Roadmap</h2>
      <table>
        <thead>
          <tr><th>Standard / Regulation</th><th>Status</th><th>Target date</th></tr>
        </thead>
        <tbody>
          <tr><td>GDPR (EU)</td><td>Controls implemented (this DPA + Privacy Policy)</td><td>Current</td></tr>
          <tr><td>SOC 2 Type I</td><td>In preparation</td><td>{/* TODO */}Q4 2026</td></tr>
          <tr><td>SOC 2 Type II</td><td>Planned</td><td>{/* TODO */}Q2 2027</td></tr>
          <tr><td>ISO 27001</td><td>Planned</td><td>{/* TODO */}2027</td></tr>
          <tr><td>UK GDPR / DPA 2018</td><td>Controls implemented (same as EU GDPR)</td><td>Current</td></tr>
          <tr><td>CCPA</td><td>Controls implemented via privacy rights tooling</td><td>Current</td></tr>
        </tbody>
      </table>

      <h2>11. Incident Response</h2>
      <p>
        In the event of a confirmed personal data breach, KnowWhy will notify affected Customers
        within 72 hours (GDPR Art. 33) including: nature of the breach, categories of data affected,
        likely consequences, and remediation steps taken. Post-incident reports are provided within
        14 days.
      </p>

      <h2>12. Security Contact</h2>
      <p>
        Report vulnerabilities or security incidents to:{" "}
        <a href="mailto:security@knowwhy.app">security@knowwhy.app</a>.
      </p>
    </article>
  )
}
