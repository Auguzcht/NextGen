import { useState } from 'react';
import supabase from '../../services/supabase.js';
import { Input, Button, Modal } from '../ui';
import { motion } from 'framer-motion';

const StaffForm = ({ onClose, onSuccess, initialData = null }) => {
  const [formData, setFormData] = useState(initialData || {
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    role: 'volunteer',
    is_active: true
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required';
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSaving(true);
    try {
      if (initialData?.staff_id) {
        // Update existing staff
        const { error } = await supabase
          .from('staff')
          .update(formData)
          .eq('staff_id', initialData.staff_id);
        
        if (error) throw error;
      } else {
        // Create new staff
        const { error } = await supabase
          .from('staff')
          .insert([formData]);
        
        if (error) throw error;
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving staff member:', error);
      alert(`Error saving staff member: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Create modal footer buttons
  const modalFooter = (
    <>
      <Button
        variant="ghost"
        onClick={onClose}
        disabled={isSaving}
        className="mr-3"
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={isSaving}
        isLoading={isSaving}
      >
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={initialData ? 'Edit Staff Member' : 'Add Staff Member'}
      footer={modalFooter}
      size="md"
      variant="primary"
    >
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-6 gap-6">
          <div className="col-span-6 sm:col-span-3">
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">First name</label>
            <Input
              type="text"
              name="first_name"
              id="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              error={errors.first_name}
              fullWidth
            />
          </div>

          <div className="col-span-6 sm:col-span-3">
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">Last name</label>
            <Input
              type="text"
              name="last_name"
              id="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              error={errors.last_name}
              fullWidth
            />
          </div>

          <div className="col-span-6 sm:col-span-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <Input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleInputChange}
              error={errors.email}
              fullWidth
            />
          </div>

          <div className="col-span-6 sm:col-span-4">
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">Phone number</label>
            <Input
              type="tel"
              name="phone_number"
              id="phone_number"
              value={formData.phone_number || ''}
              onChange={handleInputChange}
              fullWidth
            />
          </div>

          <div className="col-span-6 sm:col-span-3">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-nextgen-blue focus:border-nextgen-blue sm:text-sm"
            >
              <option value="volunteer">Volunteer</option>
              <option value="teacher">Teacher</option>
              <option value="coordinator">Coordinator</option>
              <option value="administrator">Administrator</option>
            </select>
          </div>

          <div className="col-span-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="focus:ring-nextgen-blue h-4 w-4 text-nextgen-blue border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="is_active" className="font-medium text-gray-700">Active</label>
                <p className="text-gray-500">Inactive staff members cannot log in or be assigned to services.</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default StaffForm;