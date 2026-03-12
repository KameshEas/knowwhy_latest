export const metadata = {
  title: "Data Processing Agreement — KnowWhy",
  description: "DPA governing how KnowWhy processes personal data on behalf of customers.",
}

export default function DpaPage() {
  return (
    <article className="prose prose-zinc dark:prose-invert max-w-none">
      <h1>Data Processing Agreement (DPA)</h1>
      <p className="lead text-zinc-500">Last updated: March 13, 2026</p>

      <p>
        This Data Processing Agreement (&ldquo;DPA&rdquo;) supplements the{" "}
        <a href="/terms">Terms of Service</a> and governs the processing of personal data by
        KnowWhy (&ldquo;Processor&rdquo;) on behalf of the Customer (&ldquo;Controller&rdquo;) in connection with the
        Service. Terms not defined here have the meaning given in the Terms of Service.
      </p>
      <p>
        This DPA applies automatically to all Customers. Enterprise customers may request a
        countersigned copy at{" "}
        <a href="mailto:legal@knowwhy.app">legal@knowwhy.app</a>.
        {/* TODO: legal review — add countersignature workflow */}
      </p>

      <hr />

      <h2>1. Role of the Parties</h2>
      <p>
        The Customer is the data <strong>Controller</strong> determining the purposes and means of
        processing. KnowWhy is the data <strong>Processor</strong> acting only on documented
        instructions from the Controller.
      </p>

      <h2>2. Subject Matter and Duration</h2>
      <p>
        KnowWhy processes personal data to provide the Service as described in the{" "}
        <a href="/privacy">Privacy Policy</a>. Processing commences on account creation and continues
        until account deletion or 30 days after contract termination, whichever is earlier.
      </p>

      <h2>3. Types of Personal Data Processed</h2>
      <ul>
        <li>Identifiers: full name, email address, profile photo URL.</li>
        <li>Authentication credentials: OAuth tokens (encrypted at rest, AES-256-GCM).</li>
        <li>Communication content: Slack messages and GitLab MR descriptions that contain decisions.</li>
        <li>Calendar data: meeting titles, attendees, timestamps, transcript text.</li>
        <li>Usage and access logs: IP addresses, action timestamps, audit log entries.</li>
      </ul>

      <h2>4. Instructions for Processing</h2>
      <p>
        KnowWhy processes personal data solely on the Controller&apos;s documented instructions
        (these Terms and any configuration in the Service). If KnowWhy is required by law to process
        data contrary to these instructions, KnowWhy will inform the Controller before processing,
        unless prohibited by law.
      </p>

      <h2>5. Confidentiality</h2>
      <p>
        KnowWhy ensures that personnel authorised to process personal data are subject to binding
        confidentiality obligations.
      </p>

      <h2>6. Technical and Organisational Measures (TOMs)</h2>
      <p>
        KnowWhy implements the following measures, detailed in the{" "}
        <a href="/security">Security Whitepaper</a>:
      </p>
      <table>
        <thead>
          <tr><th>Control</th><th>Implementation</th></tr>
        </thead>
        <tbody>
          <tr><td>Encryption at rest</td><td>AES-256-GCM for all tokens; PostgreSQL disk encryption</td></tr>
          <tr><td>Encryption in transit</td><td>TLS 1.2+ enforced; HSTS headers</td></tr>
          <tr><td>Access control</td><td>JWT sessions; RBAC (USER / ADMIN roles); least-privilege OAuth scopes</td></tr>
          <tr><td>Audit logging</td><td>Immutable append-only audit log; 12-month retention</td></tr>
          <tr><td>Pseudonymisation</td><td>Webhook payload display names redacted; only IDs retained</td></tr>
          <tr><td>Availability</td><td>Automated backups; health-check endpoints; rate limiting</td></tr>
          <tr><td>Incident response</td><td>72-hour breach notification to Controller (GDPR Art. 33)</td></tr>
          <tr><td>Penetration testing</td><td>{/* TODO: legal review — add pen-test cadence and last date */}Annual third-party pen-test (date: TBD)</td></tr>
          <tr><td>Vulnerability management</td><td>Automated dependency scanning; npm audit in CI</td></tr>
        </tbody>
      </table>

      <h2>7. Sub-Processors</h2>
      <p>
        The Controller provides general authorisation for KnowWhy to engage sub-processors. Current
        sub-processors are listed in the <a href="/privacy">Privacy Policy §5</a>. KnowWhy will
        notify the Controller at least 30 days before adding or replacing a sub-processor.
        The Controller may object within 14 days; if the objection cannot be resolved, either party
        may terminate the affected services without penalty.
      </p>

      <h2>8. Data Subject Rights</h2>
      <p>
        KnowWhy provides in-application tooling (Settings → Security) for Controllers to fulfil
        data subject requests:
      </p>
      <ul>
        <li><strong>Erasure (Art. 17):</strong> Delete Account — removes all relational data and Weaviate embeddings within 30 days.</li>
        <li><strong>Portability (Art. 20):</strong> Export Data — full JSON export of all user-owned records.</li>
        <li><strong>Access (Art. 15):</strong> Audit Log — user-facing log of all actions taken on the account.</li>
      </ul>

      <h2>9. Data Residency</h2>
      <p>
        By default, customer data is stored in the region chosen at account setup:
      </p>
      <ul>
        <li><strong>EU (Frankfurt, eu-central-1):</strong> Available for all plans.</li>
        <li><strong>US (North Virginia, us-east-1):</strong> Default for SaaS accounts.</li>
        <li><strong>Self-hosted:</strong> Customer selects their own infrastructure; KnowWhy has no access.</li>
      </ul>
      <p>
        {/* TODO: legal review — confirm Vercel/Neon EU region availability */}
        Cross-border transfers to sub-processors outside the EEA are governed by Standard Contractual
        Clauses (SCCs) and/or an adequacy decision.
      </p>

      <h2>10. Return and Deletion of Data</h2>
      <p>
        Upon termination, KnowWhy will, at the Controller&apos;s choice, return all personal data in
        machine-readable JSON format (via the export API) or securely delete it, within 30 days.
        Deletion certificates are available on request.
      </p>

      <h2>11. Audit Rights</h2>
      <p>
        The Controller may audit KnowWhy&apos;s compliance with this DPA no more than once per year by:
        (a) requesting the current SOC 2 / ISO-27001 report or equivalent; or (b) conducting an
        on-site audit with 30 days&apos; written notice, at the Controller&apos;s cost.
        {/* TODO: legal review — add SOC 2 readiness timeline */}
      </p>

      <h2>12. Breach Notification</h2>
      <p>
        KnowWhy will notify the Controller without undue delay and within 72 hours of becoming aware
        of a personal data breach (GDPR Art. 33). Notification will include the nature of the breach,
        categories of data affected, likely consequences, and measures taken or proposed.
      </p>

      <h2>13. Contact</h2>
      <p>
        Data protection enquiries:{" "}
        <a href="mailto:privacy@knowwhy.app">privacy@knowwhy.app</a>.{" "}
        For a countersigned DPA:{" "}
        <a href="mailto:legal@knowwhy.app">legal@knowwhy.app</a>.
      </p>
    </article>
  )
}
