import { memo } from 'react';

const MainContentWrapper = ({ children }) => {
  return (
    <main className="flex-1 p-4 md:p-6">
      {children}
    </main>
  );
};

export default memo(MainContentWrapper);