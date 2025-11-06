import { memo } from 'react';
import PropTypes from 'prop-types';
import { CURRENT_VERSION } from '../../utils/changelog';

const Footer = ({ onVersionClick }) => {
  return (
    <footer className="mt-auto py-3 px-4 md:px-6 text-center text-sm text-gray-500">
      <p>
        © {new Date().getFullYear()} NextGen Ministry Management · 
        <button
          onClick={onVersionClick}
          className="font-medium text-nextgen-blue hover:text-nextgen-blue-dark transition-colors ml-1 hover:underline cursor-pointer"
          title="View changelog"
        >
          v{CURRENT_VERSION}
        </button>
      </p>
    </footer>
  );
};

Footer.propTypes = {
  onVersionClick: PropTypes.func
};

export default memo(Footer);