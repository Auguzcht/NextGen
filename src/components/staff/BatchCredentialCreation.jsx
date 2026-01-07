import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Swal from 'sweetalert2';

/**
 * Batch Credential Creation Modal
 * Creates Supabase auth accounts for staff who already exist in the database
 * but don't have login credentials (no user_id)
 */
const BatchCredentialCreation = ({ isOpen, onClose, staffMembers, onSuccess }) => {
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState(null);

  // Filter staff who don't have user_id (no Supabase auth account)
  const staffWithoutAccount = useMemo(() => 
    staffMembers.filter(staff => !staff.user_id && staff.email && staff.is_active),
    [staffMembers]
  );

  // Apply search filter
  const filteredStaff = useMemo(() => 
    staffWithoutAccount.filter(staff =>
      `${staff.first_name} ${staff.last_name} ${staff.email} ${staff.role}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    ),
    [staffWithoutAccount, searchQuery]
  );

  // Select/deselect all
  const handleSelectAll = () => {
    if (selectedStaff.length === filteredStaff.length) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff(filteredStaff.map(s => s.staff_id));
    }
  };

  // Toggle individual staff
  const handleToggleStaff = (staffId) => {
    setSelectedStaff(prev =>
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  // Create credentials for selected staff
  const handleCreateCredentials = async (createAll = false) => {
    const staffIds = createAll
      ? staffWithoutAccount.map(s => s.staff_id)
      : selectedStaff;

    if (staffIds.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Staff Selected',
        text: 'Please select at least one staff member to create credentials for.',
        confirmButtonColor: '#30cee4'
      });
      return;
    }

    const confirmed = await Swal.fire({
      title: 'Create Supabase Accounts?',
      html: `
        <p>This will create Supabase authentication accounts for <strong>${staffIds.length}</strong> staff member(s).</p>
        <p class="text-sm text-gray-600 mt-2">Each staff member will receive a password reset email to set their password.</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#30cee4',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Create Accounts',
      cancelButtonText: 'Cancel'
    });

    if (!confirmed.isConfirmed) return;

    setIsCreating(true);
    setResults(null);

    try {
      const response = await fetch('/api/staff/generate-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffIds,
          bulkGenerate: createAll
        })
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setSelectedStaff([]);
        
        await Swal.fire({
          icon: data.results.failed.length > 0 ? 'warning' : 'success',
          title: 'Accounts Created & Emails Sent',
          html: `
            <div class="text-left">
              <p class="mb-2"><strong>✅ Success:</strong> ${data.results.success.length} account(s) created</p>
              ${data.results.failed.length > 0 ? `<p class="text-red-600"><strong>❌ Failed:</strong> ${data.results.failed.length} account(s)</p>` : ''}
              <p class="text-sm text-gray-600 mt-3">
                <svg class="inline h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Password reset emails sent via Supabase to all successful accounts.
              </p>
            </div>
          `,
          confirmButtonColor: '#30cee4'
        });

        if (onSuccess) onSuccess();
      } else {
        throw new Error(data.message || 'Failed to create credentials');
      }
    } catch (error) {
      console.error('Create credentials error:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Creation Failed',
        text: error.message || 'Failed to create credentials. Please try again.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Reset on close
  const handleClose = () => {
    setSelectedStaff([]);
    setSearchQuery('');
    setResults(null);
    onClose();
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedStaff([]);
      setSearchQuery('');
      setResults(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleClose}
          className="fixed inset-0 bg-black/50"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl"
        >
          {/* Header */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-nextgen-blue to-nextgen-blue-dark px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Create Login Accounts</h3>
                  <p className="text-sm text-white/80">Generate authentication accounts for staff</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body - Scrollable */}
          <div className="p-6 space-y-6">
            {/* Info Banner */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 border-l-4 border-nextgen-blue p-4 rounded-r-md backdrop-blur-sm shadow-sm">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-nextgen-blue mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-nextgen-blue-dark">
                  <p className="font-semibold mb-1">What this does:</p>
                  <ul className="space-y-1 text-gray-700">
                    <li>• Creates Supabase authentication accounts using existing email addresses</li>
                    <li>• Sends password reset emails for staff to set their own passwords</li>
                    <li>• Links the Supabase user ID to the staff table</li>
                    <li>• Primarily for volunteers who don't have accounts yet</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Staff Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Select Staff Members ({selectedStaff.length} selected)
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedStaff.length === filteredStaff.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {/* Search */}
              <div className="mb-3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search staff by name, email, or role..."
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nextgen-blue focus:border-transparent"
                  />
                  <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Results Display */}
              {results && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 p-4 bg-gradient-to-r from-blue-50 to-blue-50/50 border border-blue-200 rounded-lg"
                >
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Creation Results
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-gray-600 text-xs">Total Processed</div>
                      <div className="text-2xl font-bold text-gray-900">{results.total}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-green-600 text-xs">Success</div>
                      <div className="text-2xl font-bold text-green-700">{results.success.length}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-red-600 text-xs">Failed</div>
                      <div className="text-2xl font-bold text-red-700">{results.failed.length}</div>
                    </div>
                  </div>
                  
                  {results.failed.length > 0 && (
                    <details className="mt-3 bg-white rounded-lg p-3">
                      <summary className="cursor-pointer text-sm text-red-700 font-medium hover:text-red-800">
                        View Failed Accounts ({results.failed.length})
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs text-red-600">
                        {results.failed.map((fail, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-red-500">•</span>
                            <span><strong>{fail.name}</strong> ({fail.email}): {fail.error}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </motion.div>
              )}

              {/* Staff List */}
              <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                {filteredStaff.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <svg className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="font-medium">
                      {staffWithoutAccount.length === 0 
                        ? 'All staff members already have accounts! ✅'
                        : 'No staff members found matching your search'
                      }
                    </p>
                    {staffWithoutAccount.length === 0 && (
                      <p className="text-sm mt-1">Every active staff member has login credentials</p>
                    )}
                  </div>
                ) : (
                  filteredStaff.map(staff => (
                    <div
                      key={staff.staff_id}
                      onClick={() => handleToggleStaff(staff.staff_id)}
                      className={`
                        flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0 cursor-pointer transition-colors
                        ${selectedStaff.includes(staff.staff_id) ? 'bg-nextgen-blue/5' : 'hover:bg-gray-50'}
                      `}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStaff.includes(staff.staff_id)}
                        onChange={() => handleToggleStaff(staff.staff_id)}
                        className="h-4 w-4 text-nextgen-blue focus:ring-nextgen-blue border-gray-300 rounded cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {staff.first_name} {staff.last_name}
                        </div>
                        <div className="text-sm text-gray-600">{staff.email}</div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="primary" size="sm">{staff.role}</Badge>
                        <Badge variant="secondary" size="sm">Level {staff.access_level || 1}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-xl flex justify-between items-center gap-3">
            <div className="text-sm text-gray-600">
              {staffWithoutAccount.length > 0 ? (
                <span>{staffWithoutAccount.length} staff member(s) need accounts</span>
              ) : (
                <span className="text-green-600">✓ All staff have accounts</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleCreateCredentials(false)}
                disabled={isCreating || selectedStaff.length === 0}
                isLoading={isCreating}
              >
                {isCreating ? 'Creating...' : `Create Selected (${selectedStaff.length})`}
              </Button>
              <Button
                variant="primary"
                onClick={() => handleCreateCredentials(true)}
                disabled={isCreating || staffWithoutAccount.length === 0}
                isLoading={isCreating}
                icon={
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                  </svg>
                }
              >
                {isCreating ? 'Creating...' : `Create All (${staffWithoutAccount.length})`}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

BatchCredentialCreation.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  staffMembers: PropTypes.array.isRequired,
  onSuccess: PropTypes.func
};

export default BatchCredentialCreation;
