export const metadata = {
  title: "Privacy Policy — KnowWhy",
  description: "How KnowWhy collects, processes, and protects your data.",
}

export default function PrivacyPage() {
  return (
    <article className="prose prose-zinc dark:prose-invert max-w-none">
      <h1>Privacy Policy</h1>
      <p className="lead text-zinc-500">Last updated: March 13, 2026</p>

      <p>
        KnowWhy (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is committed to protecting your personal data and
        respecting your privacy. This Privacy Policy explains how we collect, use, store, and share
        information when you use the KnowWhy decision-memory platform (&ldquo;Service&rdquo;).
      </p>

      <hr />

      <h2>1. Who We Are</h2>
      <p>
        KnowWhy is the data controller for personal data collected through the Service.{" "}
        {/* TODO: legal review — replace with registered company name, address, DPO contact */}
        For data protection inquiries, contact:{" "}
        <a href="mailto:privacy@knowwhy.app">privacy@knowwhy.app</a>.
      </p>

      <h2>2. Data We Collect</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Examples</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Account data</td>
            <td>Name, email address, profile photo URL</td>
            <td>Google OAuth sign-in</td>
          </tr>
          <tr>
            <td>Integration tokens</td>
            <td>Slack workspace token, GitLab personal access token</td>
            <td>OAuth / manual entry</td>
          </tr>
          <tr>
            <td>Decisions</td>
            <td>Decision title, context, rationale, source channel, confidence score</td>
            <td>Webhooks, manual input, API</td>
          </tr>
          <tr>
            <td>Meeting data</td>
            <td>Meeting title, transcript, attendees, start/end times</td>
            <td>Google Calendar sync</td>
          </tr>
          <tr>
            <td>Usage logs</td>
            <td>Actions performed, timestamps, IP addresses</td>
            <td>Application activity</td>
          </tr>
          <tr>
            <td>Webhook payloads</td>
            <td>Event type, source ID (PII stripped — display names excluded)</td>
            <td>Incoming webhooks</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Legal Basis for Processing (GDPR)</h2>
      <p>We process your personal data under the following legal bases (GDPR Art. 6):</p>
      <ul>
        <li>
          <strong>Contract performance (Art. 6(1)(b)):</strong> To provide the Service you signed up for.
        </li>
        <li>
          <strong>Legitimate interests (Art. 6(1)(f)):</strong> Security monitoring, fraud prevention,
          service improvement, and feature analytics — balanced against your rights.
        </li>
        <li>
          <strong>Legal obligation (Art. 6(1)(c)):</strong> Retaining records required by applicable law.
        </li>
        <li>
          <strong>Consent (Art. 6(1)(a)):</strong> Where you have explicitly opted in (e.g., additional
          calendar scopes).
        </li>
      </ul>

      <h2>4. How We Use Your Data</h2>
      <ul>
        <li>Authenticate you and manage your account.</li>
        <li>Store and retrieve decisions and meetings in your workspace.</li>
        <li>Generate vector embeddings for semantic search (processed locally via Weaviate).</li>
        <li>Sync data from Slack and GitLab webhooks on your behalf.</li>
        <li>Produce AI-generated summaries using your connected LLM provider (Groq or local Ollama).</li>
        <li>Send in-app and Slack notifications about new decisions.</li>
        <li>Maintain immutable audit logs for security and compliance.</li>
      </ul>

      <h2>5. Third-Party Sub-Processors</h2>
      <p>We engage the following sub-processors. A full list is available in our{" "}
        <a href="/dpa">Data Processing Agreement</a>.</p>
      <table>
        <thead>
          <tr>
            <th>Sub-processor</th>
            <th>Purpose</th>
            <th>Data residency</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vercel / cloud host</td>
            <td>Application hosting, edge runtime</td>
            <td>EU / US (configurable)</td>
          </tr>
          <tr>
            <td>PostgreSQL (Neon / self-hosted)</td>
            <td>Relational data store</td>
            <td>Customer-selected region</td>
          </tr>
          <tr>
            <td>Weaviate</td>
            <td>Vector database for semantic search</td>
            <td>Customer-selected region or self-hosted</td>
          </tr>
          <tr>
            <td>Groq (optional)</td>
            <td>LLM inference for decision extraction</td>
            <td>US data centers</td>
          </tr>
          <tr>
            <td>Slack (optional)</td>
            <td>Integration / notifications</td>
            <td>Per Slack&apos;s DPA</td>
          </tr>
          <tr>
            <td>GitLab (optional)</td>
            <td>Webhook events, MR analysis</td>
            <td>Per GitLab&apos;s DPA</td>
          </tr>
        </tbody>
      </table>
      <p>
        When deploying self-hosted, Groq calls can be replaced by Ollama running on your own
        infrastructure, eliminating third-party LLM data transfers entirely.
      </p>

      <h2>6. Data Retention</h2>
      <ul>
        <li>
          <strong>Account data:</strong> Retained while your account is active. Deleted within 30 days of
          account deletion request.
        </li>
        <li>
          <strong>Decisions and meetings:</strong> Retained indefinitely until you delete them or your
          account. Weaviate vector embeddings are deleted synchronously.
        </li>
        <li>
          <strong>Audit logs:</strong> Retained for 12 months, then purged automatically.
          {/* TODO: legal review — adjust retention period per jurisdiction */}
        </li>
        <li>
          <strong>Webhook logs:</strong> Retained for 90 days.
        </li>
        <li>
          <strong>Integration tokens:</strong> Deleted immediately upon disconnection.
        </li>
      </ul>

      <h2>7. Your Rights (GDPR)</h2>
      <p>If you are located in the EEA, UK, or Switzerland, you have the following rights:</p>
      <ul>
        <li><strong>Access (Art. 15):</strong> Request a copy of the data we hold about you.</li>
        <li><strong>Rectification (Art. 16):</strong> Correct inaccurate data.</li>
        <li>
          <strong>Erasure (Art. 17):</strong> Delete your account and all associated data from{" "}
          <a href="/settings">Settings → Security → Delete Account</a>.
        </li>
        <li>
          <strong>Portability (Art. 20):</strong> Download all your data in JSON format from{" "}
          <a href="/settings">Settings → Security → Export Data</a>.
        </li>
        <li>
          <strong>Restriction (Art. 18):</strong> Request restriction of processing in certain circumstances.
        </li>
        <li>
          <strong>Object (Art. 21):</strong> Object to processing based on legitimate interests.
        </li>
      </ul>
      <p>
        To exercise any right, email{" "}
        <a href="mailto:privacy@knowwhy.app">privacy@knowwhy.app</a> or use the in-app controls.
        We respond within 30 days.
      </p>

      <h2>8. Security</h2>
      <p>
        See our <a href="/security">Security &amp; Architecture whitepaper</a> for full technical details.
        Summary: all tokens are encrypted at rest with AES-256-GCM; data is transmitted over TLS 1.2+;
        access is restricted by JWT session and RBAC; all security-relevant actions are written to an
        immutable audit log.
      </p>

      <h2>9. Cookies</h2>
      <p>
        We use session cookies for authentication only (NextAuth.js). No advertising or tracking cookies
        are used. Strictly necessary cookies cannot be disabled without breaking the Service.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We will notify you of material changes by email or in-app notice at least 30 days before they
        take effect. Continued use after that date constitutes acceptance.
      </p>

      <h2>11. Contact</h2>
      <p>
        {/* TODO: legal review — add DPO name, postal address */}
        <strong>Data Protection Officer:</strong>{" "}
        <a href="mailto:privacy@knowwhy.app">privacy@knowwhy.app</a>
      </p>
    </article>
  )
}
