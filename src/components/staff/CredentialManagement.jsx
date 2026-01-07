import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Card, Button } from '../ui';

const CredentialManagement = ({ staffMembers, onRefresh }) => {
  const [filter, setFilter] = useState('all'); // 'all', 'has_login', 'no_login', 'pending'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState(null);

  // Calculate credential status for each staff member
  const staffWithStatus = useMemo(() => {
    return staffMembers.map(staff => {
      let status = 'no_login';
      let statusLabel = 'No Login';
      let statusColor = 'text-red-600';
      let statusBg = 'bg-red-50';
      let statusIcon = '❌';

      if (staff.user_id) {
        if (staff.last_login_at) {
          status = 'active';
          statusLabel = 'Active';
          statusColor = 'text-green-600';
          statusBg = 'bg-green-50';
          statusIcon = '✅';
        } else if (staff.credentials_sent_at) {
          status = 'pending';
          statusLabel = 'Pending';
          statusColor = 'text-yellow-600';
          statusBg = 'bg-yellow-50';
          statusIcon = '⏳';
        } else {
          status = 'has_login';
          statusLabel = 'Has Login';
          statusColor = 'text-blue-600';
          statusBg = 'bg-blue-50';
          statusIcon = '🔑';
        }
      }

      return {
        ...staff,
        status,
        statusLabel,
        statusColor,
        statusBg,
        statusIcon
      };
    });
  }, [staffMembers]);

  // Filter and search staff
  const filteredStaff = useMemo(() => {
    let filtered = staffWithStatus;

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(staff => staff.status === filter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(staff =>
        `${staff.first_name} ${staff.last_name} ${staff.email} ${staff.role}`
          .toLowerCase()
          .includes(query)
      );
    }

    return filtered;
  }, [staffWithStatus, filter, searchQuery]);

  // Count by status
  const statusCounts = useMemo(() => {
    return {
      all: staffWithStatus.length,
      active: staffWithStatus.filter(s => s.status === 'active').length,
      pending: staffWithStatus.filter(s => s.status === 'pending').length,
      has_login: staffWithStatus.filter(s => s.status === 'has_login').length,
      no_login: staffWithStatus.filter(s => s.status === 'no_login').length
    };
  }, [staffWithStatus]);

  // Handle select/deselect all
  const handleSelectAll = () => {
    if (selectedStaff.length === filteredStaff.length) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff(filteredStaff.map(s => s.staff_id));
    }
  };

  // Handle individual selection
  const handleToggleStaff = (staffId) => {
    setSelectedStaff(prev =>
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  // Generate credentials for selected staff or all without login
  const handleGenerateCredentials = async (bulkGenerate = false) => {
    const staffIds = bulkGenerate
      ? staffWithStatus.filter(s => s.status === 'no_login').map(s => s.staff_id)
      : selectedStaff;

    if (staffIds.length === 0) {
      alert('Please select at least one staff member');
      return;
    }

    if (!confirm(`Generate and send credentials to ${staffIds.length} staff member(s)?`)) {
      return;
    }

    setIsGenerating(true);
    setResults(null);

    try {
      const response = await fetch('/api/staff/generate-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffIds, bulkGenerate })
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        setSelectedStaff([]);
        if (onRefresh) onRefresh();
      } else {
        alert(`Error: ${data.message || 'Failed to generate credentials'}`);
      }
    } catch (error) {
      console.error('Generate credentials error:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card title="Credential Management" className="mb-6">
      {/* Header Actions */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-nextgen-teal text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({statusCounts.all})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ✅ Active ({statusCounts.active})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ⏳ Pending ({statusCounts.pending})
          </button>
          <button
            onClick={() => setFilter('no_login')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'no_login'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ❌ No Login ({statusCounts.no_login})
          </button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => handleGenerateCredentials(true)}
            disabled={isGenerating || statusCounts.no_login === 0}
            variant="primary"
          >
            {isGenerating ? 'Generating...' : `Generate All (${statusCounts.no_login})`}
          </Button>
          <Button
            onClick={() => handleGenerateCredentials(false)}
            disabled={isGenerating || selectedStaff.length === 0}
            variant="secondary"
          >
            {isGenerating ? 'Generating...' : `Generate Selected (${selectedStaff.length})`}
          </Button>
        </div>
      </div>

      {/* Search Box */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nextgen-teal focus:border-transparent"
        />
      </div>

      {/* Results Display */}
      {results && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">
            Generation Results
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-700">Total Processed:</span>
              <span className="font-semibold">{results.total}</span>
            </div>
            <div className="flex justify-between text-green-700">
              <span>✅ Success:</span>
              <span className="font-semibold">{results.success.length}</span>
            </div>
            {results.failed.length > 0 && (
              <div className="flex justify-between text-red-700">
                <span>❌ Failed:</span>
                <span className="font-semibold">{results.failed.length}</span>
              </div>
            )}
          </div>
          
          {results.failed.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-red-700 font-medium">
                View Failed ({results.failed.length})
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-red-600">
                {results.failed.map((fail, idx) => (
                  <li key={idx}>
                    • {fail.name} ({fail.email}): {fail.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Staff Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="py-3 px-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedStaff.length === filteredStaff.length && filteredStaff.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                Name
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                Email
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                Role
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                Status
              </th>
              <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                Last Activity
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No staff members found
                </td>
              </tr>
            ) : (
              filteredStaff.map(staff => (
                <tr key={staff.staff_id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={selectedStaff.includes(staff.staff_id)}
                      onChange={() => handleToggleStaff(staff.staff_id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {staff.first_name} {staff.last_name}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {staff.email}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {staff.role}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${staff.statusBg} ${staff.statusColor}`}>
                      {staff.statusIcon} {staff.statusLabel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {staff.last_login_at ? (
                      <span>
                        Logged in {new Date(staff.last_login_at).toLocaleDateString()}
                      </span>
                    ) : staff.credentials_sent_at ? (
                      <span>
                        Sent {new Date(staff.credentials_sent_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">Never</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
        <p className="font-semibold mb-2">Status Guide:</p>
        <ul className="space-y-1">
          <li>✅ <strong>Active:</strong> User has logged in at least once</li>
          <li>⏳ <strong>Pending:</strong> Credentials sent but user hasn't logged in yet</li>
          <li>🔑 <strong>Has Login:</strong> User account exists but credentials never sent</li>
          <li>❌ <strong>No Login:</strong> No user account exists (needs credential generation)</li>
        </ul>
      </div>
    </Card>
  );
};

CredentialManagement.propTypes = {
  staffMembers: PropTypes.array.isRequired,
  onRefresh: PropTypes.func
};

export default CredentialManagement;
