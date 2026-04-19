import React from "react";
import type { OrgContractData } from "./OrgContractPage";

interface ContractTemplateProps {
  data: Partial<OrgContractData>;
  orgSignerName?: string;
  orgSignerTitle?: string;
  orgSignature?: string;
  orgSignedAt?: string;
  adminSignerName?: string;
  adminSignerTitle?: string;
  adminApprovedAt?: string;
  mode?: "preview" | "signed";
}

const CLBPREP_NAME = "Soheila Azizi";
const CLBPREP_COMPANY = "Azizi Online Learning Services";
const CLBPREP_EMAIL = "support@clbprep.com";
const CLBPREP_ADDRESS = "Halifax, Nova Scotia, Canada";

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontWeight: 800,
          fontSize: 13,
          color: "#1e293b",
          marginBottom: 8,
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: 6,
        }}
      >
        {number}. {title.toUpperCase()}
      </div>
      <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
        {children}
      </div>
    </div>
  );
}

function Clause({ children }: { children: React.ReactNode }) {
  return <p style={{ marginBottom: 8, marginTop: 0 }}>{children}</p>;
}

function formatDateOnly(value?: string) {
  if (!value) return "";
  const trimmed = String(value).trim();
  const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const t = new Date(trimmed).getTime();
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleDateString("en-CA", { timeZone: "UTC" });
}

export default function ContractTemplate({
  data,
  orgSignerName,
  orgSignerTitle,
  orgSignature,
  orgSignedAt,
  adminSignerName,
  adminSignerTitle,
  adminApprovedAt,
  mode = "preview",
}: ContractTemplateProps) {
  const providerName = adminSignerName || CLBPREP_NAME;
  const providerTitle = adminSignerTitle || "Owner";
  const providerSignedAt = formatDateOnly(adminApprovedAt);
  const clientSignedAt = formatDateOnly(orgSignedAt);

  const effectiveDate =
    providerSignedAt || clientSignedAt || data.effectiveDate || "___________";
  const orgName = data.organizationName || "___________";
  const orgAddress = data.organizationAddress || "___________";
  const orgEmail = data.primaryAdminEmail || "___________";
  const orgContactName = data.primaryAdminName || "___________";
  const seats = data.selectedPlan || "___";
  const price = data.selectedPlanPrice
    ? `CAD $${data.selectedPlanPrice}`
    : "___________";
  const startDate = data.startDate || "___________";
  const term = data.initialTerm || "Monthly";
  const billing = data.billingMethod || "Stripe invoice";
  const autoRenew = Boolean(data.autoRenew);
  const notes = data.specialNotes;

  const renewalText = autoRenew
    ? "Yes — subscription renews automatically unless cancelled in accordance with this Agreement"
    : "No — manual renewal only. The subscription expires at the end of the paid term unless renewed.";

  return (
    <div
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "#1e293b",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          textAlign: "center",
          marginBottom: 32,
          paddingBottom: 20,
          borderBottom: "2px solid #1e293b",
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: ".04em",
            marginBottom: 6,
          }}
        >
          CLBPREP ORGANIZATION SERVICE AGREEMENT
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          This Service Agreement is entered into as of the <strong>Effective Date</strong>, which means the date of the last
          signature below.
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
          Effective Date: <strong>{effectiveDate}</strong>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 28,
          padding: "16px 20px",
          background: "#f8fafc",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#64748b",
              letterSpacing: ".1em",
              marginBottom: 8,
            }}
          >
            SERVICE PROVIDER
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 2,
            }}
          >
            {CLBPREP_COMPANY}
          </div>
          <div style={{ fontSize: 12, color: "#475569" }}>Service offered under the CLBPrep brand</div>
          <div style={{ fontSize: 12, color: "#475569" }}>{CLBPREP_ADDRESS}</div>
          <div style={{ fontSize: 12, color: "#475569" }}>{CLBPREP_EMAIL}</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
            Representative: {CLBPREP_NAME}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "#64748b",
              letterSpacing: ".1em",
              marginBottom: 8,
            }}
          >
            CLIENT ORGANIZATION
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 2,
            }}
          >
            {orgName}
          </div>
          <div style={{ fontSize: 12, color: "#475569" }}>{orgAddress}</div>
          <div style={{ fontSize: 12, color: "#475569" }}>{orgEmail}</div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
            Contact: {orgContactName}
          </div>
        </div>
      </div>

      <Section number="1" title="Services">
        <Clause>
          <strong>{CLBPREP_COMPANY}</strong> ("Provider") agrees to provide the Organization with access to its online CELPIP preparation platform offered under the CLBPrep brand (the "Platform"), available at clbprep.com.
        </Clause>
        <Clause>
          The Platform may include practice tests, mock exams, AI-assisted skill builders, listening and reading exercises,
          writing and speaking practice tools, and progress dashboards.
        </Clause>
        <Clause>
          Access is provided on a per-seat basis. Each seat may be assigned to <strong>one learner at a time</strong> during
          the subscription term. Seats may be assigned, reassigned, or deactivated by the Organization through the
          Organization Admin Panel or Partner Panel, subject to the purchased seat limit.
        </Clause>
        <Clause>
          CLBPrep will use reasonable commercial efforts to maintain platform availability. Scheduled maintenance,
          third-party service interruptions, and events beyond CLBPrep&apos;s reasonable control are excluded from any uptime
          commitment.
        </Clause>
      </Section>

      <Section number="2" title="Subscription Plan and Pricing">
        <Clause>The Organization has selected the following plan:</Clause>

        <div
          style={{
            margin: "10px 0 14px",
            padding: "14px 18px",
            background: "#f1f5f9",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
          }}
        >
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <tbody>
              {[
                ["Number of Seats", `${seats} seats`],
                ["Fee", `${price} per term (+ applicable taxes)`],
                ["Subscription Start Date", startDate],
                ["Initial Term", term],
                ["Billing Method", billing],
                ["Renewal", renewalText],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td
                    style={{
                      padding: "4px 12px 4px 0",
                      fontWeight: 700,
                      color: "#475569",
                      width: "40%",
                      verticalAlign: "top",
                    }}
                  >
                    {label}
                  </td>
                  <td style={{ padding: "4px 0", color: "#1e293b" }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Clause>
          All fees are in Canadian dollars (CAD) and are exclusive of applicable taxes unless expressly stated otherwise.
          The Organization is responsible for all applicable taxes, including HST where applicable.
        </Clause>

        {notes && (
          <Clause>
            <strong>Additional Notes:</strong> {notes}
          </Clause>
        )}
      </Section>

      <Section number="3" title="Payment Terms">
        <Clause>
          CLBPrep will issue an invoice or payment link at the beginning of each billing cycle or agreed term.
        </Clause>
        <Clause>
          Payment is due within <strong>15 days</strong> of the invoice date unless otherwise stated in writing.
        </Clause>

        {autoRenew ? (
          <Clause>
            Because the Organization has selected auto-renewal, the Organization authorizes recurring billing through the
            agreed payment method, subject to this Agreement and any separate written billing approval.
          </Clause>
        ) : (
          <Clause>
            This Agreement does <strong>not</strong> authorize automatic recurring charges. If the Organization wishes to
            continue service after the current paid term, renewal may be completed by payment of a renewal invoice,
            acceptance of a renewal quote, or another written confirmation accepted by CLBPrep.
          </Clause>
        )}

        <Clause>
          If payment is not received within 3 business days after the due date, CLBPrep may suspend access to the Platform
          upon written notice until the outstanding amount is paid.
        </Clause>
      </Section>

      <Section number="4" title="Term, Expiry, and Early Termination">
        <Clause>
          This Agreement begins on <strong>{startDate}</strong> and remains in effect for the <strong>Initial Term stated
          above</strong>.
        </Clause>

        {autoRenew ? (
          <Clause>
            At the end of the current term, this Agreement will automatically renew for successive renewal terms of the same
            length unless either party gives written notice of non-renewal or cancellation in accordance with this
            Agreement.
          </Clause>
        ) : (
          <Clause>
            At the end of the paid term, this Agreement will expire automatically unless it is manually renewed in
            accordance with Section 3.
          </Clause>
        )}

        {!autoRenew && (
          <Clause>
            No notice is required for either party to allow the Agreement to expire at the end of the current paid term.
          </Clause>
        )}

        <Clause>
          If the Organization chooses to stop using the Platform before the end of a paid term, no refund will be provided
          for the unused portion of that term unless required by applicable law. Access will remain active until the end of
          the paid period, unless earlier termination is required under this Agreement.
        </Clause>

        <Clause>
          Either party may terminate this Agreement immediately upon written notice if the other party commits a material
          breach and does not cure that breach within <strong>10 business days</strong> after receiving written notice.
        </Clause>
      </Section>

      <Section number="5" title="Seat Management and Learner Access">
        <Clause>
          The Organization is responsible for assigning and managing learner seats within its contracted seat limit.
        </Clause>
        <Clause>
          The Organization may not exceed the contracted number of seats unless additional seats are approved by CLBPrep and
          the related fees are accepted by the Organization.
        </Clause>
        <Clause>
          The Organization is responsible for ensuring that its learners use the Platform in accordance with CLBPrep&apos;s
          applicable Terms of Service and acceptable use requirements.
        </Clause>
        <Clause>
          Additional seats may be added during the term upon written request and acceptance of the related pricing.
        </Clause>
        <Clause>
          Any reduction in seat count will apply only to a future renewal term, not to the current paid term.
        </Clause>
      </Section>

      <Section number="6" title="Data and Privacy">
        <Clause>
          CLBPrep may collect and process learner information, including name, email address, and usage activity, for the
          purpose of providing, securing, supporting, and improving the Platform.
        </Clause>
        <Clause>
          CLBPrep will handle personal information in accordance with its Privacy Policy and applicable privacy laws,
          including PIPEDA, as applicable.
        </Clause>
        <Clause>
          The Organization confirms that it has obtained any required notices, permissions, or consents needed to provide
          learner information to CLBPrep for account creation and service delivery.
        </Clause>
        <Clause>
          CLBPrep will not sell learner personal information. CLBPrep may share personal information with service providers
          that support the Platform, or where required by law.
        </Clause>
        <Clause>
          Unless otherwise required by law or agreed in writing, CLBPrep may retain learner data for up to 90 days after
          termination or expiry of the Agreement, after which it may be deleted.
        </Clause>
      </Section>

      <Section number="7" title="Intellectual Property">
        <Clause>
          All content, software, branding, designs, questions, materials, and other elements of the Platform are and remain
          the exclusive property of {CLBPREP_COMPANY} and its licensors.
        </Clause>
        <Clause>
          The Organization receives a limited, non-exclusive, non-transferable right to allow its authorized learners to use
          the Platform during the paid term for internal educational purposes only.
        </Clause>
        <Clause>
          The Organization may not copy, reproduce, redistribute, resell, reverse engineer, or create derivative works from
          the Platform or its content except with CLBPrep&apos;s prior written permission.
        </Clause>
      </Section>

      <Section number="8" title="No Guarantee of Results">
        <Clause>CLBPrep provides educational and exam-preparation services only.</Clause>
        <Clause>
          CLBPrep does not guarantee any specific CELPIP score, language outcome, academic result, immigration outcome,
          employment result, or other personal outcome.
        </Clause>
        <Clause>
          The Organization acknowledges that learner performance depends on many factors outside CLBPrep&apos;s control.
        </Clause>
      </Section>

      <Section number="9" title="Limitation of Liability">
        <Clause>
          To the maximum extent permitted by applicable law, CLBPrep&apos;s total liability arising out of or related to this
          Agreement will not exceed the total fees actually paid by the Organization under this Agreement in the three (3)
          months immediately preceding the event giving rise to the claim.
        </Clause>
        <Clause>
          CLBPrep will not be liable for any indirect, incidental, special, punitive, or consequential damages, including
          loss of revenue, loss of data, or business interruption, even if advised of the possibility of such damages.
        </Clause>
        <Clause>
          Nothing in this Agreement limits liability for fraud, willful misconduct, or any liability that cannot be excluded
          by law.
        </Clause>
      </Section>

      <Section number="10" title="Governing Law and Dispute Resolution">
        <Clause>
          This Agreement is governed by the laws of the Province of Nova Scotia and the federal laws of Canada applicable
          therein.
        </Clause>
        <Clause>
          Before starting legal proceedings, the parties will first try in good faith to resolve any dispute through
          discussion and negotiation.
        </Clause>
        <Clause>
          If the dispute is not resolved, either party may bring the matter before the courts of Nova Scotia.
        </Clause>
      </Section>

      <Section number="11" title="General">
        <Clause>
          <strong>Entire Agreement.</strong> This Agreement is the complete agreement between the parties regarding the
          subject matter and replaces prior discussions, proposals, or understandings about it.
        </Clause>
        <Clause>
          <strong>Amendments.</strong> Any amendment or modification to this Agreement must be in writing and agreed by both
          parties.
        </Clause>
        <Clause>
          <strong>Severability.</strong> If any provision of this Agreement is found unenforceable, the remaining provisions
          will remain in effect.
        </Clause>
        <Clause>
          <strong>Electronic Signatures.</strong> The parties agree that electronic signatures, typed signatures, and
          electronically accepted versions of this Agreement are intended to be binding and valid.
        </Clause>
        <Clause>
          <strong>Notices.</strong> Notices under this Agreement must be sent by email to the contact addresses listed above,
          unless either party later provides an updated notice address in writing.
        </Clause>
        <Clause>
          <strong>Brand Clarification.</strong> CLBPrep is the brand name used for the Platform. In this Agreement, the legal
          contracting service provider is Azizi Online Learning Services. Reference to CLBPrep does not identify a separate
          legal entity or represent that CLBPrep is a registered trademark.
        </Clause>
      </Section>

      <div style={{ marginTop: 32, paddingTop: 20, borderTop: "2px solid #e2e8f0" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: "#64748b",
            letterSpacing: ".08em",
            marginBottom: 16,
          }}
        >
          IN WITNESS WHEREOF, the parties have agreed to the terms of this Agreement as of the Effective Date.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div
            style={{
              padding: "14px 16px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#64748b",
                letterSpacing: ".1em",
                marginBottom: 10,
              }}
            >
              SERVICE PROVIDER
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{CLBPREP_COMPANY}</div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>Service offered under the CLBPrep brand</div>

            <div
              style={{
                borderBottom: providerSignedAt ? "1px solid #94a3b8" : "1px dashed #94a3b8",
                paddingBottom: 4,
                marginBottom: 4,
                minHeight: 28,
                fontStyle: "italic",
                fontSize: 15,
                fontFamily: "Georgia, serif",
                color: providerSignedAt ? "#1e3a5f" : "#94a3b8",
              }}
            >
              {providerSignedAt ? providerName : "Awaiting approval…"}
            </div>

            <div style={{ fontSize: 11, color: "#64748b" }}>Name: {providerName}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>Title: {providerTitle}</div>
            <div style={{ fontSize: 11, color: providerSignedAt ? "#64748b" : "#94a3b8" }}>
              Date: {providerSignedAt || "___________"}
            </div>
          </div>

          <div
            style={{
              padding: "14px 16px",
              background: "#f8fafc",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#64748b",
                letterSpacing: ".1em",
                marginBottom: 10,
              }}
            >
              CLIENT ORGANIZATION
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{orgName}</div>
            <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>{orgEmail}</div>

            <div
              style={{
                borderBottom: orgSignature ? "1px solid #94a3b8" : "1px dashed #94a3b8",
                paddingBottom: 4,
                marginBottom: 4,
                minHeight: 28,
                fontStyle: "italic",
                fontSize: 15,
                fontFamily: "Georgia, serif",
                color: orgSignature ? "#1e3a5f" : "#94a3b8",
              }}
            >
              {orgSignature || "Awaiting signature…"}
            </div>

            <div
              style={{
                fontSize: 11,
                color: orgSignerName ? "#64748b" : "#94a3b8",
              }}
            >
              Name: {orgSignerName || "___________"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: orgSignerTitle ? "#64748b" : "#94a3b8",
              }}
            >
              Title: {orgSignerTitle || "___________"}
            </div>
            <div
              style={{
                fontSize: 11,
                color: clientSignedAt ? "#64748b" : "#94a3b8",
              }}
            >
              Date: {clientSignedAt || "___________"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
