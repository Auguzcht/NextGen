import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button, Modal } from '../ui';
import QRCode from '../common/QRCode';
import PropTypes from 'prop-types';
import Swal from 'sweetalert2';

const RegistrationSuccessModal = ({ isOpen, onClose, childData, onPrintID }) => {
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  if (!childData) return null;

  const handleSendEmail = async () => {
    if (!childData.guardianEmail) {
      await Swal.fire({
        icon: 'error',
        title: 'No Email Address',
        text: 'Guardian email address is not available.',
        confirmButtonColor: '#30CEE4',
        customClass: {
          container: 'swal-high-z-index'
        }
      });
      return;
    }

    setIsSendingEmail(true);

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
            guardianName: `${childData.guardianFirstName || ''} ${childData.guardianLastName || ''}`.trim()
          }
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Email Sent!',
          text: `QR code has been sent to ${childData.guardianEmail}`,
          confirmButtonColor: '#30CEE4',
          customClass: {
            container: 'swal-high-z-index'
          }
        });
      } else {
        throw new Error(result.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Failed to Send',
        text: 'Could not send email. Please try again later.',
        confirmButtonColor: '#30CEE4',
        customClass: {
          container: 'swal-high-z-index'
        }
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
    >
      <div className="p-4">
        <div className="flex flex-col items-center text-center mb-6">
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
        
        <div className="bg-gray-50 rounded-lg p-6 flex items-center justify-center flex-col">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
            <QRCode 
              value={childData.formalId || 'unknown-id'} 
              size={150}
              bgColor="#ffffff"
              fgColor="#30cee4"
              level="H"
              showLogo={true}
              logoSize={35}
            />
          </div>
          <p className="text-sm text-gray-500 mb-1">Child's ID: <span className="font-semibold">{childData.formalId}</span></p>
          <p className="text-sm text-gray-500">Scan this code for quick check-in</p>
        </div>
        
        <div className="mt-8 flex flex-col gap-3">
          <Button 
            variant="primary"
            fullWidth
            onClick={onPrintID}
            icon={
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
              </svg>
            }
          >
            Print ID Card
          </Button>
          
          <Button 
            variant="secondary"
            fullWidth
            onClick={handleSendEmail}
            disabled={isSendingEmail || !childData.guardianEmail}
            icon={
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
            }
          >
            {isSendingEmail ? (
              <span className="flex items-center justify-center">
                Sending
                <svg className="animate-spin ml-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </span>
            ) : (
              'Send QR to Email'
            )}
          </Button>
          
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