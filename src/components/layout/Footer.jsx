import { memo } from 'react';

const Footer = () => {
  return (
    <footer className="mt-auto py-3 px-4 md:px-6 text-center text-sm text-gray-500">
      <p>© {new Date().getFullYear()} NextGen Ministry Management</p>
    </footer>
  );
};

export default memo(Footer);