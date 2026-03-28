import { useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import JsBarcode from 'jsbarcode';

function sanitizeForCode128(value) {
  return String(value ?? '')
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code <= 126 ? char : '?';
    })
    .join('');
}

const Code128Barcode = ({
  value,
  height = 40,
  showLabel = true,
  className = '',
  barColor = '#0066CC',
  moduleWidth = 0.8,
  quietZone = 2,
}) => {
  const svgRef = useRef(null);
  const encoded = useMemo(() => sanitizeForCode128(value), [value]);

  useEffect(() => {
    if (!svgRef.current) return;

    JsBarcode(svgRef.current, encoded || 'N/A', {
      format: 'CODE128',
      width: moduleWidth,
      height,
      margin: quietZone,
      displayValue: false,
      lineColor: barColor,
      background: '#ffffff',
      flat: true,
      valid: () => {},
    });
  }, [encoded, height, moduleWidth, quietZone, barColor]);

  return (
    <div className={className}>
      <div className="flex justify-center">
        <svg
          ref={svgRef}
          role="img"
          aria-label={`Code128 barcode for ${encoded}`}
          className="max-w-full"
          style={{ shapeRendering: 'crispEdges' }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-center text-[10px] tracking-[0.15em] text-gray-700">{encoded}</div>
      )}
    </div>
  );
};

Code128Barcode.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  height: PropTypes.number,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
  barColor: PropTypes.string,
  moduleWidth: PropTypes.number,
  quietZone: PropTypes.number,
};

export default Code128Barcode;
