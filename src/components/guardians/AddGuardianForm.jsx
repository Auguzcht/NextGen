import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';

const AddGuardianForm = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    relationship: 'Parent',
    associatedChildren: []
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchAvailableChildren();
  }, []);

  const fetchAvailableChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select(`
          child_id,
          formal_id,
          first_name,
          last_name,
          birthdate,
          age_category_id,
          age_categories (category_name)
        `)
        .eq('is_active', true)
        .order('last_name', { ascending: true });

      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const handleChildSelection = (e) => {
    const { value, checked } = e.target;
    
    if (checked) {
      setFormData({
        ...formData,
        associatedChildren: [...formData.associatedChildren, { 
          childId: Number(value), 
          isPrimary: formData.associatedChildren.length === 0 // First child is primary by default
        }]
      });
    } else {
      const updatedChildren = formData.associatedChildren.filter(
        child => child.childId !== Number(value)
      );
      
      // Ensure at least one child is primary if we still have children
      if (updatedChildren.length > 0 && !updatedChildren.some(child => child.isPrimary)) {
        updatedChildren[0].isPrimary = true;
      }
      
      setFormData({
        ...formData,
        associatedChildren: updatedChildren
      });
    }
  };

  const handleSetPrimary = (childId) => {
    setFormData({
      ...formData,
      associatedChildren: formData.associatedChildren.map(child => ({
        ...child,
        isPrimary: child.childId === childId
      }))
    });
  };

  const validate = () => {
    const newErrors = {};
    
    // Required fields
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    
    // At least one contact method
    if (!formData.phone && !formData.email) {
      newErrors.phone = 'At least one contact method is required';
      newErrors.email = 'At least one contact method is required';
    }
    
    // Email format
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      // Insert guardian
      const { data: guardianData, error: guardianError } = await supabase
        .from('guardians')
        .insert({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phone || null,
          email: formData.email || null,
          relationship: formData.relationship
        })
        .select('guardian_id');

      if (guardianError) throw guardianError;
      
      // Insert child-guardian relationships if there are associated children
      if (formData.associatedChildren.length > 0) {
        const childGuardianData = formData.associatedChildren.map(child => ({
          child_id: child.childId,
          guardian_id: guardianData[0].guardian_id,
          is_primary: child.isPrimary
        }));
        
        const { error: relationshipError } = await supabase
          .from('child_guardian')
          .insert(childGuardianData);
          
        if (relationshipError) throw relationshipError;
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error adding guardian:', error);
      setErrors({ 
        ...errors, 
        submit: 'Failed to add guardian. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return 'N/A';
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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Add New Guardian</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Guardian Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    errors.firstName ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    errors.lastName ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`mt-1 block w-full px-3 py-2 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Relationship
                </label>
                <select
                  name="relationship"
                  value={formData.relationship}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="Parent">Parent</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Aunt/Uncle">Aunt/Uncle</option>
                  <option value="Legal Guardian">Legal Guardian</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Associated Children</h3>
            <p className="text-sm text-gray-600 mb-3">
              Select children that this guardian is responsible for. The primary guardian is the main contact for the child.
            </p>
            
            {children.length === 0 ? (
              <p className="text-gray-500 italic">No children available to associate</p>
            ) : (
              <div className="border border-gray-300 rounded-md p-3 max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Select
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Name / ID
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Age / Group
                      </th>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                        Primary
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {children.map((child) => {
                      const isSelected = formData.associatedChildren.some(
                        c => c.childId === child.child_id
                      );
                      const isPrimary = formData.associatedChildren.some(
                        c => c.childId === child.child_id && c.isPrimary
                      );
                      
                      return (
                        <tr key={child.child_id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            <input
                              type="checkbox"
                              value={child.child_id}
                              checked={isSelected}
                              onChange={handleChildSelection}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            <div className="font-medium text-gray-900">
                              {child.first_name} {child.last_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {child.formal_id || 'No ID'}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            {calculateAge(child.birthdate)} years<br />
                            <span className="text-xs">{child.age_categories?.category_name || 'N/A'}</span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                            <input
                              type="radio"
                              name="primaryChild"
                              checked={isPrimary}
                              onChange={() => handleSetPrimary(child.child_id)}
                              disabled={!isSelected}
                              className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md">
              {errors.submit}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Add Guardian'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGuardianForm;