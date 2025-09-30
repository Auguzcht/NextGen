import React from 'react';
import ReactQRCode from 'react-qr-code';
import PropTypes from 'prop-types';

const QRCode = ({ 
  value, 
  size = 128, 
  bgColor = '#ffffff', 
  fgColor = '#30cee4', 
  level = 'H', 
  className = '',
  showLogo = false,
  logoSize = 24
}) => {
  // Determine the NextGen logo path
  const logoPath = `${import.meta.env.BASE_URL}NextGen-Logo.png`;

  // Make sure level is H (high) when using logo to ensure best scanning capability
  const correctionLevel = showLogo ? 'H' : level;
  
  // Calculate optimal logo size (typically 20-25% of QR code size)
  const optimalLogoSize = Math.round(size * 0.22);
  const actualLogoSize = logoSize || optimalLogoSize;

  return (
    <div className={`flex items-center justify-center ${className} relative`}>
      <ReactQRCode 
        value={value} 
        size={size} 
        bgColor={bgColor}
        fgColor={fgColor}
        level={correctionLevel}
      />
      
      {showLogo && (
        <div 
          className="absolute flex items-center justify-center"
          style={{
            width: `${actualLogoSize}px`,
            height: `${actualLogoSize}px`,
            backgroundColor: bgColor,
            borderRadius: '4px'
          }}
        >
          <img 
            src={logoPath}
            alt="NextGen Logo"
            className="w-full h-full object-contain p-1"
            onError={(e) => {
              console.error("QR code logo failed to load", e);
              e.target.style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
};

QRCode.propTypes = {
  value: PropTypes.string.isRequired,
  size: PropTypes.number,
  bgColor: PropTypes.string,
  fgColor: PropTypes.string,
  level: PropTypes.oneOf(['L', 'M', 'Q', 'H']),
  className: PropTypes.string,
  showLogo: PropTypes.bool,
  logoSize: PropTypes.number
};

export default QRCode;