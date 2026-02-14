import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import supabase from '../../services/supabase.js';
import { formatDate } from '../../utils/dateUtils.js';
import { Table, Button, Card, useToast } from '../ui';

const WeeklyReportsList = ({ onGenerateReport, triggerRefresh }) => {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const reportsPerPage = 8;

  // Add triggerRefresh to dependencies to refresh when reports are generated
  useEffect(() => {
    fetchReports();
  }, [currentPage, triggerRefresh]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Count total reports
      const { count, error: countError } = await supabase
        .from('weekly_reports')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      setTotalReports(count || 0);
      
      // Fetch paginated reports with staff profile information
      const from = (currentPage - 1) * reportsPerPage;
      const to = from + reportsPerPage - 1;
      
      const { data, error } = await supabase
        .from('weekly_reports')
        .select(`
          report_id,
          week_start_date,
          week_end_date,
          total_attendance,
          unique_children,
          first_timers,
          report_pdf_url,
          report_generated_by,
          staff:report_generated_by (
            staff_id,
            first_name,
            last_name,
            profile_image_url,
            profile_image_path
          )
        `)
        .order('week_end_date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      setReports(data || []);
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to load weekly reports'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = async (reportUrl) => {
    if (!reportUrl) return;
    
    try {
      // The URL is now stored as a full Firebase download URL, so just open it
      window.open(reportUrl, '_blank');
      
    } catch (error) {
      console.error('Error accessing report PDF:', error);
      toast.error('Error', {
        description: 'Could not access the report PDF. It may not be uploaded yet.'
      });
    }
  };

  const totalPages = Math.ceil(totalReports / reportsPerPage);
  
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  // Generate consistent gradient for staff avatar
  const getStaffGradient = (staffId) => {
    const colors = [
      'from-nextgen-blue to-nextgen-blue-dark',
      'from-nextgen-orange to-nextgen-orange-dark',
      'from-nextgen-blue-light to-nextgen-blue',
      'from-nextgen-orange-light to-nextgen-orange',
      'from-blue-500 to-indigo-600',
      'from-orange-500 to-amber-500'
    ];
    
    const index = (staffId || 0) % colors.length;
    return `bg-gradient-to-br ${colors[index]}`;
  };

  // Define table columns using useMemo for performance
  const columns = useMemo(() => [
    {
      header: "Week Period",
      cell: (row) => (
        <div className="font-medium text-gray-900">
          {formatDate(row.week_start_date, { month: 'short', day: 'numeric' })} - {formatDate(row.week_end_date, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      ),
      width: "240px"
    },
    {
      header: "Report Statistics",
      cell: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-nextgen-blue-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-600">Total: <span className="font-semibold text-nextgen-blue-dark">{row.total_attendance}</span></span>
          </div>
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-nextgen-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-xs text-gray-600">Unique: <span className="font-semibold text-nextgen-blue">{row.unique_children}</span></span>
          </div>
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="text-xs text-gray-600">First-timers: <span className="font-semibold text-green-700">{row.first_timers}</span></span>
          </div>
        </div>
      ),
      width: "240px"
    },
    {
      header: "Generated By",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
            {row.staff?.profile_image_url ? (
              <img 
                src={row.staff.profile_image_url}
                alt={`${row.staff.first_name} ${row.staff.last_name}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = `
                    <div class="h-full w-full rounded-full ${getStaffGradient(row.staff?.staff_id)} flex items-center justify-center text-white text-sm font-medium">
                      ${row.staff?.first_name?.charAt(0) || '?'}${row.staff?.last_name?.charAt(0) || ''}
                    </div>
                  `;
                }}
              />
            ) : (
              <div className={`h-full w-full rounded-full ${getStaffGradient(row.staff?.staff_id)} flex items-center justify-center text-white text-sm font-medium`}>
                {row.staff?.first_name?.charAt(0) || '?'}
                {row.staff?.last_name?.charAt(0) || ''}
              </div>
            )}
          </div>
          <div className="text-sm text-gray-700">
            {row.staff?.first_name} {row.staff?.last_name || 'System'}
          </div>
        </div>
      ),
      width: "200px"
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex justify-end items-center space-x-2">
          {row.report_pdf_url ? (
            <>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleViewReport(row.report_pdf_url)}
                className="text-nextgen-blue hover:text-nextgen-blue-dark"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              >
                View
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={async () => {
                  const toastId = toast.loading('Preparing download...');
                  
                  try {
                    // Fetch the PDF as a blob
                    const response = await fetch(row.report_pdf_url);
                    if (!response.ok) throw new Error('Failed to fetch PDF');
                    
                    const blob = await response.blob();
                    
                    // Create object URL and trigger download
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = `weekly-report-${row.week_start_date}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Clean up the blob URL
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
                    
                    // Dismiss loading toast and show success
                    toast.dismiss(toastId);
                    toast.success('Download Started', {
                      description: 'Your report is being downloaded'
                    });
                  } catch (error) {
                    console.error('Download error:', error);
                    // Dismiss loading toast and show error
                    toast.dismiss(toastId);
                    toast.error('Download Failed', {
                      description: 'Could not download the report. Please try again.'
                    });
                  }
                }}
                className="text-nextgen-blue hover:text-nextgen-blue-dark"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                }
              >
                Download
              </Button>
            </>
          ) : (
            <span className="text-gray-400 text-xs flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              No PDF Available
            </span>
          )}
        </div>
      ),
      width: "220px"
    }
  ], [toast]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="mt-4 flex items-center justify-between px-4 pb-4">
        <p className="text-sm text-gray-500">
          Showing {reports.length} of {totalReports} reports
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1"
          >
            Previous
          </Button>
          
          {[...Array(totalPages).keys()].map(i => {
            const page = i + 1;
            if (page === 1 || page === totalPages || 
                (page >= currentPage - 1 && page <= currentPage + 1)) {
              return (
                <Button
                  key={page}
                  variant={page === currentPage ? "primary" : "outline"}
                  size="xs"
                  onClick={() => handlePageChange(page)}
                  className="px-3 py-1 min-w-[2rem]"
                >
                  {page}
                </Button>
              );
            } else if (page === 2 || page === totalPages - 1) {
              return <span key={page} className="px-2 text-gray-400">...</span>;
            }
            return null;
          })}
          
          <Button
            variant="outline"
            size="xs"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1"
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Card variant="minimal">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div>
          <h3 className="text-lg leading-6 font-medium text-nextgen-blue-dark">Weekly Reports</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Review and manage weekly ministry reports</p>
        </div>
      </div>
      
      {loading ? (
        <div className="px-4 py-12 sm:p-6 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-blue"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="px-4 py-12 sm:p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 mb-1 font-medium">No reports found</p>
          <p className="text-gray-400 text-sm">Generate a new report to get started</p>
        </div>
      ) : (
        <>
          <Table
            data={reports}
            columns={columns}
            isLoading={loading}
            noDataMessage="No weekly reports found"
            highlightOnHover={true}
            variant="primary"
            className="border-0"
          />
          
          {renderPagination()}
        </>
      )}
    </Card>
  );
};

export default WeeklyReportsList;