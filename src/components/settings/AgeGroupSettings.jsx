import { useState } from 'react';
import supabase from '../../services/supabase.js';

const AgeGroupSettings = ({ ageCategories, onUpdate, loading }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [newCategory, setNewCategory] = useState({
    category_name: '',
    min_age: 0,
    max_age: 1,
    color_code: '#3B82F6',
    description: ''
  });
  const [editingCategory, setEditingCategory] = useState(null);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    
    if (!newCategory.category_name || newCategory.min_age === undefined || newCategory.max_age === undefined) {
      alert('Category name, minimum and maximum ages are required');
      return;
    }
    
    if (newCategory.min_age > newCategory.max_age) {
      alert('Minimum age cannot be greater than maximum age');
      return;
    }
    
    setSavingId('new');
    try {
      const { error } = await supabase
        .from('age_categories')
        .insert([newCategory]);
        
      if (error) throw error;
      
      setNewCategory({
        category_name: '',
        min_age: 0,
        max_age: 1,
        color_code: '#3B82F6',
        description: ''
      });
      setIsAdding(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding age category:', error);
      alert(`Error adding age category: ${error.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateCategory = async (category) => {
    if (category.min_age > category.max_age) {
      alert('Minimum age cannot be greater than maximum age');
      return;
    }
    
    setSavingId(category.category_id);
    try {
      const { error } = await supabase
        .from('age_categories')
        .update(category)
        .eq('category_id', category.category_id);
        
      if (error) throw error;
      
      setEditingCategory(null);
      onUpdate();
    } catch (error) {
      console.error('Error updating age category:', error);
      alert(`Error updating age category: ${error.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this age category? This may affect children records.')) {
      return;
    }
    
    setSavingId(categoryId);
    try {
      const { error } = await supabase
        .from('age_categories')
        .delete()
        .eq('category_id', categoryId);
        
      if (error) throw error;
      
      onUpdate();
    } catch (error) {
      console.error('Error deleting age category:', error);
      alert(`Error deleting age category: ${error.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const toggleEdit = (category) => {
    if (editingCategory && editingCategory.category_id === category.category_id) {
      setEditingCategory(null); // Cancel editing
    } else {
      setEditingCategory({ ...category });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">
          Configure age groups for children classification.
        </p>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
        >
          {isAdding ? 'Cancel' : 'Add Age Group'}
        </button>
      </div>
      
      {isAdding && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 animate-in fade-in duration-300">
          <h3 className="text-lg font-medium mb-4">Add New Age Group</h3>
          <form onSubmit={handleAddCategory} className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name*
              </label>
              <input
                type="text"
                value={newCategory.category_name}
                onChange={(e) => setNewCategory({...newCategory, category_name: e.target.value})}
                placeholder="e.g., Toddlers, Elementary, etc."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Age (Years)*
              </label>
              <input
                type="number"
                min="0"
                max="18"
                value={newCategory.min_age}
                onChange={(e) => setNewCategory({...newCategory, min_age: parseInt(e.target.value)})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Age (Years)*
              </label>
              <input
                type="number"
                min="1"
                max="18"
                value={newCategory.max_age}
                onChange={(e) => setNewCategory({...newCategory, max_age: parseInt(e.target.value)})}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color Code
              </label>
              <input
                type="color"
                value={newCategory.color_code}
                onChange={(e) => setNewCategory({...newCategory, color_code: e.target.value})}
                className="h-10 w-full rounded-md border border-gray-300 cursor-pointer"
              />
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={newCategory.description || ''}
                onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                rows={3}
                placeholder="Brief description of this age group"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              ></textarea>
            </div>
            
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={savingId === 'new'}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {savingId === 'new' ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save Age Group'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Age Range
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Color
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ageCategories.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                  No age groups configured yet
                </td>
              </tr>
            ) : (
              ageCategories.map((category) => (
                <tr key={category.category_id} className={editingCategory?.category_id === category.category_id ? 'bg-indigo-50' : ''}>
                  {editingCategory?.category_id === category.category_id ? (
                    <td colSpan="5" className="px-6 py-4">
                      <form onSubmit={(e) => { e.preventDefault(); handleUpdateCategory(editingCategory); }} className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-4">
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category Name*
                          </label>
                          <input
                            type="text"
                            value={editingCategory.category_name}
                            onChange={(e) => setEditingCategory({...editingCategory, category_name: e.target.value})}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Minimum Age (Years)*
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="18"
                            value={editingCategory.min_age}
                            onChange={(e) => setEditingCategory({...editingCategory, min_age: parseInt(e.target.value)})}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Maximum Age (Years)*
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="18"
                            value={editingCategory.max_age}
                            onChange={(e) => setEditingCategory({...editingCategory, max_age: parseInt(e.target.value)})}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Color Code
                          </label>
                          <input
                            type="color"
                            value={editingCategory.color_code || '#3B82F6'}
                            onChange={(e) => setEditingCategory({...editingCategory, color_code: e.target.value})}
                            className="h-10 w-full rounded-md border border-gray-300 cursor-pointer"
                          />
                        </div>
                        
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={editingCategory.description || ''}
                            onChange={(e) => setEditingCategory({...editingCategory, description: e.target.value})}
                            rows={3}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          ></textarea>
                        </div>
                        
                        <div className="sm:col-span-2 flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setEditingCategory(null)}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingId === category.category_id}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            {savingId === category.category_id ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                              </span>
                            ) : (
                              'Save Changes'
                            )}
                          </button>
                        </div>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {category.category_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {category.min_age} - {category.max_age} years
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div 
                            className="h-4 w-4 rounded-full mr-2" 
                            style={{ backgroundColor: category.color_code || '#3B82F6' }}
                          ></div>
                          {category.color_code || 'Not set'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {category.description || 'No description'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => toggleEdit(category)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          disabled={savingId === category.category_id}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.category_id)}
                          className="text-red-600 hover:text-red-900"
                          disabled={savingId === category.category_id}
                        >
                          {savingId === category.category_id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AgeGroupSettings;