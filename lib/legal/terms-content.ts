import type { LegalDocumentData } from './types'

export const termsAndConditions: LegalDocumentData = {
  title: 'Terms and Conditions',
  subtitle: 'Platform Use Agreement — Pre-Launch Document',
  preparedFor: 'Mr. Charles Adede, LexReg Africa Ltd',
  preparedBy: 'Ian Love, Developer',
  date: '21 June 2026',
  status: 'Draft for Legal Review',
  sections: [
    {
      number: '1',
      heading: 'Definitions & Interpretation',
      subsections: [
        {
          heading: '1.1 Definitions',
          blocks: [
            {
              type: 'bullets',
              items: [
                '"Platform" means the LexReg Africa web application, including all features, services, and content accessible via www.lexreg.africa or associated subdomains.',
                '"User" or "You" means any individual or entity that registers for, accesses, or uses the Platform.',
                '"Business Owner" means a User who creates and manages one or more business entities on the Platform.',
                '"Lawyer" means a licensed legal professional engaged by LexReg Africa or the Business Owner to provide services through the Platform.',
                '"Super Admin" means LexReg Africa Ltd, represented by Charles Adede, with ultimate administrative control over the Platform.',
                '"Services" means all features and functionalities offered through the Platform, including but not limited to entity management, compliance tracking, document vault, corporate services, and legal audit services.',
                '"Content" means all text, documents, images, data, and other materials uploaded, generated, or displayed on the Platform.',
                '"Subscription" means the paid access to specific Service pillars (Corporate Services, Legal Audit) as defined in the Pricing Schedule.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '2',
      heading: 'Acceptance of Terms',
      subsections: [
        {
          heading: '2.1 Binding Agreement',
          blocks: [
            {
              type: 'paragraph',
              text: 'By registering for an account, accessing, or using the Platform, you agree to be bound by these Terms and Conditions, our Privacy Policy, and any other policies referenced herein (collectively, the "Agreement"). If you do not agree, you must not use the Platform.',
            },
          ],
        },
        {
          heading: '2.2 Capacity to Contract',
          blocks: [
            {
              type: 'paragraph',
              text: 'You represent and warrant that you are at least 18 years of age and have the legal capacity to enter into binding contracts. If you are registering on behalf of a business entity, you represent that you have authority to bind that entity.',
            },
          ],
        },
        {
          heading: '2.3 Modifications',
          blocks: [
            {
              type: 'paragraph',
              text: 'LexReg Africa reserves the right to modify these Terms at any time. Material changes will be communicated via email and in-app notification. Continued use after changes constitutes acceptance. Users are encouraged to review the Terms periodically.',
            },
          ],
        },
      ],
    },
    {
      number: '3',
      heading: 'Platform Services',
      subsections: [
        {
          heading: '3.1 Three-Pillar Service Model',
          blocks: [
            { type: 'paragraph', text: 'The Platform operates on a three-pillar structure:' },
            {
              type: 'table',
              headers: ['Pillar', 'Description', 'Access'],
              rows: [
                [
                  'Registration / Onboarding',
                  'Entity creation, document upload, OCR extraction, compliance calendar setup. Includes existing entity, new entity, and informal business pathways.',
                  'Free (core onboarding)',
                ],
                [
                  'Corporate Services',
                  'Board notice generation, meeting minutes, governance document templates, stakeholder management, compliance tracking.',
                  'Paid subscription',
                ],
                [
                  'Legal Audit',
                  'Comprehensive legal compliance review. AI-generated preliminary report, lawyer review and sign-off, gap analysis, remediation tracking.',
                  'Premium paid service',
                ],
              ],
            },
          ],
        },
        {
          heading: '3.2 Service Availability',
          blocks: [
            {
              type: 'bullets',
              items: [
                'LexReg Africa aims for 99.9% uptime but does not guarantee uninterrupted access.',
                'Scheduled maintenance will be communicated at least 48 hours in advance.',
                'Force majeure events (internet outages, third-party failures, government action) are excluded from uptime commitments.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '4',
      heading: 'User Accounts & Responsibilities',
      subsections: [
        {
          heading: '4.1 Account Registration',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Users must provide accurate, current, and complete information during registration.',
                'Each User is limited to one account per email address.',
                'Business Owners may create and manage multiple entities under a single account.',
              ],
            },
          ],
        },
        {
          heading: '4.2 Account Security',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Users are responsible for maintaining the confidentiality of their login credentials.',
                'Users must immediately notify LexReg Africa of any unauthorised account access.',
                'LexReg Africa is not liable for losses arising from User failure to secure their account.',
              ],
            },
          ],
        },
        {
          heading: '4.3 Prohibited Conduct',
          blocks: [
            { type: 'paragraph', text: 'Users agree not to:' },
            {
              type: 'bullets',
              items: [
                'Use the Platform for any illegal, fraudulent, or unauthorised purpose.',
                'Upload viruses, malware, or other harmful code.',
                'Attempt to gain unauthorised access to other users’ accounts or data.',
                'Reverse engineer, decompile, or disassemble any part of the Platform.',
                'Use automated scripts, bots, or scrapers to access the Platform.',
                'Upload content that infringes intellectual property rights or violates applicable laws.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '5',
      heading: 'Content & Intellectual Property',
      subsections: [
        {
          heading: '5.1 User Content',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Users retain ownership of all Content they upload to the Platform.',
                'By uploading Content, Users grant LexReg Africa a non-exclusive, royalty-free licence to use, store, and process such Content solely for the purpose of providing the Services.',
                'Users represent that they have all necessary rights to upload Content and that such Content does not violate any third-party rights.',
              ],
            },
          ],
        },
        {
          heading: '5.2 LexReg Africa Intellectual Property',
          blocks: [
            {
              type: 'bullets',
              items: [
                'All Platform code, designs, templates, logos, trademarks, and proprietary technology are the exclusive property of LexReg Africa Ltd.',
                'Users receive a limited, non-transferable, non-exclusive licence to use the Platform for its intended purpose during the term of their subscription.',
                'No right, title, or interest in LexReg Africa’s intellectual property is transferred to Users.',
              ],
            },
          ],
        },
        {
          heading: '5.3 AI-Generated Content',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Documents, reports, and analyses generated by AI (Google Document AI, Gemini Flash, Claude API) are provided as aids and do not constitute legal advice.',
                'AI-generated preliminary legal audit reports require review and sign-off by a licensed lawyer before they can be relied upon as formal legal advice.',
                'LexReg Africa disclaims liability for decisions made solely based on AI-generated outputs without lawyer verification.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '6',
      heading: 'Payment & Subscriptions',
      subsections: [
        {
          heading: '6.1 Pricing',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Pricing for Corporate Services and Legal Audit is displayed on the Platform and may be updated from time to time.',
                'All prices are quoted in Kenyan Shillings (KES) unless otherwise stated.',
                'Prices exclude applicable taxes, which will be added at checkout.',
              ],
            },
          ],
        },
        {
          heading: '6.2 Payment Processing',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Payments are processed through Paystack, a licensed payment service provider.',
                'LexReg Africa does not store credit card or M-Pesa PIN details.',
                'Users agree to Paystack’s terms of service in addition to these Terms.',
              ],
            },
          ],
        },
        {
          heading: '6.3 Subscription Terms',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Subscriptions are billed in advance on a monthly or annual basis, as selected by the User.',
                'Subscriptions automatically renew unless cancelled at least 7 days before the renewal date.',
                'No refunds for partial months or unused services.',
                'LexReg Africa reserves the right to suspend access for non-payment after a 7-day grace period.',
              ],
            },
          ],
        },
        {
          heading: '6.4 Free Trial',
          blocks: [
            {
              type: 'bullets',
              items: [
                'LexReg Africa may offer a limited free trial for Corporate Services. Trial terms will be specified at sign-up.',
                'Users must provide valid payment details to start a trial but will not be charged until the trial period ends.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '7',
      heading: 'Data Protection & Privacy',
      subsections: [
        {
          heading: '7.1 Privacy Policy',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Use of the Platform is governed by our Privacy Policy, which forms part of this Agreement.',
                'Users consent to the collection, processing, and storage of their data as described in the Privacy Policy.',
              ],
            },
          ],
        },
        {
          heading: '7.2 Data Security',
          blocks: [
            {
              type: 'bullets',
              items: [
                'LexReg Africa implements industry-standard security measures including encryption, row-level security, and access controls.',
                'While we take reasonable precautions, no system is completely secure. Users acknowledge this risk.',
              ],
            },
          ],
        },
        {
          heading: '7.3 Data Breach Notification',
          blocks: [
            {
              type: 'bullets',
              items: ['In the event of a personal data breach, LexReg Africa will notify affected Users and the ODPC within 72 hours of discovery, where required by law.'],
            },
          ],
        },
      ],
    },
    {
      number: '8',
      heading: 'Third-Party Services & Integrations',
      subsections: [
        {
          heading: '8.1 Third-Party Processors',
          blocks: [
            { type: 'paragraph', text: 'The Platform relies on the following third-party services:' },
            {
              type: 'table',
              headers: ['Service', 'Purpose', 'Terms'],
              rows: [
                ['Supabase', 'Database, authentication, storage', 'supabase.com/terms'],
                ['Google Cloud', 'OCR (Document AI), AI (Gemini Flash)', 'cloud.google.com/terms'],
                ['Anthropic', 'AI document generation (Claude API)', 'anthropic.com/legal'],
                ['Paystack', 'Payment processing', 'paystack.com/terms'],
                ['OneSignal', 'Notifications (email, SMS, push)', 'onesignal.com/terms'],
                ['Vercel', 'Hosting and CDN', 'vercel.com/legal'],
              ],
            },
          ],
        },
        {
          heading: '8.2 No Endorsement',
          blocks: [
            {
              type: 'bullets',
              items: [
                'LexReg Africa does not endorse, warrant, or guarantee any third-party service.',
                'Users interact with third-party services at their own risk and subject to those services’ terms.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '9',
      heading: 'Disclaimers & Limitation of Liability',
      subsections: [
        {
          heading: '9.1 Platform Provided "As Is"',
          blocks: [
            {
              type: 'bullets',
              items: [
                'The Platform and all Services are provided on an "as is" and "as available" basis without warranties of any kind, express or implied.',
                'LexReg Africa does not warrant that the Platform will be error-free, secure, or uninterrupted.',
              ],
            },
          ],
        },
        {
          heading: '9.2 No Legal Advice',
          blocks: [
            {
              type: 'bullets',
              items: [
                'The Platform provides tools and AI-generated outputs to assist with legal compliance but does not constitute legal advice.',
                'Formal legal advice is provided only by licensed lawyers engaged through the Legal Audit service.',
                'Users should consult a qualified lawyer for specific legal matters.',
              ],
            },
          ],
        },
        {
          heading: '9.3 Limitation of Liability',
          blocks: [
            {
              type: 'bullets',
              items: [
                'To the maximum extent permitted by law, LexReg Africa’s total liability for any claim arising from the Platform shall not exceed the total amount paid by the User in the 12 months preceding the claim.',
                'LexReg Africa shall not be liable for indirect, incidental, special, consequential, or punitive damages, including lost profits or data loss.',
                'This limitation applies regardless of the legal theory (contract, tort, negligence, strict liability).',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '10',
      heading: 'Indemnification',
      blocks: [
        {
          type: 'paragraph',
          text: 'Users agree to indemnify, defend, and hold harmless LexReg Africa, its directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising from:',
        },
        {
          type: 'bullets',
          items: [
            'User’s violation of these Terms.',
            'User’s infringement of any third-party right (intellectual property, privacy, or other).',
            'User’s misuse of the Platform or Services.',
            'Content uploaded by User that violates applicable laws or regulations.',
          ],
        },
      ],
    },
    {
      number: '11',
      heading: 'Termination',
      subsections: [
        {
          heading: '11.1 Termination by User',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Users may terminate their account at any time via the Settings page.',
                'Termination does not relieve Users of payment obligations for Services already rendered.',
              ],
            },
          ],
        },
        {
          heading: '11.2 Termination by LexReg Africa',
          blocks: [
            { type: 'paragraph', text: 'LexReg Africa may suspend or terminate a User’s account immediately for:' },
            {
              type: 'bullets',
              items: [
                'Violation of these Terms or applicable laws.',
                'Fraudulent, abusive, or harmful conduct.',
                'Non-payment of subscription fees after the grace period.',
                'Upon termination, LexReg Africa will retain data as required by law and our Privacy Policy.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '12',
      heading: 'Governing Law & Dispute Resolution',
      subsections: [
        {
          heading: '12.1 Governing Law',
          blocks: [
            {
              type: 'bullets',
              items: [
                'These Terms are governed by and construed in accordance with the laws of the Republic of Kenya.',
                'Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the Kenyan courts.',
              ],
            },
          ],
        },
        {
          heading: '12.2 Dispute Resolution',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Parties agree to first attempt to resolve disputes through good-faith negotiation.',
                'If negotiation fails, parties may escalate to mediation under the Nairobi Centre for International Arbitration (NCIA) rules.',
                'Litigation shall be a last resort and filed in the courts of Nairobi, Kenya.',
              ],
            },
          ],
        },
      ],
    },
    {
      number: '13',
      heading: 'General Provisions',
      subsections: [
        {
          heading: '13.1 Entire Agreement',
          blocks: [
            {
              type: 'bullets',
              items: ['These Terms, together with the Privacy Policy and any other referenced policies, constitute the entire agreement between Users and LexReg Africa.'],
            },
          ],
        },
        {
          heading: '13.2 Severability',
          blocks: [
            {
              type: 'bullets',
              items: ['If any provision of these Terms is found invalid or unenforceable, the remaining provisions shall continue in full force.'],
            },
          ],
        },
        {
          heading: '13.3 Waiver',
          blocks: [
            {
              type: 'bullets',
              items: ['LexReg Africa’s failure to enforce any right or provision does not constitute a waiver of that right.'],
            },
          ],
        },
        {
          heading: '13.4 Assignment',
          blocks: [
            {
              type: 'bullets',
              items: [
                'Users may not assign or transfer their rights under these Terms without LexReg Africa’s prior written consent.',
                'LexReg Africa may assign its rights to a successor in connection with a merger, acquisition, or asset sale.',
              ],
            },
          ],
        },
        {
          heading: '13.5 Force Majeure',
          blocks: [
            {
              type: 'bullets',
              items: ['Neither party shall be liable for failure to perform obligations due to events beyond reasonable control, including natural disasters, war, terrorism, government action, internet outages, or third-party service failures.'],
            },
          ],
        },
      ],
    },
    {
      number: '14',
      heading: 'Contact Information',
      blocks: [
        { type: 'paragraph', text: 'For questions, support, or legal inquiries:' },
        {
          type: 'table',
          headers: ['Department', 'Contact'],
          rows: [
            ['General Support', 'support@lexreg.africa'],
            ['Legal Inquiries', 'legal@lexreg.africa'],
            ['Data Protection', 'privacy@lexreg.africa'],
            ['Physical Address', '[To be confirmed by Charles Adede] — Nairobi, Kenya'],
          ],
        },
      ],
    },
  ],
  closing:
    'These Terms and Conditions have been drafted for review by Charles Adede and his legal counsel. They require vetting against Kenyan legal practice before publication on the LexReg Africa platform.',
}
