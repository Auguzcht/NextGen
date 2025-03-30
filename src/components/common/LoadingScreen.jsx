import { useEffect, useState } from 'react';

const LoadingScreen = () => {
  const [loadingText, setLoadingText] = useState('Loading');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingText(prevText => {
        if (prevText === 'Loading...') return 'Loading';
        return prevText + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-600 to-purple-800 flex flex-col items-center justify-center text-white z-50">
      <img 
        src="/src/assets/NextGen-Logo.png" 
        alt="NextGen Ministry" 
        className="w-40 h-40 animate-pulse mb-8" 
      />
      
      <div className="relative">
        <div className="h-2 w-64 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-400 rounded-full animate-[loader_2s_ease-in-out_infinite]"></div>
        </div>
      </div>
      
      <p className="mt-6 text-xl font-medium">{loadingText}</p>
      <p className="mt-2 text-indigo-200">NextGen Ministry Management</p>
    </div>
  );
};

export default LoadingScreen;