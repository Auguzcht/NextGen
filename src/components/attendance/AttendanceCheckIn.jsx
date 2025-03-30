import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';

const AttendanceCheckIn = ({ selectedService, onCheckIn, disabled }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.trim() && selectedService) {
      const timer = setTimeout(() => {
        searchChildren();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, selectedService]);

  const searchChildren = async () => {
    if (!searchQuery.trim() || !selectedService) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('children')
        .select(`
          *,
          age_categories (category_name)
        `)
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,formal_id.ilike.%${searchQuery}%`)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;
      
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthdate) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <div>
      <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-1">
        Check In Child
      </label>
      <div className="relative">
        <input
          id="search-input"
          type="text"
          placeholder="Search by name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={disabled}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="absolute right-3 top-2.5 text-gray-400">
          {loading ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
      
      {searchResults.length > 0 && (
        <div className="mt-2 bg-white border border-gray-300 rounded-md shadow-sm max-h-64 overflow-y-auto">
          <ul className="divide-y divide-gray-200">
            {searchResults.map((child) => (
              <li key={child.child_id} className="p-3 hover:bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">
                      {child.first_name} {child.last_name} 
                      <span className="ml-2 text-sm text-gray-500">({child.formal_id || 'No ID'})</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      {calculateAge(child.birthdate)} years old • {child.age_categories?.category_name || 'No category'}
                    </p>
                  </div>
                  <button
                    onClick={() => onCheckIn(child.child_id)}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    Check In
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AttendanceCheckIn;