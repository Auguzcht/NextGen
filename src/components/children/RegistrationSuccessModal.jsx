import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Button, Modal } from '../ui';
import QRCode from '../common/QRCode';
import PropTypes from 'prop-types';

const RegistrationSuccessModal = ({ isOpen, onClose, childData, onPrintID }) => {
  if (!childData) return null;

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