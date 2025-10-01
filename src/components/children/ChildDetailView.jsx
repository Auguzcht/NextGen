import { useState, useEffect } from 'react';
import { Modal, Badge, Button } from '../ui';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from '../common/QRCode';
import PrintableIDCard from './PrintableIDCard';

const ChildDetailView = ({ child, isOpen, onClose }) => {
  const [showPrintableID, setShowPrintableID] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  // Auto transition timer
  useEffect(() => {
    if (!isOpen) return;
    
    const interval = setInterval(() => {
      setShowQR(prev => !prev);
    }, 5000); // Switch every 5 seconds
    
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!child) return null;

  const getPrimaryGuardian = (childGuardians) => {
    if (!childGuardians || childGuardians.length === 0) return null;
    const primaryGuardian = childGuardians.find(cg => cg.is_primary) || childGuardians[0];
    return primaryGuardian.guardians;
  };

  const calculateAge = (birthdate) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Format child data for the ID card
  const formatChildDataForID = () => {
    const primaryGuardian = getPrimaryGuardian(child.child_guardian);
    
    return {
      firstName: child.first_name,
      lastName: child.last_name,
      middleName: child.middle_name || '',
      formalId: child.formal_id || 'N/A',
      gender: child.gender,
      birthdate: child.birthdate,
      age: calculateAge(child.birthdate),
      ageCategory: child.age_categories?.category_name || 'N/A',
      guardianFirstName: primaryGuardian?.first_name || '',
      guardianLastName: primaryGuardian?.last_name || '',
      guardianPhone: primaryGuardian?.phone_number || '',
      guardianEmail: primaryGuardian?.email || '',
      photoUrl: child.photo_url || '',
      registrationDate: child.registration_date
    };
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Child Details"
        variant='primary'
        size="xl"
      >
        <div className="grid grid-cols-3 gap-6 p-6">
          {/* Left Column - Photo with auto QR transition */}
          <div className="col-span-1">
            <div className="border-gray-200 p-4 shadow-sm rounded-lg hover:shadow-md transition-shadow duration-300">
              {/* Container with consistent height */}
              <div className="relative aspect-square overflow-hidden rounded-lg">
                {/* Progress bar indicator for transition */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 z-10">
                  <motion.div 
                    className="h-full bg-nextgen-blue"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ 
                      duration: 5, 
                      ease: "linear",
                      repeat: Infinity,
                      repeatType: "loop"
                    }}
                  />
                </div>
                
                {/* Content that transitions */}
                <AnimatePresence mode="wait">
                  {showQR ? (
                    <motion.div 
                      key="qr-code"
                      className="absolute inset-0 flex flex-col items-center justify-center bg-white"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      {child.formal_id ? (
                        <>
                          <div className="flex items-center justify-center w-full h-full">
                            <div className="bg-white p-3 rounded-lg shadow-sm border border-nextgen-blue/10 flex items-center justify-center">
                              {/* Reduced size further for better fit */}
                              <QRCode 
                                value={child.formal_id} 
                                size={80}
                                level="H"
                                fgColor="#30cee4"
                                showLogo={true}
                                logoSize={20}
                                className="mx-auto" // Ensure centering
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full w-full">
                          <div className="bg-gray-50 rounded-lg p-6 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            <span className="text-gray-400 text-sm block">No ID assigned</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="child-photo"
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      {child.photo_url ? (
                        <img
                          src={child.photo_url}
                          alt={`${child.first_name} ${child.last_name}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full bg-nextgen-blue/10 flex items-center justify-center">
                          <span className="text-4xl font-medium text-nextgen-blue-dark">
                            {child.first_name?.charAt(0)}{child.last_name?.charAt(0)}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="mt-4 text-center">
                <h3 className="text-lg font-bold text-nextgen-blue-dark mb-3">
                  {child.first_name} {child.middle_name} {child.last_name}
                </h3>
                {/* Fixed button with flex layout to ensure icon and text stay on same line */}
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => setShowPrintableID(true)}
                  disabled={!child.formal_id}
                  fullWidth
                  className="flex items-center justify-center"
                >
                  <div className="flex items-center whitespace-nowrap">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Print ID</span>
                  </div>
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="col-span-2 space-y-6">
            {/* Basic Information Box */}
            <motion.div 
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
              whileHover={{ boxShadow: '0 4px 12px rgba(48, 206, 228, 0.1)' }}
              transition={{ duration: 0.3 }}
            >
              <h4 className="text-lg font-medium text-nextgen-blue-dark mb-4">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Age</p>
                  <p className="mt-1 text-gray-900">{calculateAge(child.birthdate)} years old</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Gender</p>
                  <p className="mt-1 text-gray-900">{child.gender}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Age Group</p>
                  <Badge variant="primary" size="sm">
                    {child.age_categories?.category_name || 'Unknown'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge variant={child.is_active ? "success" : "danger"} size="sm">
                    {child.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Registration Date</p>
                  <p className="mt-1 text-gray-900">
                    {child.registration_date 
                      ? new Date(child.registration_date).toLocaleDateString() 
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Formal ID</p>
                  <p className="mt-1 text-gray-900 flex items-center">
                    <span className="font-medium text-nextgen-blue-dark">{child.formal_id || 'Not assigned'}</span>
                  </p>
                </div>
              </div>

              {/* Additional notes */}
              {child.notes && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="mt-1 text-gray-900 text-sm">{child.notes}</p>
                </div>
              )}
            </motion.div>

            {/* Guardian Information Box */}
            {child.child_guardian && (
              <motion.div 
                className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
                whileHover={{ boxShadow: '0 4px 12px rgba(48, 206, 228, 0.1)' }}
                transition={{ duration: 0.3 }}
              >
                <h4 className="text-lg font-medium text-nextgen-blue-dark mb-4">Guardian Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {getPrimaryGuardian(child.child_guardian) && (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            {getPrimaryGuardian(child.child_guardian).first_name} {getPrimaryGuardian(child.child_guardian).last_name}
                          </p>
                          <p className="text-sm text-gray-500">{getPrimaryGuardian(child.child_guardian).relationship || 'Guardian'}</p>
                        </div>
                        <Badge variant="success" size="sm">Primary</Badge>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {getPrimaryGuardian(child.child_guardian).phone_number && (
                          <p className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {getPrimaryGuardian(child.child_guardian).phone_number}
                          </p>
                        )}
                        {getPrimaryGuardian(child.child_guardian).email && (
                          <p className="flex items-center gap-2 mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {getPrimaryGuardian(child.child_guardian).email}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </Modal>

      {/* Printable ID Card Modal */}
      {showPrintableID && (
        <PrintableIDCard 
          childData={formatChildDataForID()}
          onClose={() => setShowPrintableID(false)}
        />
      )}
    </>
  );
};

export default ChildDetailView;