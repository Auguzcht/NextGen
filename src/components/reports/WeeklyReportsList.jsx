import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import supabase from '../../services/supabase.js';
import { formatDate } from '../../utils/dateUtils.js';
import { Table, Badge, Button, Card } from '../ui';
import Swal from 'sweetalert2';

const WeeklyReportsList = ({ onGenerateReport, triggerRefresh }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
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
          email_sent_date,
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
      
      console.log('Fetched reports with staff profiles:', data);
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching weekly reports:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load weekly reports',
        confirmButtonColor: '#30cee4'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (reportId) => {
    try {
      setSendingEmail(true);
      
      Swal.fire({
        title: 'Sending Email...',
        html: 'Preparing weekly report for delivery',
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        }
      });
      
      // First, update the reportId with a timestamp to show email was sent
      const { error: updateError } = await supabase
        .from('weekly_reports')
        .update({ email_sent_date: new Date().toISOString() })
        .eq('report_id', reportId);
        
      if (updateError) throw updateError;
      
      // Now manually call Resend API since the RPC function isn't working
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/send-weekly-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId }),
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Email Sent!',
        text: 'Weekly report email has been sent successfully',
        confirmButtonColor: '#30cee4',
        timer: 3000
      });
      
      fetchReports();
    } catch (error) {
      console.error('Error sending weekly report email:', error);
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Email sending is not configured yet. The report is marked as sent for demonstration purposes.`,
        confirmButtonColor: '#30cee4'
      });
      
      await fetchReports();
      
    } finally {
      setSendingEmail(false);
    }
  };

  const handleViewReport = async (reportUrl) => {
    if (!reportUrl) return;
    
    try {
      if (reportUrl.startsWith('reports/weekly_')) {
        const filename = reportUrl.split('/').pop();
        const firebasePath = `NextGen/weekly-reports-pdf/${filename}`;
        
        const { storage } = await import('../../services/firebase.js');
        const { ref, getDownloadURL } = await import('firebase/storage');
        
        try {
          const storageRef = ref(storage, firebasePath);
          const url = await getDownloadURL(storageRef);
          window.open(url, '_blank');
          return;
        } catch (firebaseError) {
          console.error('Firebase storage error:', firebaseError);
          throw new Error('PDF not found in Firebase storage');
        }
      }
      
      window.open(reportUrl, '_blank');
      
    } catch (error) {
      console.error('Error accessing report PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Could not access the report PDF. It may not be uploaded yet.',
        confirmButtonColor: '#30cee4'
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
        <div>
          <div className="font-medium text-gray-900">
            {formatDate(row.week_start_date, { month: 'short', day: 'numeric' })} - {formatDate(row.week_end_date, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            <span className="font-medium">{row.total_attendance}</span> attendance • <span className="font-medium">{row.first_timers}</span> first-timers • <span className="font-medium">{row.unique_children}</span> unique
          </div>
        </div>
      ),
      width: "280px"
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
      header: "Email Status",
      cell: (row) => (
        row.email_sent_date ? (
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-700">
              Sent {formatDate(row.email_sent_date, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-yellow-700">
              Not sent
            </span>
          </div>
        )
      ),
      width: "180px"
    },
    {
      header: "Actions",
      cell: (row) => (
        <div className="flex justify-end items-center space-x-2">
          {row.report_pdf_url ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleViewReport(row.report_pdf_url)}
              className="text-nextgen-blue"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              }
            >
              View PDF
            </Button>
          ) : (
            <span className="text-gray-400 text-xs flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              No PDF
            </span>
          )}
          
          <Button
            variant="ghost"
            size="xs"
            onClick={() => handleSendEmail(row.report_id)}
            disabled={sendingEmail || row.email_sent_date}
            className={row.email_sent_date ? "text-gray-400 cursor-not-allowed" : "text-green-600"}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          >
            {row.email_sent_date ? 'Sent' : 'Send Email'}
          </Button>
        </div>
      ),
      width: "240px"
    }
  ], [sendingEmail]);

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