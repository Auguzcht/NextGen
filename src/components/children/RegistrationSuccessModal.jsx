import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Modal, useToast } from '../ui';
import QRCode from '../common/QRCode';
import PropTypes from 'prop-types';
import { getPrintableIdValidation } from '../../utils/childIdMapper';
import ChildActionButtonGroup from './ChildActionButtonGroup.jsx';

const RegistrationSuccessModal = ({ isOpen, onClose, childData, onPrintID }) => {
  const { toast } = useToast();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const printableValidation = getPrintableIdValidation(childData);
  
  if (!childData) return null;

  const handleSendEmail = async () => {
    if (!childData.guardianEmail) {
      toast.error('No Email Address', {
        description: 'Guardian email address is not available.'
      });
      return;
    }

    setIsSendingEmail(true);

    const loadingToastId = toast.loading('Sending QR Code Email...', {
      description: `Sending QR code to ${childData.guardianEmail}`
    });

    try {
      const response = await fetch('/api/email/send-child-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          childData: {
            firstName: childData.firstName,
            lastName: childData.lastName,
            formalId: childData.formalId,
            guardianEmail: childData.guardianEmail,
            guardianName: `${childData.guardianFirstName || ''} ${childData.guardianLastName || ''}`.trim(),
            childId: childData.child_id || childData.childId || childData.formalId // Include child ID for QR storage
          }
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.update(loadingToastId, {
          variant: 'success',
          title: 'Email Sent!',
          description: `QR code has been sent to ${childData.guardianEmail}`,
          duration: 5000
        });
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.update(loadingToastId, {
        variant: 'destructive',
        title: 'Failed to Send',
        description: 'Could not send email. Please try again later.',
        duration: 5000
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registration Successful"
      size="lg"
      variant="primary"
      closeButton={true}
      bodyScrollable={false}
    >
      <div className="p-2 sm:p-4">
        <div className="flex flex-col items-center text-center mb-4 sm:mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-nextgen-blue-dark">
            Child Registered Successfully
          </h3>
          <p className="text-gray-600 mt-1">
            {childData.firstName} {childData.lastName} has been registered with ID {childData.formalId}
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 flex items-center justify-center flex-col">
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 mb-3 sm:mb-4">
            <QRCode 
              value={childData.formalId || 'unknown-id'} 
              size={130}
              bgColor="#ffffff"
              fgColor="#30cee4"
              level="H"
              showLogo={true}
              logoSize={28}
            />
          </div>
          <p className="text-sm text-gray-500 mb-1">Child's ID: <span className="font-semibold">{childData.formalId}</span></p>
          <p className="text-sm text-gray-500">Scan this code for quick check-in</p>
        </div>
        
        <div className="mt-5 sm:mt-8 flex flex-col gap-3">
          <ChildActionButtonGroup
            primaryAction={{
              label: 'Print ID',
              onClick: onPrintID,
              disabled: !printableValidation.isValid,
              icon: (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              ),
              hoverTitle: !printableValidation.isValid ? 'Print ID unavailable' : 'Print child ID card',
              hoverDescription: !printableValidation.isValid
                ? `Missing: ${printableValidation.missingFields.join(', ')}`
                : 'Open printable ID layout for this child.',
            }}
            secondaryAction={{
              label: isSendingEmail ? 'Sending...' : 'Send QR',
              onClick: handleSendEmail,
              disabled: !childData.guardianEmail || isSendingEmail,
              loading: isSendingEmail,
              icon: (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ),
              hoverTitle: childData.guardianEmail ? 'Send QR to guardian email' : 'Email unavailable',
              hoverDescription: childData.guardianEmail
                ? `Send to ${childData.guardianEmail}`
                : 'Add a guardian email to enable this action.',
            }}
          />
          
          <Button 
            variant="outline"
            fullWidth
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

RegistrationSuccessModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  childData: PropTypes.object,
  onPrintID: PropTypes.func.isRequired
};

export default RegistrationSuccessModal;