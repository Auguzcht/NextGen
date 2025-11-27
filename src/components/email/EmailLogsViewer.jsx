import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import { Table, Badge, Input, Button } from '../ui';
import { formatDate } from '../../utils/dateUtils.js';
import { motion } from 'framer-motion';

const EmailLogsViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    recipient_type: 'all',
    startDate: '',
    endDate: '',
    searchEmail: ''
  });
  const [debouncedSearchEmail, setDebouncedSearchEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search email
  useEffect(() => {
    // Don't set timer for empty strings or when explicitly clearing
    if (filters.searchEmail === '') {
      setDebouncedSearchEmail('');
      return;
    }
    
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchEmail(filters.searchEmail);
      setIsSearching(false);
    }, 300); // 300ms delay
    
    return () => clearTimeout(timer);
  }, [filters.searchEmail]);

  useEffect(() => {
    fetchLogs();
  }, [filters.status, filters.recipient_type, filters.startDate, filters.endDate, debouncedSearchEmail]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('email_logs')
        .select(`
          *,
          email_templates (template_name),
          guardians (first_name, last_name),
          staff (first_name, last_name, role)
        `)
        .order('sent_date', { ascending: false })
        .limit(200);

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.recipient_type === 'guardians') {
        query = query.not('guardian_id', 'is', null);
      } else if (filters.recipient_type === 'staff') {
        query = query.not('staff_id', 'is', null);
      }

      if (filters.startDate) {
        query = query.gte('sent_date', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('sent_date', filters.endDate);
      }

      if (debouncedSearchEmail) {
        query = query.ilike('recipient_email', `%${debouncedSearchEmail}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching email logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: "Date",
      cell: (row) => (
        <div className="text-xs">
          <div className="font-medium text-gray-900">
            {formatDate(row.sent_date, { month: 'short', day: 'numeric' })}
          </div>
          <div className="text-gray-500">
            {formatDate(row.sent_date, { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
      width: "80px"
    },
    {
      header: "Recipient",
      cell: (row) => {
        const isGuardian = row.guardian_id && row.guardians;
        const isStaff = row.staff_id && row.staff;
        
        return (
          <div className="min-w-0">
            <div className="flex items-center space-x-1">
              {isGuardian && (
                <>
                  <Badge variant="info" size="xxs">G</Badge>
                  <span className="text-xs font-medium text-gray-900 truncate">
                    {row.guardians.first_name} {row.guardians.last_name}
                  </span>
                </>
              )}
              {isStaff && (
                <>
                  <Badge variant="warning" size="xxs">S</Badge>
                  <span className="text-xs font-medium text-gray-900 truncate">
                    {row.staff.first_name} {row.staff.last_name}
                  </span>
                </>
              )}
              {!isGuardian && !isStaff && (
                <span className="text-xs font-medium text-gray-900">Unknown</span>
              )}
            </div>
            <div className="text-xs text-gray-500 truncate" title={row.recipient_email}>
              {row.recipient_email}
            </div>
          </div>
        );
      },
      width: "140px"
    },
    {
      header: "Subject",
      cell: (row) => (
        <div className="text-xs text-gray-900 truncate max-w-[120px]" title={row.subject || 'No subject'}>
          {row.subject || '-'}
        </div>
      ),
      width: "120px"
    },
    {
      header: "Template/Files",
      cell: (row) => {
        const materialIds = row.material_ids ? JSON.parse(row.material_ids) : [];
        return (
          <div className="text-xs">
            <div>
              {row.email_templates?.template_name ? (
                <Badge variant="secondary" size="xxs" title={row.email_templates.template_name}>
                  {row.email_templates.template_name.length > 8 
                    ? row.email_templates.template_name.substring(0, 8) + '...' 
                    : row.email_templates.template_name
                  }
                </Badge>
              ) : (
                <span className="text-gray-500 text-xs">Custom</span>
              )}
            </div>
            {materialIds.length > 0 && (
              <div className="text-xs text-gray-500 mt-0.5">
                📎 {materialIds.length}
              </div>
            )}
          </div>
        );
      },
      width: "90px"
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge
          variant={
            row.status === 'sent' ? 'success' :
            row.status === 'pending' ? 'warning' :
            row.status === 'failed' ? 'danger' : 'secondary'
          }
          size="xs"
        >
          {row.status}
        </Badge>
      ),
      width: "70px"
    },
    {
      header: "Notes",
      cell: (row) => (
        <span className="text-xs text-gray-600 truncate max-w-[100px] block" title={row.notes || ''}>
          {row.notes || '-'}
        </span>
      ),
      width: "100px"
    }
  ];

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-nextgen-blue-dark">Email History</h3>
            <p className="mt-1 text-sm text-gray-500">
              Track all sent emails to guardians and staff members
            </p>
          </div>
          <Badge variant="info" size="sm">
            {logs.length} Log{logs.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <motion.div 
        className="border-b border-gray-200 bg-gray-50 px-4 py-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Input
            type="select"
            label="Status"
            name="status"
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            options={[
              { value: 'all', label: 'All' },
              { value: 'sent', label: 'Sent' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' }
            ]}
            size="sm"
          />

          <Input
            type="select"
            label="Type"
            name="recipient_type"
            value={filters.recipient_type}
            onChange={(e) => setFilters({...filters, recipient_type: e.target.value})}
            options={[
              { value: 'all', label: 'All' },
              { value: 'guardians', label: 'Guardians' },
              { value: 'staff', label: 'Staff' }
            ]}
            size="sm"
          />

          <Input
            type="date"
            label="Start"
            name="startDate"
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            size="sm"
          />

          <Input
            type="date"
            label="End"
            name="endDate"
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            size="sm"
          />

          <div className="col-span-2 lg:col-span-1">
            <Input
              label="Search"
              name="searchEmail"
              type="text"
              value={filters.searchEmail}
              onChange={(e) => setFilters({...filters, searchEmail: e.target.value})}
              placeholder="email..."
              size="sm"
              endIcon={isSearching ? (
                <svg className="animate-spin h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              ) : null}
            />
          </div>

          <div className="lg:col-span-1 flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFilters({
                status: 'all',
                recipient_type: 'all',
                startDate: '',
                endDate: '',
                searchEmail: ''
              })}
              className="w-full"
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {logs.length} log{logs.length !== 1 ? 's' : ''}
          </p>
        </div>
      </motion.div>

      {/* Table */}
      <div className="px-4 py-3">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nextgen-blue"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="mx-auto h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No email logs found</h3>
            <p className="mt-1 text-xs text-gray-500">
              No emails have been sent yet or match your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
            <Table
              columns={columns}
              data={logs}
              loading={loading}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailLogsViewer;
