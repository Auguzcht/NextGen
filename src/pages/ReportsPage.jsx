import { useState, useEffect } from 'react';
import MainLayout from '../layouts/MainLayout.jsx';
import supabase from '../services/supabase.js';
import ReportChart from '../components/reports/ReportChart.jsx';

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('attendance');
  const [timeRange, setTimeRange] = useState('weekly');
  const [reportData, setReportData] = useState([]);
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

  useEffect(() => {
    fetchReportData();
  }, [reportType, timeRange, startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (reportType === 'attendance') {
        await fetchAttendanceData();
      } else if (reportType === 'growth') {
        await fetchGrowthData();
      } else if (reportType === 'age') {
        await fetchAgeDistributionData();
      }
      
      // Fetch weekly reports
      await fetchWeeklyReports();
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceData = async () => {
    let { data, error } = await supabase
      .from('daily_attendance_summary')
      .select('*')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: true });

    if (error) throw error;
    
    // Process data for chart
    const groupedData = groupDataByTimeRange(data, 'attendance_date', 'total_children');
    
    setReportData(data || []);
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
          data: groupDataByTimeRange(data, 'attendance_date', 'first_timers').map(item => item.value),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          tension: 0.1
        }
      ]
    });
  };

  const fetchGrowthData = async () => {
    let { data, error } = await supabase
      .from('service_growth_trend')
      .select('*')
      .order('month', { ascending: true });

    if (error) throw error;
    
    // Filter data for the selected date range
    data = data.filter(item => {
      const monthDate = new Date(item.month + '-01');
      return monthDate >= new Date(startDate) && monthDate <= new Date(endDate);
    });
    
    // Process data for chart
    const serviceNames = [...new Set(data.map(item => item.service_name))];
    
    setReportData(data || []);
    setChartData({
      labels: [...new Set(data.map(item => item.month))],
      datasets: serviceNames.map((service, index) => {
        const colors = [
          'rgb(99, 102, 241)', // indigo
          'rgb(34, 197, 94)',  // green
          'rgb(239, 68, 68)',  // red
          'rgb(234, 179, 8)'   // yellow
        ];
        
        return {
          label: service,
          data: data
            .filter(item => item.service_name === service)
            .map(item => item.monthly_attendance),
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length].replace('rgb', 'rgba').replace(')', ', 0.5)'),
          tension: 0.1
        };
      })
    });
  };

  const fetchAgeDistributionData = async () => {
    let { data, error } = await supabase
      .from('age_group_analysis')
      .select('*')
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (error) throw error;
    
    // Group data by age category
    const ageCategories = [...new Set(data.map(item => item.age_category))];
    const groupedData = ageCategories.map(category => {
      const categoryItems = data.filter(item => item.age_category === category);
      const total = categoryItems.reduce((sum, item) => sum + item.count, 0);
      return { category, total };
    });
    
    setReportData(data || []);
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

  const groupDataByTimeRange = (data, dateField, valueField) => {
    // If no data, return empty array
    if (!data || data.length === 0) return [];
    
    // Group by day, week, or month
    if (timeRange === 'daily') {
      return data.map(item => ({
        label: new Date(item[dateField]).toLocaleDateString(),
        value: item[valueField]
      }));
    } else if (timeRange === 'weekly') {
      // Group by week
      const weeks = {};
      data.forEach(item => {
        const date = new Date(item[dateField]);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Sunday
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeks[weekKey]) {
          weeks[weekKey] = { label: `Week of ${weekStart.toLocaleDateString()}`, value: 0 };
        }
        weeks[weekKey].value += item[valueField];
      });
      
      return Object.values(weeks);
    } else {
      // Group by month
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

  return (
    <MainLayout>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold text-gray-800">Reports & Analytics</h2>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-1">
                Report Type
              </label>
              <select
                id="report-type"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="attendance">Attendance</option>
                <option value="growth">Growth Trend</option>
                <option value="age">Age Distribution</option>
              </select>
            </div>
            
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
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-6">
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
        </div>

        {/* Chart Section */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {reportType === 'attendance' ? 'Attendance Overview' : 
             reportType === 'growth' ? 'Growth Trend Analysis' : 'Age Distribution'}
          </h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-lg border border-gray-200 h-80">
              <ReportChart type={reportType} data={chartData} />
            </div>
          )}
        </div>

        {/* Weekly Reports Section */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Weekly Reports
          </h3>
          
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
                  {weeklyReports.map((report) => (
                    <tr key={report.report_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatDate(report.week_start_date)} to {formatDate(report.week_end_date)}
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
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ReportsPage;