import LegalPageLayout from '../../components/legal/LegalPageLayout.jsx';
import { motion } from 'framer-motion';
import { AlertCircle, Users, Lock, Gavel, Zap, Shield, Link2 } from 'lucide-react';

const sections = [
  { id: 'acceptance', label: '1. Acceptance of Terms' },
  { id: 'who-can-use', label: '2. Who May Use NextGen' },
  { id: 'accounts', label: '3. Accounts and Access' },
  { id: 'acceptable-use', label: '4. Acceptable Use and Restrictions' },
  { id: 'confidentiality', label: '5. Confidentiality and Child Safety Data' },
  { id: 'availability', label: '6. Service Availability and Limitations' },
  { id: 'third-party', label: '7. Third-Party Services' },
  { id: 'ownership', label: '8. Ownership and Intellectual Property' },
  { id: 'suspension', label: '9. Suspension and Termination' },
  { id: 'liability', label: '10. Disclaimers and Limitation' },
  { id: 'changes', label: '11. Changes to Terms' },
  { id: 'governing', label: '12. Governing Law and Contact' },
];

const TermsOfServicePage = () => {
  return (
    <LegalPageLayout
      title="Terms of Service"
      subtitle="These terms govern use of the NextGen platform for authorized children's ministry operations."
      lastUpdated="March 24, 2026"
      sections={sections}
    >
      <motion.section 
        id="acceptance" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Gavel className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">1. Acceptance of Terms</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
          <p className="text-sm leading-7 text-gray-700">
            By accessing or using NextGen, you agree to these Terms of Service in full. If you do not agree to these terms, you must not use the platform. Continued use of NextGen constitutes acceptance of these terms.
          </p>
        </div>
      </motion.section>

      <motion.section 
        id="who-can-use" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Users className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">2. Who May Use NextGen</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5 space-y-3">
          <p className="text-sm leading-7 text-gray-700">
            NextGen is intended exclusively for authorized Christ Commission Fellowship (CCF) NXTGen ministry personnel and approved operational use. Access is restricted to authorized staff and volunteers assigned to the ministry.
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700">
            <li>Volunteer access is restricted to limited operational scope (check-in/check-out, limited child data viewing).</li>
            <li>Team Leader, Coordinator, and Administrator roles have broader access based on assigned responsibilities.</li>
            <li>Access must align with assigned ministry duties and approved leadership authorization.</li>
            <li>Unauthorized access or use by non-ministry personnel is strictly prohibited.</li>
          </ul>
        </div>
      </motion.section>

      <motion.section 
        id="accounts" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Lock className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">3. Accounts and Access</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700">
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You are responsible for all activities that occur under your login credentials.</li>
            <li>You must provide accurate account information and keep it reasonably up to date.</li>
            <li>You must promptly report unauthorized use, security breaches, or suspected compromise of your account to ministry leadership.</li>
            <li>Sharing credentials with other individuals is strictly prohibited.</li>
          </ul>
        </div>
      </motion.section>

      <motion.section 
        id="acceptable-use" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">4. Acceptable Use and Restrictions</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5 space-y-3">
          <p className="text-sm leading-7 text-gray-700">You agree not to misuse NextGen or allow others to misuse it, including by:</p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700">
            <li>Accessing data, records, or features beyond your assigned role or permissions.</li>
            <li>Using child, guardian, or staff data for unauthorized, non-ministry, or prohibited purposes.</li>
            <li>Sharing, distributing, or selling child or family information outside authorized ministry workflows.</li>
            <li>Attempting to bypass, hack, disable, or interfere with security controls or platform operation.</li>
            <li>Uploading unlawful, harmful, abusive, or unauthorized content through any platform features.</li>
            <li>Impersonating any individual or misrepresenting your authority or role.</li>
            <li>Engaging in any activity that interferes with or degrades platform service availability.</li>
          </ul>
        </div>
      </motion.section>

      <motion.section 
        id="confidentiality" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Shield className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">5. Confidentiality and Child Safety Data</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
          <p className="text-sm leading-7 text-gray-700">
            Child and guardian data processed through NextGen is highly sensitive and confidential. You acknowledge that you are handling information about minors and must only access and use this information for legitimate, approved ministry operations and child safety workflows. Unauthorized disclosure or misuse of this information may result in immediate access revocation, disciplinary action, and potential legal consequences.
          </p>
        </div>
      </motion.section>

      <motion.section 
        id="availability" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Zap className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">6. Service Availability and Limitations</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5 space-y-3">
          <p className="text-sm leading-7 text-gray-700">
            NextGen is provided to support ministry operations on an operational-use basis. While we aim to maintain consistent availability, service interruptions may occur due to maintenance, infrastructure issues, third-party service interruptions, or circumstances beyond our control.
          </p>
          <p className="text-sm leading-7 text-gray-700">
            We do not guarantee uninterrupted or error-free service. The ministry is not liable for any data loss, service delays, or operational impacts resulting from service interruptions.
          </p>
        </div>
      </motion.section>

      <motion.section 
        id="third-party" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Link2 className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">7. Third-Party Services</h2>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5 space-y-3">
            <p className="text-sm leading-7 text-gray-700">
              NextGen depends on organization-approved third-party platforms and service providers to operate core functions including backend infrastructure, database services, file storage, email delivery, scheduling, and AI-assisted features.
            </p>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-3">Approved Service Providers</p>
              <ul className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />Vercel</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />AWS</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />Supabase</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />Firebase</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />Google Drive</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />OpenAI</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />Pinecone</li>
                <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-nextgen-blue-dark" />Cal.com</li>
              </ul>
            </div>
            <p className="text-sm text-gray-700">
              You acknowledge that these third-party services are subject to their own terms, privacy policies, and service level agreements. The ministry is not responsible for the availability, security, or conduct of third-party services.
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section 
        id="ownership" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Gavel className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">8. Ownership and Intellectual Property</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
          <p className="text-sm leading-7 text-gray-700">
            NextGen, including its design, functionality, graphics, and components, is owned by or licensed to Christ Commission Fellowship (CCF) and is proprietary software. All intellectual property rights are reserved. You are granted a limited, non-exclusive, non-transferable license to use NextGen solely for authorized ministry operations. Ministry data remains under ministry control, subject to applicable law and data privacy policy.
          </p>
        </div>
      </motion.section>

      <motion.section 
        id="suspension" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">9. Suspension and Termination</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
          <p className="text-sm leading-7 text-gray-700">
            Access to NextGen may be suspended or permanently revoked at any time, without notice, for violations of these terms, inappropriate use of sensitive data, security breaches, role/assignment changes, or other conduct deemed harmful to ministry operations. Upon suspension or revocation, all access to platform data and features ceases immediately.
          </p>
        </div>
      </motion.section>

      <motion.section 
        id="liability" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Shield className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">10. Disclaimers and Limitation</h2>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
            <p className="text-sm leading-7 text-gray-700 mb-3">
              NextGen is provided on an operational-use basis "as is" without warranties, express or implied. To the extent permitted by law, service interruptions, data delays, third-party dependency failures, or other technical issues may occur, and the ministry is not liable for damages, data loss, or operational impacts resulting from these events.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200/50 bg-amber-50/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900 mb-2">Pending Legal Review</p>
            <p className="text-sm text-amber-900">[Confirm final legal disclaimer and limitation language with counsel]</p>
          </div>
        </div>
      </motion.section>

      <motion.section 
        id="changes" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Zap className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">11. Changes to Terms</h2>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5">
          <p className="text-sm leading-7 text-gray-700">
            These Terms of Service may be updated from time to time as needed. Updated terms will be posted at this URL with a revised "Last updated" date. Continued use of NextGen after updates constitutes your acceptance of the revised terms.
          </p>
        </div>
      </motion.section>

      <motion.section 
        id="governing" 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start gap-3">
          <Gavel className="mt-1 h-5 w-5 flex-shrink-0 text-nextgen-blue-dark" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-nextgen-blue-dark">12. Governing Law and Contact</h2>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200/50 bg-gray-50/50 p-5 space-y-4">
            <p className="text-sm leading-7 text-gray-700">
              These terms are intended to be interpreted and governed in accordance with the laws of the Republic of the Philippines, without regard to conflicts of law principles.
            </p>
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
              <div>
                <p className="font-semibold text-gray-900 text-sm">Organization</p>
                <p className="text-sm text-gray-700">Christ Commission Fellowship (CCF)</p>
                <p className="text-sm text-gray-700">NXTGen Children's Ministry</p>
                <p className="text-sm text-gray-700">CCF Davao Center</p>
                <p className="text-sm text-gray-700">J.P. Laurel Ave, Poblacion District</p>
                <p className="text-sm text-gray-700">Davao City, Davao del Sur, Philippines</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Contact for Terms</p>
                <p>
                  <a
                    href="mailto:info@nextgen-ccf.org"
                    className="text-nextgen-blue-dark underline underline-offset-2 hover:text-nextgen-blue-light transition-colors font-medium text-sm"
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

export default TermsOfServicePage;
