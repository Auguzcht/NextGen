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

  useEffect(() => {
    fetchLogs();
  }, [filters]);

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

      if (filters.searchEmail) {
        query = query.ilike('recipient_email', `%${filters.searchEmail}%`);
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
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {formatDate(row.sent_date, { month: 'short', day: 'numeric' })}
          </div>
          <div className="text-gray-500">
            {formatDate(row.sent_date, { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
      width: "130px"
    },
    {
      header: "Recipient",
      cell: (row) => {
        const isGuardian = row.guardian_id && row.guardians;
        const isStaff = row.staff_id && row.staff;
        
        return (
          <div>
            <div className="flex items-center space-x-2">
              {isGuardian && (
                <>
                  <Badge variant="info" size="xs">Guardian</Badge>
                  <span className="text-sm font-medium text-gray-900">
                    {row.guardians.first_name} {row.guardians.last_name}
                  </span>
                </>
              )}
              {isStaff && (
                <>
                  <Badge variant="warning" size="xs">Staff</Badge>
                  <span className="text-sm font-medium text-gray-900">
                    {row.staff.first_name} {row.staff.last_name}
                  </span>
                </>
              )}
              {!isGuardian && !isStaff && (
                <span className="text-sm font-medium text-gray-900">Unknown</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">{row.recipient_email}</div>
            {isStaff && row.staff.role && (
              <div className="text-xs text-gray-400 mt-0.5">{row.staff.role}</div>
            )}
          </div>
        );
      },
      width: "280px"
    },
    {
      header: "Subject",
      cell: (row) => (
        <div className="text-sm text-gray-900 truncate max-w-xs" title={row.subject || 'No subject'}>
          {row.subject || '-'}
        </div>
      ),
      width: "250px"
    },
    {
      header: "Template",
      cell: (row) => (
        <div className="text-sm">
          {row.email_templates?.template_name ? (
            <Badge variant="secondary" size="sm">
              {row.email_templates.template_name}
            </Badge>
          ) : (
            <span className="text-gray-500 text-xs">Custom</span>
          )}
        </div>
      ),
      width: "150px"
    },
    {
      header: "Attachments",
      cell: (row) => {
        const materialIds = row.material_ids ? JSON.parse(row.material_ids) : [];
        return (
          <div className="text-sm">
            {materialIds.length > 0 ? (
              <Badge variant="primary" size="sm">
                {materialIds.length} file{materialIds.length !== 1 ? 's' : ''}
              </Badge>
            ) : (
              <span className="text-gray-400 text-xs">-</span>
            )}
          </div>
        );
      },
      width: "120px"
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
          size="sm"
        >
          {row.status}
        </Badge>
      ),
      width: "100px"
    },
    {
      header: "Notes",
      cell: (row) => (
        <span className="text-xs text-gray-600 truncate max-w-xs block" title={row.notes || ''}>
          {row.notes || '-'}
        </span>
      )
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
        className="border-b border-gray-200 bg-gray-50 px-6 py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          />

          <Input
            type="select"
            label="Recipient Type"
            name="recipient_type"
            value={filters.recipient_type}
            onChange={(e) => setFilters({...filters, recipient_type: e.target.value})}
            options={[
              { value: 'all', label: 'All' },
              { value: 'guardians', label: 'Guardians' },
              { value: 'staff', label: 'Staff' }
            ]}
          />

          <Input
            type="date"
            label="Start Date"
            name="startDate"
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
          />

          <Input
            type="date"
            label="End Date"
            name="endDate"
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
          />

          <Input
            label="Search Email"
            name="searchEmail"
            type="text"
            value={filters.searchEmail}
            onChange={(e) => setFilters({...filters, searchEmail: e.target.value})}
            placeholder="email@example.com"
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {logs.length} email log{logs.length !== 1 ? 's' : ''}
          </p>
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
          >
            Clear Filters
          </Button>
        </div>
      </motion.div>

      {/* Table */}
      <div className="px-6 py-5">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-blue"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
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
            <p className="mt-1 text-sm text-gray-500">
              No emails have been sent yet or match your filters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden border border-gray-200 rounded-lg shadow">
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
