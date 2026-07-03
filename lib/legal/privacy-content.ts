import type { LegalDocumentData } from './types'

export const privacyPolicy: LegalDocumentData = {
  title: 'Privacy Policy',
  subtitle: 'Data Protection Act 2019 Compliant — Pre-Launch Document',
  preparedFor: 'Mr. Charles Adede, LexReg Africa Ltd',
  preparedBy: 'Ian Love, Developer',
  date: '21 June 2026',
  status: 'Draft for Legal Review',
  sections: [
    {
      number: '1',
      heading: 'Introduction',
      blocks: [
        {
          type: 'paragraph',
          text: 'LexReg Africa ("we", "us", or "our") is committed to protecting the privacy and personal data of all users of our platform. This Privacy Policy explains how we collect, use, store, and protect your personal data in compliance with the Kenya Data Protection Act, 2019 ("DPA").',
        },
        {
          type: 'paragraph',
          text: 'By accessing or using the LexReg Africa platform, you acknowledge that you have read, understood, and agree to the practices described in this Privacy Policy.',
        },
      ],
      subsections: [
        {
          heading: '1.1 Definitions',
          blocks: [
            {
              type: 'bullets',
              items: [
                '"Personal Data" means any information relating to an identified or identifiable natural person.',
                '"Sensitive Personal Data" includes data revealing racial or ethnic origin, political opinions, religious beliefs, health data, biometric data, and financial information such as KRA PINs.',
                '"Data Controller" means LexReg Africa Ltd, which determines the purposes and means of processing personal data.',
                '"Data Processor" means any third party engaged by LexReg Africa to process personal data on our behalf.',
                '"User" or "You" means any individual or entity accessing or using the LexReg Africa platform.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '2',
      heading: 'Data We Collect',
      blocks: [{ type: 'paragraph', text: 'We collect and process the following categories of personal data:' }],
      subsections: [
        {
          heading: '2.1 Identity Data',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Full name, national ID number, passport number, date of birth, nationality, and photograph.',
                'Director and shareholder identification documents.',
              ],
            },
          ],
        },
        {
          heading: '2.2 Contact Data',
          blocks: [
            {
              type: 'bullets',
              items: ['Email address, phone number, postal address, and county of residence.'],
            },
          ],
        },
        {
          heading: '2.3 Business Data',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Business name, registration number, KRA PIN, entity type, industry classification, and shareholding structure.',
                'Incorporation documents, certificates of registration, CR12 forms, and board resolutions.',
              ],
            },
          ],
        },
        {
          heading: '2.4 Financial Data',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Payment information processed through Paystack (M-Pesa, card, bank transfer). We do not store card details.',
                'Transaction history for services rendered.',
              ],
            },
          ],
        },
        {
          heading: '2.5 Employment Data',
          blocks: [
            {
              type: 'bullets',
              items: ['Employee contracts, casual worker agreements, and payroll-related documents uploaded for compliance tracking.'],
            },
          ],
        },
        {
          heading: '2.6 Technical Data',
          blocks: [
            {
              type: 'bullets',
              items: [
                'IP address, browser type, device information, access logs, and session data.',
                'Cookies and similar tracking technologies for platform functionality and security.',
              ],
            },
          ],
        },
        {
          heading: '2.7 Document Data',
          blocks: [
            {
              type: 'bullets',
              items: [
                'All documents uploaded to the Document Vault, including leases, licenses, insurance certificates, and contracts.',
                'OCR-extracted text and AI-generated metadata for document indexing.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '3',
      heading: 'How We Collect Data',
      subsections: [
        {
          heading: '3.1 Direct Collection',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Information you provide during registration, onboarding, and platform use.',
                'Documents you upload for entity registration, compliance tracking, or legal audit services.',
              ],
            },
          ],
        },
        {
          heading: '3.2 Automated Collection',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Optical Character Recognition (OCR) processing of uploaded documents using Google Document AI.',
                'AI-assisted data extraction and gap analysis using Google Gemini Flash and Anthropic Claude API.',
                'Server logs, analytics, and error tracking via Vercel Analytics and Sentry.',
              ],
            },
          ],
        },
        {
          heading: '3.3 Third-Party Sources',
          blocks: [
            {
              type: 'bullets',
              items: [
                'KRA PIN verification (mock/placeholder in Phase 1; third-party API integration in Phase 2).',
                'Business registration data from Business Registration Service (BRS) — user-facilitated, not direct integration.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '4',
      heading: 'Lawful Basis for Processing',
      blocks: [
        { type: 'paragraph', text: 'Under the Kenya Data Protection Act 2019, we process personal data based on the following lawful grounds:' },
        {
          type: 'table',
          headers: ['Lawful Basis', 'Application'],
          rows: [
            ['Consent', 'Explicit consent obtained during onboarding for marketing communications and AI processing of sensitive documents.'],
            ['Contractual Necessity', 'Processing required to deliver platform services (entity management, compliance tracking, legal audit).'],
            ['Legal Obligation', 'Compliance with tax, regulatory, and data protection laws (KRA filings, ODPC registration).'],
            ['Legitimate Interest', 'Platform security, fraud prevention, service improvement, and business analytics.'],
            ['Vital Interests', 'Emergency situations involving user safety or legal enforcement.'],
          ],
        },
      ],
    },
    {
      number: '5',
      heading: 'How We Use Your Data',
      blocks: [{ type: 'paragraph', text: 'We use personal data for the following purposes:' }],
      subsections: [
        {
          heading: '5.1 Service Delivery',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Creating and managing entity profiles and compliance calendars.',
                'Generating board notices, minutes, and governance documents.',
                'Conducting legal audits and generating compliance gap reports.',
                'Tracking operational compliance (licenses, leases, insurance, employee contracts).',
              ],
            },
          ],
        },
        {
          heading: '5.2 Communication',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Sending compliance reminders, deadline alerts, and renewal notifications.',
                'Service updates, maintenance notifications, and account-related correspondence.',
                'Marketing communications (only with explicit opt-in consent).',
              ],
            },
          ],
        },
        {
          heading: '5.3 Security & Compliance',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Identity verification and fraud prevention.',
                'Audit logging and regulatory reporting.',
                'Data protection impact assessments and compliance monitoring.',
              ],
            },
          ],
        },
        {
          heading: '5.4 Service Improvement',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Analysing platform usage to improve user experience.',
                'Training and refining AI/OCR models (anonymised data only).',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '6',
      heading: 'Data Sharing & Third Parties',
      blocks: [{ type: 'paragraph', text: 'We do not sell personal data. We share data only in the following circumstances:' }],
      subsections: [
        {
          heading: '6.1 Service Providers (Data Processors)',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Supabase (PostgreSQL): Cloud database and authentication services.',
                'Google Cloud (Document AI, Gemini Flash): OCR and AI document processing.',
                'Anthropic (Claude API): Document drafting and legal audit report generation.',
                'Paystack: Payment processing (M-Pesa, cards, bank transfers).',
                'OneSignal: Email, SMS, and push notifications.',
                'Vercel: Hosting and content delivery.',
              ],
            },
            {
              type: 'paragraph',
              text: 'All processors are bound by Data Processing Agreements (DPAs) compliant with the Kenya Data Protection Act 2019.',
            },
          ],
        },
        {
          heading: '6.2 Legal & Regulatory Disclosure',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Kenya Revenue Authority (KRA) for tax compliance verification.',
                'Office of the Data Protection Commissioner (ODPC) for regulatory oversight.',
                'Law enforcement or courts when required by valid legal process.',
              ],
            },
          ],
        },
        {
          heading: '6.3 Business Transfers',
          blocks: [
            {
              type: 'paragraph',
              text: 'In the event of a merger, acquisition, or asset sale, user data will be transferred subject to the same privacy protections outlined in this policy.',
            },
          ],
        },
      ],
    },
    {
      number: '7',
      heading: 'Data Security Measures',
      blocks: [{ type: 'paragraph', text: 'We implement the following technical and organisational security measures:' }],
      subsections: [
        {
          heading: '7.1 Technical Safeguards',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Encryption at Rest: All data stored in Supabase is encrypted using AES-256.',
                'Encryption in Transit: TLS 1.3 for all data transmission.',
                'Row-Level Security (RLS): Database policies enforce strict data isolation between tenants and users.',
                'Multi-Factor Authentication (MFA): Optional but strongly recommended for all accounts.',
                'API Key Rotation: Quarterly rotation of all third-party API credentials.',
              ],
            },
          ],
        },
        {
          heading: '7.2 Organisational Safeguards',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Role-based access control (RBAC) with three defined roles: Super Admin, Business Owner, and Lawyer.',
                'Principle of least privilege — users access only data necessary for their role.',
                'Regular security audits and penetration testing.',
                'Staff training on data protection and confidentiality.',
              ],
            },
          ],
        },
        {
          heading: '7.3 Incident Response',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Automated breach detection via Sentry and Vercel monitoring.',
                '72-hour notification to ODPC and affected users in case of personal data breach.',
                'Documented incident response plan with defined roles and escalation paths.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '8',
      heading: 'Data Retention & Deletion',
      subsections: [
        {
          heading: '8.1 Retention Periods',
          blocks: [
            {
              type: 'table',
              headers: ['Data Category', 'Retention Period', 'Rationale'],
              rows: [
                ['Active entity data', 'Duration of subscription + 7 years', 'Legal and tax compliance requirements'],
                ['Audit logs', '7 years', 'Regulatory and forensic requirements'],
                ['Deleted entities (soft delete)', '30 days in trash, then permanent purge', 'User recovery window + DPA compliance'],
                ['Payment records', '7 years', 'Tax and accounting requirements'],
                ['OCR/AI processing logs', '90 days', 'Model improvement and debugging'],
                ['Inactive accounts', '2 years of inactivity, then deletion notice', 'Data minimisation principle'],
              ],
            },
          ],
        },
        {
          heading: '8.2 Soft Delete Mechanism',
          blocks: [
            { type: 'paragraph', text: 'When a user or admin deletes data (entity, document, or account), the system:' },
            {
              type: 'bullets',
              ordered: true,
              items: [
                'Marks the record as deleted with a timestamp.',
                'Hides the record from all UI views and API responses.',
                'Retains the record in the database for 30 days (the "trash" period).',
                'Permanently purges the record after 30 days via automated cron job.',
                'Generates an audit log entry for every deletion and purge event.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '9',
      heading: 'Your Data Subject Rights',
      blocks: [
        { type: 'paragraph', text: 'Under the Kenya Data Protection Act 2019, you have the following rights:' },
        {
          type: 'table',
          headers: ['Right', 'Description', 'LexReg Implementation'],
          rows: [
            ['Right to Access', 'Obtain confirmation of processing and a copy of your data.', '"Export My Data" feature in Settings — JSON/CSV download.'],
            ['Right to Rectification', 'Correct inaccurate or incomplete data.', 'Self-service profile editing + "Request Correction" workflow.'],
            ['Right to Erasure', 'Request deletion of personal data ("right to be forgotten").', '"Delete Account" in Settings → 30-day grace → permanent purge.'],
            ['Right to Restrict Processing', 'Limit how your data is used.', 'Pause compliance tracking while disputing data accuracy.'],
            ['Right to Data Portability', 'Receive data in structured, machine-readable format.', 'Standard JSON export compatible with other platforms.'],
            ['Right to Object', 'Object to processing based on legitimate interest or marketing.', 'Opt-out toggle in Settings for non-essential communications.'],
            ['Right to Lodge Complaint', 'Complain to ODPC about processing practices.', 'ODPC contact in Section 14. Internal escalation via support.'],
          ],
        },
      ],
    },
    {
      number: '10',
      heading: 'Children’s Privacy',
      blocks: [
        {
          type: 'paragraph',
          text: 'LexReg Africa is not intended for use by individuals under the age of 18. We do not knowingly collect personal data from minors. If we become aware that a minor has provided personal data, we will delete such data immediately upon verification.',
        },
      ],
    },
    {
      number: '11',
      heading: 'Cookies & Tracking Technologies',
      subsections: [
        {
          heading: '11.1 Essential Cookies',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Session management and authentication.',
                'CSRF protection and security tokens.',
                'Save-as-draft functionality for onboarding forms.',
              ],
            },
          ],
        },
        {
          heading: '11.2 Analytics Cookies',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Platform usage analytics (anonymised IP, page views, feature engagement).',
                'Error tracking and performance monitoring.',
              ],
            },
          ],
        },
        {
          heading: '11.3 Marketing Cookies',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Used only with explicit consent for targeted communications.',
                'Users can manage preferences via the Cookie Consent banner.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '12',
      heading: 'International Data Transfers',
      blocks: [
        {
          type: 'paragraph',
          text: 'LexReg Africa’s infrastructure is hosted on Vercel (global CDN) and Supabase (South Africa region). While data is primarily stored in Africa, some processing (Google Document AI, Claude API) may involve data transit to the United States and European Union.',
        },
        { type: 'paragraph', text: 'All international transfers are conducted under:' },
        {
          type: 'bullets',
          items: [
            'Standard Contractual Clauses (SCCs) approved by the ODPC.',
            'Adequacy decisions where applicable (EU GDPR alignment).',
            'Data Processing Agreements with all third-party processors.',
          ],
        },
      ],
    },
    {
      number: '13',
      heading: 'Changes to This Policy',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may update this Privacy Policy from time to time. Material changes will be communicated via email notification, in-app banner, and updated "Last Modified" date. Continued use constitutes acceptance.',
        },
      ],
    },
    {
      number: '14',
      heading: 'Contact Information',
      blocks: [
        { type: 'paragraph', text: 'For questions, concerns, or to exercise your data subject rights, contact:' },
        {
          type: 'table',
          headers: ['Role', 'Contact'],
          rows: [
            ['Data Protection Officer', '[To be appointed by Charles Adede]'],
            ['Platform Support', 'support@lexreg.africa'],
            ['Privacy Concerns', 'privacy@lexreg.africa'],
            ['Regulatory Body', 'Office of the Data Protection Commissioner (ODPC) — www.odpc.go.ke'],
          ],
        },
      ],
    },
  ],
  closing:
    'This Privacy Policy has been drafted for review by Charles Adede and his legal counsel. It requires vetting against Kenyan legal practice before publication on the LexReg Africa platform.',
}
