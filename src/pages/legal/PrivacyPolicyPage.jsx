import LegalPageLayout from '../../components/legal/LegalPageLayout.jsx';
import { motion } from 'framer-motion';
import { Shield, Users, Database, Eye, Lock, FileText } from 'lucide-react';

const sections = [
  { id: 'scope', label: '1. Scope and Purpose' },
  { id: 'data-we-collect', label: '2. Data We Collect' },
  { id: 'how-we-collect', label: '3. How We Collect Data' },
  { id: 'why-we-use', label: '4. Why We Use Data' },
  { id: 'sharing', label: '5. Sharing and Third Parties' },
  { id: 'retention', label: '6. Data Retention' },
  { id: 'security', label: '7. Security and Access Controls' },
  { id: 'rights', label: '8. Your Rights' },
  { id: 'children', label: '9. Child Data Handling' },
  { id: 'updates', label: '10. Policy Updates' },
  { id: 'contact', label: '11. Contact Information' },
];

const PrivacyPolicyPage = () => {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      subtitle="This policy explains how NextGen handles personal information for children's ministry operations."
      lastUpdated="March 24, 2026"
      sections={sections}
    >
      <motion.section 
        id="scope" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Shield className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">1. Scope and Purpose</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5 space-y-3">
          <p className="text-sm leading-7 text-gray-700">
            <strong>NextGen: CCF NXTGen Children's Ministry Management System</strong> is used by Christ Commission Fellowship (CCF) NXTGen to support child registration, attendance, communication, staffing, ministry scheduling, materials management, and reporting. This policy applies to personal data processed through the NextGen web application.
          </p>
          <p className="text-sm leading-7 text-gray-700">
            This policy is designed to align with the Philippine Data Privacy Act of 2012 and related data privacy expectations. For more information, visit our ministry page at{' '}
            <a
              href="https://www.facebook.com/ccfnxtgen"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-nextgen-blue-dark underline underline-offset-2 hover:text-nextgen-blue-light transition-colors"
            >
              Facebook.com/ccfnxtgen
            </a>
          </p>
        </div>
      </motion.section>

      <motion.section 
        id="data-we-collect" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Database className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">2. Data We Collect</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5 space-y-3">
          <p className="text-sm font-medium text-gray-900">We may collect and process the following information based on real platform workflows:</p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700">
            <li><strong>Child profile data:</strong> name, formal ID, nickname, birthdate, gender, age-group assignment, photo.</li>
            <li><strong>Guardian data:</strong> name, phone number, email address, relationship to child, primary guardian flag.</li>
            <li><strong>Attendance data:</strong> service/date attendance records, check-in and check-out times, attendance staff logs.</li>
            <li><strong>QR-linked identifiers</strong> used to support check-in/check-out workflows.</li>
            <li><strong>Staff data:</strong> name, email, phone, role, assignment records, account status, access level.</li>
            <li><strong>Communication logs</strong> and email delivery data relevant to guardian and staff communications.</li>
            <li><strong>Operational records</strong> for reports, analytics, and ministry administration.</li>
            <li><strong>Materials metadata</strong> and links, including external links where configured.</li>
          </ul>
        </div>
      </motion.section>

      <motion.section 
        id="how-we-collect" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Eye className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">3. How We Collect Data</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700">
            <li>Direct entry by authorized ministry personnel during registration and operations.</li>
            <li>Attendance workflows using search, webcam QR scan, or hardware 2D scanner.</li>
            <li>System-generated operational logs, report data, and communication records.</li>
            <li>Authenticated account workflows such as login and password reset processes.</li>
            <li>Scheduling and assignment workflows, including integrations where enabled.</li>
          </ul>
        </div>
      </motion.section>

      <motion.section 
        id="why-we-use" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <FileText className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">4. Why We Use Data</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700">
            <li>Support child safety, ministry check-in/check-out, and operational accountability.</li>
            <li>Maintain contact records for guardians and communicate ministry updates.</li>
            <li>Manage staff roles, access restrictions, and duty assignments.</li>
            <li>Generate attendance summaries, historical reports, and ministry analytics.</li>
            <li>Operate routine administration for children's ministry services and programs.</li>
          </ul>
        </div>
      </motion.section>

      <motion.section 
        id="sharing" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Users className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">5. Sharing and Third Parties</h2>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
            <p className="text-sm leading-7 text-gray-700 mb-4">
              NextGen uses organization-approved third-party platforms and service providers to host, operate, secure, support, store, schedule, communicate, and improve the service. Data is transferred to these providers only as needed for platform operation.
            </p>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-3">Platform and Service Providers</p>
              <ul className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />Vercel (hosting)</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />AWS (infrastructure)</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />Supabase (database)</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />Firebase (storage)</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />Google Drive (files)</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />OpenAI (AI features)</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />Pinecone (search)</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />Cal.com (scheduling)</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section 
        id="retention" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Database className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">6. Data Retention</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5 space-y-4">
          <p className="text-sm leading-7 text-gray-700">
            We retain personal data only for as long as necessary for the purposes described in this policy, including ministry administration, child safety, attendance and checkout operations, communication history, reporting, security, and legitimate organizational recordkeeping.
          </p>
          
          <p className="text-sm leading-7 text-gray-700">
            <strong>Child, guardian, and volunteer or staff records</strong> may be retained while the individual remains active in ministry operations and, where appropriate, for a reasonable period afterward to support continuity, safety reviews, historical reporting, safeguarding concerns, dispute resolution, and other legitimate organizational purposes.
          </p>
          
          <p className="text-sm leading-7 text-gray-700">
            When records are no longer actively needed, they may be deactivated, archived, anonymized, or securely deleted, depending on the nature of the record and operational requirements.
          </p>
          
          <div className="rounded-lg border border-blue-200/50 bg-blue-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-900 mb-3">System Logs and Access Records</p>
            <p className="text-sm leading-7 text-blue-900">
              System and access logs are generally retained for a limited period, such as up to ninety (90) days, unless a longer retention period is required for security investigation, incident response, troubleshooting, audit, or legal obligations.
            </p>
          </div>
          
          <p className="text-sm leading-7 text-gray-700">
            We review retention practices periodically and may update them as our operational, legal, and safeguarding requirements evolve.
          </p>
        </div>
      </motion.section>

      <motion.section 
        id="security" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Lock className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">7. Security and Access Controls</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700">
            <li>Access is restricted to authorized ministry personnel with authenticated accounts.</li>
            <li>Role-based access is applied across Volunteer, Team Leader, Coordinator, and Administrator levels.</li>
            <li>Volunteers have restricted permissions due to the sensitivity of child-related data.</li>
            <li>Operational features and record visibility are controlled by permission level.</li>
          </ul>
        </div>
      </motion.section>

      <motion.section 
        id="rights" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Shield className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">8. Your Rights</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5 space-y-3">
          <p className="text-sm leading-7 text-gray-700">
            Subject to applicable law, data subjects may request access, correction, or other privacy-related action regarding personal information processed in NextGen.
          </p>
          <p className="text-sm leading-7 text-gray-700">
            Requests should be sent through the ministry's designated privacy contact at{' '}
            <a
              href="mailto:info@nextgen-ccf.org"
              className="font-semibold text-nextgen-blue-dark underline underline-offset-2 hover:text-nextgen-blue-light transition-colors"
            >
              info@nextgen-ccf.org
            </a>
          </p>
        </div>
      </motion.section>

      <motion.section 
        id="children" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Users className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">9. Child Data Handling</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
          <p className="text-sm leading-7 text-gray-700">
            Child information in NextGen is collected and used for ministry administration and safety operations, including attendance tracking and guardian coordination. Access is controlled by role and limited to authorized ministry staff. Photos and QR codes are used exclusively for identification and check-in/check-out workflows.
          </p>
        </div>
      </motion.section>

      <motion.section 
        id="updates" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <FileText className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">10. Policy Updates</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
          <p className="text-sm leading-7 text-gray-700">
            We may update this Privacy Policy as operations, integrations, or legal requirements change. The updated version will be published on this page with a revised "Last updated" date.
          </p>
        </div>
      </motion.section>

      <motion.section 
        id="contact" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Shield className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">11. Contact Information</h2>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-gray-900">Organization</p>
                <p className="text-gray-700">Christ Commission Fellowship (CCF)</p>
                <p className="text-gray-700">CCF Davao Center, J.P. Laurel Ave, Poblacion District</p>
                <p className="text-gray-700">Davao City, Davao del Sur, Philippines</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Privacy Contact</p>
                <p>
                  <a
                    href="mailto:info@nextgen-ccf.org"
                    className="text-nextgen-blue-dark underline underline-offset-2 hover:text-nextgen-blue-light transition-colors font-medium"
                  >
                    info@nextgen-ccf.org
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </LegalPageLayout>
  );
};

export default PrivacyPolicyPage;
