import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Swal from 'sweetalert2';
import { sendStaffCredentials } from '../../services/emailService';

const SendCredentialsModal = ({ isOpen, onClose, staffMembers }) => {
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [eventType, setEventType] = useState('new_account');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter staff with credentials and active status
  const eligibleStaff = staffMembers.filter(
    staff => staff.user_id && staff.is_active && staff.email
  );

  // Filter by search query
  const filteredStaff = eligibleStaff.filter(staff =>
    `${staff.first_name} ${staff.last_name} ${staff.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // Select/deselect all
  const handleSelectAll = () => {
    if (selectedStaff.length === filteredStaff.length) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff(filteredStaff.map(staff => staff.staff_id));
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

  // Event type options
  const eventTypes = [
    {
      value: 'new_account',
      label: 'New Account Setup',
      description: 'Send welcome email with password setup instructions for newly registered accounts',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    },
    {
      value: 'password_reset',
      label: 'Password Reset',
      description: 'Send password reset link to staff members who need to reset their password',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      )
    },
    {
      value: 'account_reactivation',
      label: 'Account Reactivation',
      description: 'Notify staff that their account has been reactivated with login instructions',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      value: 'access_reminder',
      label: 'Access Reminder',
      description: 'Send login credentials reminder to existing staff members',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    }
  ];

  const handleSend = async () => {
    if (selectedStaff.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Staff Selected',
        text: 'Please select at least one staff member to send credentials.',
        confirmButtonColor: '#1CABB8'
      });
      return;
    }

    const selectedEventType = eventTypes.find(et => et.value === eventType);
    const staffToSend = staffMembers.filter(staff => selectedStaff.includes(staff.staff_id));

    const result = await Swal.fire({
      title: 'Send Access Emails?',
      html: `
        <div class="text-left">
          <p class="mb-3"><strong>Event Type:</strong> ${selectedEventType.label}</p>
          <p class="mb-3"><strong>Recipients:</strong> ${selectedStaff.length} staff member(s)</p>
          <div class="bg-gray-50 p-3 rounded-md max-h-32 overflow-y-auto">
            <ul class="text-sm space-y-1">
              ${staffToSend.map(staff => `
                <li>• ${staff.first_name} ${staff.last_name} (${staff.email})</li>
              `).join('')}
            </ul>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1CABB8',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, Send Emails',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    setIsSending(true);

    try {
      // Call API to send credentials (config is fetched from database in API)
      const response = await sendStaffCredentials(staffToSend, eventType);

      Swal.fire({
        icon: 'success',
        title: 'Emails Sent Successfully!',
        html: `
          <div class="text-left">
            <p class="mb-2"><strong>Successfully sent:</strong> ${response.successCount} email(s)</p>
            ${response.failureCount > 0 ? `
              <p class="mb-2 text-red-600"><strong>Failed:</strong> ${response.failureCount} email(s)</p>
              <div class="bg-red-50 p-2 rounded-md max-h-24 overflow-y-auto">
                <ul class="text-sm space-y-1">
                  ${response.errors.map(error => `
                    <li class="text-red-700">• ${error}</li>
                  `).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        `,
        confirmButtonColor: '#1CABB8'
      });

      // Reset selection
      setSelectedStaff([]);
      onClose();
    } catch (error) {
      console.error('Error sending credentials:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error Sending Emails',
        text: error.response?.data?.error || error.message || 'Failed to send credential emails. Please try again.',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setIsSending(false);
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedStaff([]);
      setSearchQuery('');
      setEventType('new_account');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl"
        >
          {/* Header */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-nextgen-blue to-nextgen-blue-dark px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">Send Access Emails</h3>
                    <p className="text-sm text-white/80">Select staff members and email type</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
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
              {/* Event Type Selection */}
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Email Event Type
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {eventTypes.map(type => (
                      <div
                        key={type.value}
                        onClick={() => setEventType(type.value)}
                        className={`
                          relative cursor-pointer rounded-lg border-2 p-4 transition-all
                          ${eventType === type.value
                            ? 'border-nextgen-blue bg-nextgen-blue/5'
                            : 'border-gray-200 hover:border-nextgen-blue/50'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`
                            p-2 rounded-lg
                            ${eventType === type.value ? 'bg-nextgen-blue text-white' : 'bg-gray-100 text-gray-600'}
                          `}>
                            {type.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-1">{type.label}</h4>
                            <p className="text-xs text-gray-600">{type.description}</p>
                          </div>
                          {eventType === type.value && (
                            <svg className="h-5 w-5 text-nextgen-blue" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    ))}
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
                        placeholder="Search staff by name or email..."
                        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nextgen-blue focus:border-transparent"
                      />
                      <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>

                  {/* Staff List */}
                  <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                    {filteredStaff.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <svg className="h-12 w-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="font-medium">No eligible staff found</p>
                        <p className="text-sm mt-1">Staff must have an active account with an email address</p>
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
                            {staff.user_id && (
                              <Badge variant="secondary" size="sm">Has Login</Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Footer - Fixed at bottom */}
              <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  disabled={isSending}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSend}
                  disabled={isSending || selectedStaff.length === 0}
                  isLoading={isSending}
                  icon={
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  }
                >
                  {isSending ? 'Sending...' : `Send to ${selectedStaff.length} Staff`}
                </Button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
  );
};

SendCredentialsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  staffMembers: PropTypes.array.isRequired
};

export default SendCredentialsModal;
