import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Code128Barcode from '../common/Code128Barcode';
import { getPrintableIdValidation } from '../../utils/childIdMapper';

const PrintableIDCard = ({ childData, onClose, autoPrint = true }) => {
  const [photoFailed, setPhotoFailed] = useState(false);
  const printValidation = useMemo(() => getPrintableIdValidation(childData), [childData]);

  useEffect(() => {
    if (!printValidation.isValid) return undefined;
    if (!autoPrint) return undefined;

    const timer = setTimeout(() => {
      window.print();
    }, 400);
    
    return () => clearTimeout(timer);
  }, [autoPrint, printValidation.isValid]);
  
  // Function to handle manual print button
  const handlePrint = () => {
    if (!printValidation.isValid) return;
    window.print();
  };
  
  // Support both camelCase and snake_case field names
  const getField = (camelCase, snakeCase) => childData[camelCase] ?? childData[snakeCase];
  
  // Use BASE_URL for assets to ensure paths work in all environments.
  const templatePath = `${import.meta.env.BASE_URL}NXTGen-Child-ID-Template.png`;
  
  const firstName = getField('firstName', 'first_name') || '';
  const lastName = getField('lastName', 'last_name') || '';
  const nickname = getField('nickname', 'nickname') || '';
  const photoUrl = getField('photoUrl', 'photo_url') || '';
  const birthdate = getField('birthdate', 'birthdate');
  const ageCategory = getField('ageCategory', 'age_category') || 'N/A';
  const formalId = getField('formalId', 'formal_id') || 'N/A';
  const guardianFirstName = getField('guardianFirstName', 'guardian_first_name') || getField('guardianName', 'guardian_name')?.split(' ')[0] || '';
  const guardianLastName = getField('guardianLastName', 'guardian_last_name') || '';
  const guardianPhone = getField('guardianPhone', 'guardian_contact') || '';
  const registrationDate = getField('registrationDate', 'registration_date') || new Date().toISOString().split('T')[0];
  
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`;
  const barcodeValue = useMemo(() => formalId || 'N/A', [formalId]);
  
  const computedAge = useMemo(() => {
    if (childData.age) return childData.age;
    if (!birthdate) return 'N/A';
    const years = Math.floor((Date.now() - new Date(birthdate).getTime()) / 31557600000);
    return Number.isFinite(years) && years >= 0 ? years : 'N/A';
  }, [childData.age, birthdate]);

  useEffect(() => {
    setPhotoFailed(false);
  }, [photoUrl]);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header controls - only visible in browser, hidden when printing */}
      <div className="p-4 bg-gray-100 border-b border-gray-300 print:hidden">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-nextgen-blue-dark">Print ID Card</h1>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-nextgen-blue text-white rounded-md hover:bg-nextgen-blue-dark transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z"></path>
              </svg>
              Print ID Card
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
      
      {/* Printable content */}
      <div className="flex-1 flex items-center justify-center bg-gray-100 print:bg-white p-6 print:p-0 overflow-auto">
        <div className="w-full max-w-3xl print:max-w-none flex flex-col items-center gap-4">
          <div className="text-sm text-gray-600 print:hidden">
            CR100 single-side card (100x70mm) based on NXTGen template.
          </div>

          <div className="id-card bg-white border border-gray-300 shadow-sm print:shadow-none relative overflow-hidden">
            <img src={templatePath} alt="NXTGen ID Template" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />

            {/* Photo area - properly contained within frame */}
            <div className="absolute left-[7.35mm] top-[15.3mm] w-[32.6mm] h-[32.6mm] rounded-[4mm] overflow-hidden bg-cyan-50 flex items-center justify-center">
              {photoUrl && !photoFailed ? (
                <img
                  src={photoUrl}
                  alt={`${firstName} ${lastName}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    setPhotoFailed(true);
                  }}
                />
              ) : (
                <span className="text-xl font-bold text-nextgen-blue-dark">{initials}</span>
              )}
            </div>

            {/* Text content area */}
            <div className="absolute left-[45mm] top-[15.5mm] right-[6mm] text-gray-800">
              {/* Nickname - prominent */}
              <div className="text-[20px] font-black uppercase tracking-wide text-nextgen-blue leading-tight truncate">
                {nickname || 'N/A'}
              </div>
              
              {/* Full name */}
              <div className="mt-[1.5mm] text-[10px] font-bold text-gray-900 leading-tight truncate">
                {firstName} {lastName}
              </div>
              
              {/* Age and Age Group on same line with badge */}
              <div className="mt-[2mm] flex items-center gap-[2mm]">
                <span className="text-[9px] font-semibold text-gray-800">Age/Group: <span className="font-normal">{computedAge}</span></span>
                <span className="inline-flex px-[3mm] py-[0.5mm] bg-nextgen-blue text-white text-[7.5px] font-bold rounded-full whitespace-nowrap">
                  {ageCategory}
                </span>
              </div>
              
              {/* Guardian info */}
              <div className="mt-[2mm] space-y-[0.8mm]">
                <div className="text-[8.5px] text-gray-800">
                  <span className="font-semibold">Guardian Name:</span> {guardianFirstName} {guardianLastName}
                </div>
                {guardianPhone && (
                  <div className="text-[8.5px] text-gray-800">
                    <span className="font-semibold">Guardian Contact:</span> {guardianPhone}
                  </div>
                )}
                <div className="text-[8.5px] text-gray-800">
                  <span className="font-semibold">Registration Date:</span> {registrationDate}
                </div>
              </div>
            </div> 

            {/* Lower area: Just barcode (no duplicate CCF logo) */}
            {/* ===== BARCODE WIDTH ADJUSTMENT ===== */}
            {/* Adjust left-[Xmm] and right-[Xmm] values EQUALLY to keep centered */}
            {/* Current: left-[13mm] right-[13mm] = 74mm width */}
            {/* Now using Code128 format (30-40% more compact than Code39) */}
            {/* Examples: left-[10mm] right-[10mm] = 80mm | left-[16mm] right-[16mm] = 68mm | left-[20mm] right-[20mm] = 60mm */}
            <div className="absolute left-[13mm] right-[13mm] bottom-[1mm] flex flex-col items-center">
              <Code128Barcode value={barcodeValue} height={30} showLabel={false} barColor="#30cee4" moduleWidth={1.6} quietZone={1.7} className="custom-barcode" />
              <div className="mt-[0.8mm] text-[8.6px] text-center tracking-[0.16em] font-bold text-nextgen-blue w-full">{barcodeValue}</div>
              {/* Fine tune density with moduleWidth and quietZone for print/scanner balance */}
            </div>

            {!printValidation.isValid && (
              <div className="absolute inset-0 bg-white/95 flex items-center justify-center p-4 text-center">
                <div className="max-w-[80mm]">
                  <p className="text-[11px] font-bold text-red-700">Print ID blocked</p>
                  <p className="mt-[1mm] text-[9px] text-gray-700">
                    Missing required information: {printValidation.missingFields.join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .id-card {
          width: 100mm;
          height: 70mm;
          box-sizing: border-box;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .id-card {
            box-shadow: none !important;
            border: 1px solid #000;
          }
        }
      `}} />
    </div>
  );
};

PrintableIDCard.propTypes = {
  childData: PropTypes.object.isRequired,
  autoPrint: PropTypes.bool,
  onClose: PropTypes.func.isRequired
};

export default PrintableIDCard;