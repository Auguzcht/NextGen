import { memo } from 'react';
import { useNavigation } from '../../context/NavigationContext.jsx';

const MainContentWrapper = ({ children }) => {
  const { sidebarOpen } = useNavigation();
  
  return (
    <main className="flex-1 p-4 md:p-6 overflow-x-auto">
      <div className="w-full max-w-full">
        {children}
      </div>
    </main>
  );
};

export default memo(MainContentWrapper);