import { useState, useEffect } from 'react';
import supabase from '../../services/supabase.js';
import { Table, Badge, Input, Button, DateRangePickerOverlay } from '../ui';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 15;

  // Debounce search email
  useEffect(() => {
    // Don't set timer for empty strings or when explicitly clearing
    if (filters.searchEmail === '') {
      setIsSearching(false);
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

  // Reset to first page when search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.recipient_type, filters.startDate, filters.endDate, debouncedSearchEmail]);

  useEffect(() => {
    fetchLogs();
  }, [filters.status, filters.recipient_type, filters.startDate, filters.endDate, debouncedSearchEmail, currentPage]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const searchTerm = debouncedSearchEmail.trim();

      // Base query for both count and data
      let baseQuery = supabase.from('email_logs');

      // Apply filters to base query
      if (filters.status !== 'all') {
        baseQuery = baseQuery.eq('status', filters.status);
      }

      if (filters.recipient_type === 'template') {
        baseQuery = baseQuery.not('template_id', 'is', null);
      } else if (filters.recipient_type === 'custom') {
        baseQuery = baseQuery.is('template_id', null);
      }

      if (filters.startDate) {
        baseQuery = baseQuery.gte('sent_date', filters.startDate);
      }

      if (filters.endDate) {
        // Include full local day for end date against timestamp without time zone.
        baseQuery = baseQuery.lte('sent_date', `${filters.endDate}T23:59:59.999`);
      }

      if (searchTerm) {
        baseQuery = baseQuery.ilike('recipient_email', `%${searchTerm}%`);
      }

      const { count, error: countError } = await baseQuery
        .select('log_id', { count: 'exact', head: true });

      if (countError) throw countError;

      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

      // Get paginated data
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error } = await baseQuery
        .select(`
          log_id,
          template_id,
          recipient_email,
          sent_date,
          status,
          notes,
          provider_message_id,
          materials_count,
          material_ids_json,
          error_message,
          email_templates (template_name)
        `)
        .order('sent_date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching email logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Modern pagination with ellipsis (shadcn style)
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else {
        rangeWithDots.push(totalPages);
      }

      // Remove duplicates and sort
      return [...new Set(rangeWithDots)];
    };

    return (
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, totalCount)}
            </span>{' '}
            of <span className="font-medium">{totalCount}</span> results
          </p>
        </div>
        <div className="flex w-full items-center justify-between space-x-1 overflow-x-auto sm:w-auto sm:justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          
          {getVisiblePages().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-3 py-2 text-nextgen-blue-dark">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "primary" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className="min-w-[40px] px-3 py-2"
              >
                {page}
              </Button>
            )
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    );
  };

  const columns = [
    {
      header: "Date",
      cell: (row) => (
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900">
            {formatDate(row.sent_date, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="text-sm text-gray-500">
            {formatDate(row.sent_date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
      width: "280px",
      mobilePrimary: true
    },
    {
      header: "Recipient",
      cell: (row) => {
        return (
          <div className="min-w-0 space-y-1">
            <div className="text-sm font-semibold text-gray-900">Direct Email</div>
            <div className="text-sm text-gray-500 break-all" title={row.recipient_email}>
              {row.recipient_email}
            </div>
          </div>
        );
      },
      width: "260px"
    },
    {
      header: "Type",
      cell: (row) => (
        <Badge variant={row.template_id ? 'info' : 'secondary'} size="xs">
          {row.template_id ? 'Template' : 'Custom'}
        </Badge>
      ),
      width: "120px"
    },
    {
      header: "Template/Files",
      cell: (row) => {
        const materialCount = Number.isInteger(row.materials_count)
          ? row.materials_count
          : (Array.isArray(row.material_ids_json) ? row.material_ids_json.length : 0);

        return (
          <div className="space-y-1">
            <div className="min-w-0">
              {row.email_templates?.template_name ? (
                <Badge variant="secondary" size="xxs" title={row.email_templates.template_name} className="max-w-full truncate">
                  {row.email_templates.template_name.length > 18
                    ? row.email_templates.template_name.substring(0, 18) + '...'
                    : row.email_templates.template_name
                  }
                </Badge>
              ) : (
                <span className="text-gray-500 text-xs">Custom</span>
              )}
            </div>
            {materialCount > 0 && (
              <div className="text-xs text-gray-500 mt-0.5">
                Files: {materialCount}
              </div>
            )}
          </div>
        );
      },
      width: "220px"
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
      width: "120px"
    },
    {
      header: "Notes",
      cell: (row) => {
        const messageId = row.provider_message_id || null;
        const fallback = row.error_message || row.notes || '-';

        return (
          <span className="text-sm text-gray-600 truncate max-w-[180px] block" title={messageId ? `Message ID: ${messageId}` : fallback}>
            {messageId ? `Message ID: ${messageId.slice(0, 8)}...` : fallback}
          </span>
        );
      },
      width: "200px"
    }
  ];

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-nextgen-blue-dark">Email History</h3>
            <p className="mt-1 text-sm text-gray-500">
              Track all sent emails to guardians and staff members
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <motion.div 
        className="border-b border-gray-200 bg-gray-50 px-4 py-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-8">
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
            className="mb-1"
            style={{ height: '42px' }}
          />

          <Input
            type="select"
            label="Type"
            name="recipient_type"
            value={filters.recipient_type}
            onChange={(e) => setFilters({...filters, recipient_type: e.target.value})}
            options={[
              { value: 'all', label: 'All' },
              { value: 'template', label: 'Template' },
              { value: 'custom', label: 'Custom' }
            ]}
            size="sm"
            className="mb-1"
            style={{ height: '42px' }}
          />

          <div className="col-span-2 md:col-span-1 lg:col-span-2">
            <label htmlFor="email-history-date-range" className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <DateRangePickerOverlay
              id="email-history-date-range"
              value={{ from: filters.startDate, to: filters.endDate }}
              onChange={(range) =>
                setFilters({
                  ...filters,
                  startDate: range?.from || '',
                  endDate: range?.to || range?.from || '',
                })
              }
            />
          </div>

          <div className="col-span-2 lg:col-span-2">
            <Input
              label="Search Email"
              name="searchEmail"
              type="text"
              value={filters.searchEmail}
              onChange={(e) => setFilters({...filters, searchEmail: e.target.value})}
              placeholder="Search by email or name..."
              size="sm"
              className="mb-1"
              style={{ height: '42px' }}
              endIcon={isSearching ? (
                <svg className="animate-spin h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
              ) : null}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Actions</label>
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
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
              className="min-w-1"
              style={{ height: '42px', paddingLeft: '12px', paddingRight: '12px' }}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            {totalCount} log{totalCount !== 1 ? 's' : ''} total
            {logs.length > 0 && totalPages > 1 && (
              <span> • Page {currentPage} of {totalPages}</span>
            )}
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
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Table
                columns={columns}
                data={logs}
                isLoading={loading}
                mobileCollapsible
                mobileBreakpoint={768}
              />
            </motion.div>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && renderPagination()}
      </div>
    </div>
  );
};

export default EmailLogsViewer;
