import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import supabase from '../../services/supabase.js';
import { formatDate } from '../../utils/dateUtils.js';
import Swal from 'sweetalert2';

const WeeklyReportsList = ({ onGenerateReport }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const reportsPerPage = 8;

  useEffect(() => {
    fetchReports();
  }, [currentPage]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Count total reports
      const { count, error: countError } = await supabase
        .from('weekly_reports')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      setTotalReports(count || 0);

      // Fetch paginated reports
      const from = (currentPage - 1) * reportsPerPage;
      const to = from + reportsPerPage - 1;
      
      const { data, error } = await supabase
        .from('weekly_reports')
        .select(`
          *,
          staff:report_generated_by (first_name, last_name)
        `)
        .order('week_end_date', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching weekly reports:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load weekly reports',
        confirmButtonColor: '#571C1F'
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
      
      // Call your supabase function or API to send the weekly report email
      const { data, error } = await supabase.rpc('send_weekly_email_report', {
        report_id: reportId
      });
      
      if (error) throw error;
      
      Swal.fire({
        icon: 'success',
        title: 'Email Sent!',
        text: 'Weekly report email has been sent successfully',
        confirmButtonColor: '#571C1F',
        timer: 3000
      });
      
      fetchReports(); // Refresh the list
    } catch (error) {
      console.error('Error sending weekly report email:', error);
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to send email: ${error.message}`,
        confirmButtonColor: '#571C1F'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const totalPages = Math.ceil(totalReports / reportsPerPage);
  
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {reports.length} of {totalReports} reports
        </p>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-md text-sm ${
              currentPage === 1 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          
          {[...Array(totalPages).keys()].map(i => {
            const page = i + 1;
            // Show current page, first, last, and pages near current
            if (page === 1 || page === totalPages || 
                (page >= currentPage - 1 && page <= currentPage + 1)) {
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 rounded-md text-sm ${
                    page === currentPage
                    ? 'bg-[#571C1F] text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            } else if (page === 2 || page === totalPages - 1) {
              // Show ellipsis
              return <span key={page} className="px-2">...</span>;
            }
            return null;
          })}
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded-md text-sm ${
              currentPage === totalPages 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-lg leading-6 font-medium text-[#571C1F]">Weekly Reports</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">Review and manage weekly ministry reports</p>
        </div>
        {onGenerateReport && (
          <button
            onClick={onGenerateReport}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#571C1F] hover:bg-[#571C1F]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#571C1F]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generate New Report
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="px-4 py-12 sm:p-6 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#571C1F]"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="px-4 py-12 sm:p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500 mb-1">No reports found</p>
          <p className="text-gray-400 text-sm">Generate a new report to get started</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendance
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  First Timers
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated By
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <motion.tr 
                  key={report.report_id} 
                  className="hover:bg-gray-50"
                  whileHover={{ backgroundColor: 'rgba(249, 250, 251, 0.8)' }}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatDate(report.week_start_date, { month: 'short', day: 'numeric' })} - {formatDate(report.week_end_date, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#571C1F] mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{report.total_attendance}</span>
                      <span className="text-xs text-gray-400 ml-1">({report.unique_children} unique)</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#215A75] mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      {report.first_timers}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {report.staff?.first_name} {report.staff?.last_name || 'System'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {report.email_sent_date ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Sent {formatDate(report.email_sent_date, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Not sent
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      {report.report_pdf_url ? (
                        <a
                          href={report.report_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#215A75] hover:text-[#215A75]/80 flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                          No PDF
                        </span>
                      )}
                      
                      {!report.email_sent_date && (
                        <button
                          onClick={() => handleSendEmail(report.report_id)}
                          disabled={sendingEmail}
                          className={`text-[#571C1F] hover:text-[#571C1F]/80 flex items-center ${sendingEmail ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          
          {renderPagination()}
        </div>
      )}
    </div>
  );
};

export default WeeklyReportsList;