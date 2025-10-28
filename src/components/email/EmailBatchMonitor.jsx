import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';

const EmailBatchMonitor = () => {
  const [batchJobs, setBatchJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    fetchBatchJobs();
    
    // Set up real-time subscription for batch job updates
    const subscription = supabase
      .channel('email_batch_jobs_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'email_batch_jobs' },
        (payload) => {
          console.log('Batch job updated:', payload);
          fetchBatchJobs();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchBatchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_batch_job_summary')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBatchJobs(data || []);
    } catch (error) {
      console.error('Error fetching batch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'processing':
        return '⟳';
      case 'failed':
        return '✗';
      default:
        return '○';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-nextgen-blue"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-6 py-5 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-nextgen-blue-dark">
          Email Batch Job Monitor
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Track the status of email batch jobs in real-time
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Template
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recipients
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Success Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Started At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created By
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {batchJobs.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                  No batch jobs found
                </td>
              </tr>
            ) : (
              batchJobs.map((job) => (
                <motion.tr
                  key={job.batch_job_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedJob(job)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                      <span className="mr-1">{getStatusIcon(job.status)}</span>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {job.job_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.template_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span className="text-green-600 font-medium">{job.successful_sends} sent</span>
                      {job.failed_sends > 0 && (
                        <span className="text-red-600 text-xs">{job.failed_sends} failed</span>
                      )}
                      <span className="text-gray-500 text-xs">of {job.total_recipients}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            job.success_rate >= 90 ? 'bg-green-500' :
                            job.success_rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${job.success_rate || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-xs">{job.success_rate || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(job.duration_seconds)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(job.started_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.created_by_name || 'System'}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setSelectedJob(null)}>
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Batch Job Details</h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Batch ID</p>
                  <p className="text-sm text-gray-900 font-mono">{selectedJob.batch_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedJob.status)}`}>
                    {selectedJob.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Job Type</p>
                  <p className="text-sm text-gray-900">{selectedJob.job_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Template</p>
                  <p className="text-sm text-gray-900">{selectedJob.template_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Recipients</p>
                  <p className="text-sm text-gray-900">{selectedJob.total_recipients}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Successful Sends</p>
                  <p className="text-sm text-green-600 font-medium">{selectedJob.successful_sends}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Failed Sends</p>
                  <p className="text-sm text-red-600 font-medium">{selectedJob.failed_sends}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Success Rate</p>
                  <p className="text-sm text-gray-900">{selectedJob.success_rate}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Started At</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedJob.started_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Completed At</p>
                  <p className="text-sm text-gray-900">{formatDate(selectedJob.completed_at)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Duration</p>
                  <p className="text-sm text-gray-900">{formatDuration(selectedJob.duration_seconds)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Created By</p>
                  <p className="text-sm text-gray-900">{selectedJob.created_by_name || 'System'}</p>
                </div>
              </div>
              
              {selectedJob.error_message && (
                <div className="mt-4 p-3 bg-red-50 rounded-md">
                  <p className="text-sm font-medium text-red-800">Error Message</p>
                  <p className="text-sm text-red-600 mt-1">{selectedJob.error_message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailBatchMonitor;
