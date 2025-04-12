import { useAuth } from '../context/AuthContext.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
import MainContentWrapper from '../components/layout/MainContentWrapper.jsx';
import { NavigationProvider } from '../context/NavigationContext.jsx';

const MainLayout = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return null; // Don't render anything if not authenticated
  }
  
  return (
    <NavigationProvider>
      <div className="flex min-h-screen bg-gray-100">
        {/* Sidebar - fixed on desktop, movable on mobile */}
        <div className="fixed inset-y-0 left-0 z-30 w-64 transition duration-300 transform md:translate-x-0">
          <Sidebar />
        </div>
        
        {/* Main Content - ensure it doesn't overlap sidebar on desktop */}
        <div className="flex flex-col flex-1 w-full min-h-screen md:pl-64">
          <Header />
          <main className="flex-1 p-4 overflow-y-auto sm:p-6 lg:p-8">
            <MainContentWrapper>
              {children}
            </MainContentWrapper>
          </main>
          <Footer />
        </div>
      </div>
    </NavigationProvider>
  );
};

export default MainLayout;