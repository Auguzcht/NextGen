import { memo } from 'react';
import { useNavigation } from '../../context/NavigationContext.jsx';

const Header = () => {
  const { openSidebar } = useNavigation();

  return (
    <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
      <button
        type="button"
        className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
        onClick={openSidebar}
      >
        <span className="sr-only">Open sidebar</span>
        <i className="ri-menu-line h-6 w-6"></i>
      </button>
    </div>
  );
};

export default memo(Header);