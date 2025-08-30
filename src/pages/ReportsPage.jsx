import { useState, useEffect, useCallback } from 'react';
import supabase from '../services/supabase.js';
import ReportChart from '../components/reports/ReportChart.jsx';
import AttendancePatternChart from '../components/reports/AttendancePatternChart.jsx';
import ServiceComparisonChart from '../components/reports/ServiceComparisonChart.jsx';
import WeeklyReportsList from '../components/reports/WeeklyReportsList.jsx';
import { Card, Button, Badge } from '../components/ui';
import { motion } from 'framer-motion';

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('dashboard');
  const [timeRange, setTimeRange] = useState('weekly');
  const [reportData, setReportData] = useState({
    attendance: [],
    growth: [],
    age: [],
    raw: []
  });
  const [weeklyReports, setWeeklyReports] = useState([]);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: []
  });
  
  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Cache for data
  const [dataCache, setDataCache] = useState({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Tab navigation
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'growth', label: 'Growth Trend' },
    { id: 'age', label: 'Age Distribution' },
    { id: 'weekly', label: 'Weekly Reports' }
  ];

  useEffect(() => {
    fetchReportData();
  }, [timeRange, startDate, endDate]);

  // Memoized fetch with caching
  const fetchWithCache = useCallback(async (key, fetchFn) => {
    const cacheKey = `${key}_${startDate}_${endDate}`;
    const cachedItem = dataCache[cacheKey];
    
    if (cachedItem && (Date.now() - cachedItem.timestamp) < CACHE_DURATION) {
      return cachedItem.data;
    }
    
    const data = await fetchFn();
    
    setDataCache(prev => ({
      ...prev,
      [cacheKey]: {
        data,
        timestamp: Date.now()
      }
    }));
    
    return data;
  }, [dataCache, startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch all data types in parallel
      const [attendanceData, growthData, ageData, rawData] = await Promise.all([
        fetchWithCache('attendance', fetchAttendanceData),
        fetchWithCache('growth', fetchGrowthData),
        fetchWithCache('age', fetchAgeDistributionData),
        fetchWithCache('raw', fetchRawAttendanceData),
      ]);
      
      // Set data for each report type
      setReportData({
        attendance: attendanceData,
        growth: growthData,
        age: ageData,
        raw: rawData
      });
      
      // Set chart data based on current report type
      updateChartData(reportType, attendanceData, growthData, ageData);
      
      // Fetch weekly reports
      await fetchWeeklyReports();
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateChartData = (type, attendanceData, growthData, ageData) => {
    if (type === 'attendance' && attendanceData) {
      const groupedData = groupDataByTimeRange(attendanceData, 'attendance_date', 'total_children');
      
      setChartData({
        labels: groupedData.map(item => item.label),
        datasets: [
          {
            label: 'Total Children',
            data: groupedData.map(item => item.value),
            borderColor: 'rgb(99, 102, 241)',
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            tension: 0.1
          },
          {
            label: 'First Timers',
            data: groupDataByTimeRange(attendanceData, 'attendance_date', 'first_timers').map(item => item.value),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.5)',
            tension: 0.1
          }
        ]
      });
    } else if (type === 'growth' && growthData) {
      const serviceNames = [...new Set(growthData.map(item => item.service_name))];
      
      setChartData({
        labels: [...new Set(growthData.map(item => item.month))],
        datasets: serviceNames.map((service, index) => {
          const colors = [
            'rgb(99, 102, 241)', // indigo
            'rgb(34, 197, 94)',  // green
            'rgb(239, 68, 68)',  // red
            'rgb(234, 179, 8)'   // yellow
          ];
          
          return {
            label: service,
            data: growthData
              .filter(item => item.service_name === service)
              .map(item => item.monthly_attendance),
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.5)'),
            tension: 0.1
          };
        })
      });
    } else if (type === 'age' && ageData) {
      const ageCategories = [...new Set(ageData.map(item => item.age_category))];
      const groupedData = ageCategories.map(category => {
        const categoryItems = ageData.filter(item => item.age_category === category);
        const total = categoryItems.reduce((sum, item) => sum + item.count, 0);
        return { category, total };
      });
      
      setChartData({
        labels: groupedData.map(item => item.category),
        datasets: [
          {
            label: 'Age Distribution',
            data: groupedData.map(item => item.total),
            backgroundColor: [
              'rgba(99, 102, 241, 0.6)',  // indigo
              'rgba(34, 197, 94, 0.6)',   // green
              'rgba(239, 68, 68, 0.6)',   // red
              'rgba(234, 179, 8, 0.6)',   // yellow
              'rgba(107, 114, 128, 0.6)', // gray
            ],
            borderColor: [
              'rgb(99, 102, 241)',
              'rgb(34, 197, 94)',
              'rgb(239, 68, 68)',
              'rgb(234, 179, 8)',
              'rgb(107, 114, 128)',
            ],
            borderWidth: 1
          }
        ]
      });
    }
  };

  const fetchAttendanceData = async () => {
    const { data, error } = await supabase
      .from('daily_attendance_summary')
      .select('*')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: true });

    if (error) throw error;
    return data || [];
  };

  const fetchRawAttendanceData = async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        children (
          child_id,
          first_name,
          last_name,
          gender,
          age_category_id,
          age_categories (category_name)
        ),
        services (service_name, day_of_week)
      `)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (error) throw error;
    return data || [];
  };

  const fetchGrowthData = async () => {
    const { data, error } = await supabase
      .from('service_growth_trend')
      .select('*')
      .order('month', { ascending: true });

    if (error) throw error;
    
    // Filter data for the selected date range
    return (data || []).filter(item => {
      const monthDate = new Date(item.month + '-01');
      return monthDate >= new Date(startDate) && monthDate <= new Date(endDate);
    });
  };

  const fetchAgeDistributionData = async () => {
    const { data, error } = await supabase
      .from('age_group_analysis')
      .select('*')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (error) throw error;
    return data || [];
  };

  const fetchWeeklyReports = async () => {
    const { data, error } = await supabase
      .from('weekly_reports')
      .select('*')
      .order('week_start_date', { ascending: false })
      .limit(10);
      
    if (error) throw error;
    setWeeklyReports(data || []);
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('generate_weekly_analytics');
      
      if (error) throw error;
      
      await fetchWeeklyReports();
      alert('Weekly report generated successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert(`Error generating report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const groupDataByTimeRange = (data, dateField, valueField) => {
    if (!data || data.length === 0) return [];
    
    if (timeRange === 'daily') {
      return data.map(item => ({
        label: new Date(item[dateField]).toLocaleDateString(),
        value: item[valueField]
      }));
    } else if (timeRange === 'weekly') {
      const weeks = {};
      data.forEach(item => {
        const date = new Date(item[dateField]);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeks[weekKey]) {
          weeks[weekKey] = { label: `Week of ${weekStart.toLocaleDateString()}`, value: 0 };
        }
        weeks[weekKey].value += item[valueField];
      });
      
      return Object.values(weeks);
    } else {
      const months = {};
      data.forEach(item => {
        const date = new Date(item[dateField]);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        
        if (!months[monthKey]) {
          months[monthKey] = { 
            label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), 
            value: 0 
          };
        }
        months[monthKey].value += item[valueField];
      });
      
      return Object.values(months);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Improved data export functionality
  const exportData = () => {
    let dataToExport;
    let filename;
    
    switch(reportType) {
      case 'attendance':
        dataToExport = reportData.attendance;
        filename = 'attendance-data.csv';
        break;
      case 'growth':
        dataToExport = reportData.growth;
        filename = 'growth-data.csv';
        break;
      case 'age':
        dataToExport = reportData.age;
        filename = 'age-distribution-data.csv';
        break;
      default:
        dataToExport = reportData.attendance;
        filename = 'report-data.csv';
    }
    
    if (!dataToExport || dataToExport.length === 0) {
      alert('No data to export');
      return;
    }
    
    // Create CSV string
    const headers = Object.keys(dataToExport[0]).join(',');
    const rows = dataToExport.map(item => 
      Object.values(item).map(val => 
        typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
      ).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${rows}`;
    
    // Create and download the file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handlers for tab switching
  const handleTabChange = (tab) => {
    setReportType(tab);
    if (['attendance', 'growth', 'age'].includes(tab)) {
      updateChartData(tab, reportData.attendance, reportData.growth, reportData.age);
    }
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            onClick={exportData}
            disabled={loading || reportType === 'dashboard' || reportType === 'weekly'}
            className="h-10"
          >
            Export Data
          </Button>
          <Button 
            variant="primary"
            onClick={handleGenerateReport}
            disabled={loading}
            className="h-10"
          >
            Generate Weekly Report
          </Button>
        </div>
      </div>

      {/* Date Range Selection */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="time-range" className="block text-sm font-medium text-gray-700 mb-1">
                Time Range
              </label>
              <select
                id="time-range"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="flex items-end">
              <div className="bg-blue-50 px-4 py-2 rounded-md w-full">
                <p className="text-xs text-blue-800">
                  <span className="font-medium">Period:</span> {formatDate(startDate)} to {formatDate(endDate)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${reportType === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Dashboard View */}
      {reportType === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Total Children</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {loading ? (
                        <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                      ) : (
                        reportData.raw?.length > 0 ? 
                          new Set(reportData.raw.map(item => item.child_id)).size :
                          0
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Total Attendance</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {loading ? (
                        <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                      ) : (
                        reportData.attendance?.reduce((sum, item) => sum + item.total_children, 0) || 0
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">First-Time Visitors</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {loading ? (
                        <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                      ) : (
                        reportData.attendance?.reduce((sum, item) => sum + item.first_timers, 0) || 0
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Services</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {loading ? (
                        <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                      ) : (
                        reportData.raw?.length > 0 ? 
                          new Set(reportData.raw.map(item => item.service_id)).size :
                          0
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Pattern Chart */}
            <AttendancePatternChart attendanceData={reportData.raw} />
            
            {/* Service Comparison Chart */}
            <ServiceComparisonChart serviceData={reportData.growth} />
          </div>

          {/* Recent Reports */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Weekly Reports</h3>
              
              {weeklyReports.length === 0 ? (
                <div className="bg-gray-50 p-4 text-center rounded-md">
                  <p className="text-gray-500">No weekly reports available</p>
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
                          Total Attendance
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unique Children
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          First Timers
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {weeklyReports.slice(0, 5).map((report) => (
                        <tr key={report.report_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {new Date(report.week_start_date).toLocaleDateString()} - {new Date(report.week_end_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {report.total_attendance}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {report.unique_children}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {report.first_timers}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {report.report_pdf_url ? (
                              <a 
                                href={report.report_pdf_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                View PDF
                              </a>
                            ) : (
                              <span className="text-gray-400">No PDF</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="mt-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTabChange('weekly')}
                    >
                      View All Reports
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Chart Views */}
      {(reportType === 'attendance' || reportType === 'growth' || reportType === 'age') && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {reportType === 'attendance' ? 'Attendance Overview' : 
               reportType === 'growth' ? 'Growth Trend Analysis' : 'Age Distribution'}
            </h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg h-96">
                <ReportChart type={reportType} data={chartData} />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Weekly Reports View */}
      {reportType === 'weekly' && (
        <Card>
          <div className="p-6">
            <WeeklyReportsList onGenerateReport={handleGenerateReport} />
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReportsPage;