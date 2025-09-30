import React, { useRef, useEffect } from 'react';
import QRCode from '../common/QRCode';
import PropTypes from 'prop-types';

const PrintableIDCard = ({ childData, onClose }) => {
  const idCardRef = useRef(null);
  
  useEffect(() => {
    // Auto print when component is mounted
    const timer = setTimeout(() => {
      window.print();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Function to handle manual print button
  const handlePrint = () => {
    window.print();
  };
  
  // Use BASE_URL for logo path to ensure it works in all environments
  const logoPath = `${import.meta.env.BASE_URL}NextGen-Logo.png`;

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
      <div className="flex-1 flex items-center justify-center bg-gray-100 print:bg-white p-8 print:p-0 overflow-auto">
        <div className="max-w-3xl w-full print:w-auto">
          {/* For display in browser and printing - stacked vertically */}
          <div 
            className="flex flex-col gap-8 items-center mx-auto print:scale-100 print:transform-none" 
            ref={idCardRef}
            style={{
              width: '340px', // Fixed width to maintain aspect ratio
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
            }}
          >
            {/* Front of Card */}
            <div 
              className="w-[340px] h-[216px] bg-white rounded-xl overflow-hidden shadow-lg print:shadow-none border border-gray-200 relative"
              style={{ maxWidth: '340px' }} // Enforce max width
            >
              {/* Card Header */}
              <div className="h-16 bg-gradient-to-r from-nextgen-blue to-nextgen-blue-dark flex items-center px-4">
                {/* Added white background to logo */}
                <div className="bg-white rounded-md p-1 flex items-center justify-center">
                  <img 
                    src={logoPath} 
                    alt="NextGen Logo" 
                    className="h-8"
                    onError={(e) => {
                      e.target.onerror = null; // Prevent infinite loop
                      e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><text x="10" y="30" font-family="Arial" font-size="20" fill="#30cee4">NextGen</text></svg>';
                    }}
                  />
                </div>
                <div className="ml-auto text-white text-right">
                  <div className="text-sm font-bold">NEXTGEN MINISTRY</div>
                  <div className="text-xs">CHILD ID</div>
                </div>
              </div>
              
              {/* Card Body - Simplified layout with reduced spacing */}
              <div className="p-3 flex">
                {/* Left side - Photo */}
                <div className="w-1/3 flex-shrink-0">
                  {childData.photoUrl ? (
                    <img
                      src={childData.photoUrl}
                      alt={`${childData.firstName} ${childData.lastName}`}
                      className="w-full h-32 object-cover rounded-md border border-gray-200"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentNode.innerHTML = `<div class="w-full h-32 bg-nextgen-blue/10 flex items-center justify-center rounded-md border border-gray-200">
                          <span class="text-3xl font-medium text-nextgen-blue-dark">
                            ${childData.firstName?.charAt(0) || ''}${childData.lastName?.charAt(0) || ''}
                          </span>
                        </div>`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-32 bg-nextgen-blue/10 flex items-center justify-center rounded-md border border-gray-200">
                      <span className="text-3xl font-medium text-nextgen-blue-dark">
                        {childData.firstName?.charAt(0) || ''}{childData.lastName?.charAt(0) || ''}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Right side - Simplified Details with reduced spacing */}
                <div className="w-2/3 pl-3 flex flex-col overflow-hidden">
                  <div className="text-lg font-bold text-nextgen-blue-dark truncate">
                    {childData.firstName} {childData.lastName}
                  </div>
                  <div className="text-xs text-gray-500 mb-1">ID: {childData.formalId}</div>
                  
                  {/* Simplified table with less spacing */}
                  <table className="w-full text-xs mt-1">
                    <tbody className="space-y-0">
                      <tr>
                        <td className="text-gray-500 pr-1 py-0 align-top w-20">Gender:</td>
                        <td className="py-0">{childData.gender}</td>
                      </tr>
                      <tr>
                        <td className="text-gray-500 pr-1 py-0 align-top w-20">Age Group:</td>
                        <td className="py-0">{childData.ageCategory || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="text-gray-500 pr-1 py-0 align-top w-20">Guardian:</td>
                        <td className="py-0 truncate">
                          {childData.guardianFirstName ? 
                            `${childData.guardianFirstName} ${childData.guardianLastName || ''}`.trim() : 
                            'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-gray-500 pr-1 py-0 align-top w-20">Contact:</td>
                        <td className="py-0 truncate">
                          {childData.guardianPhone || childData.guardianEmail || 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Card footer with date */}
              <div className="absolute bottom-1 right-3 text-xs text-gray-400">
                Registered: {childData.registrationDate ? new Date(childData.registrationDate).toLocaleDateString() : new Date().toLocaleDateString()}
              </div>
            </div>
            
            {/* Back of Card - Updated design */}
            <div 
              className="w-[340px] h-[216px] bg-white rounded-xl overflow-hidden shadow-lg print:shadow-none border border-gray-200 flex flex-col"
              style={{ maxWidth: '340px' }} // Enforce max width
            >          
              {/* Logo strip on top */}
              <div className="h-8 bg-nextgen-blue/10 flex items-center px-3 border-b border-nextgen-blue/10">
                <div className="bg-white rounded-md p-0.5 flex items-center justify-center">
                  <img 
                    src={logoPath} 
                    alt="NextGen Logo" 
                    className="h-4"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <div className="ml-2 text-xs font-medium text-nextgen-blue-dark">NextGen Ministry ID</div>
              </div>
              
              {/* QR Code - centered */}
              <div className="flex-1 flex items-center justify-center p-3">
                <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                  <QRCode
                    value={childData.formalId || 'unknown-id'}
                    size={120}
                    level="H"
                    fgColor="#30cee4"
                    showLogo={true}
                    logoSize={30}
                  />
                </div>
              </div>
              
              {/* Privacy notice - Updated footer */}
              <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center">
                <div className="mr-2 text-nextgen-blue flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600">
                  If found, please return to NextGen Ministry staff.
                </p>
              </div>
            </div>
          </div>
          
          {/* Print instructions - only visible in browser, hidden when printing */}
          <div className="mt-8 text-center text-sm text-gray-500 print:hidden">
            <p>Use your browser's print function or click the Print ID Card button above.</p>
            <p>For best results, print on a color printer using cardstock paper.</p>
            <p className="mt-2 text-xs text-nextgen-blue">
              <span className="bg-nextgen-blue/10 p-1 rounded">Tip: Save as PDF from the print dialog to create a digital copy</span>
            </p>
          </div>
        </div>
      </div>
      
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: portrait;
            margin: 15mm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}} />
    </div>
  );
};

PrintableIDCard.propTypes = {
  childData: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired
};

export default PrintableIDCard;