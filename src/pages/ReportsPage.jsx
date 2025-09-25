import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import supabase from '../services/supabase.js';
import ReportChart from '../components/reports/ReportChart.jsx';
import AttendancePatternChart from '../components/reports/AttendancePatternChart.jsx';
import ServiceComparisonChart from '../components/reports/ServiceComparisonChart.jsx';
import WeeklyReportsList from '../components/reports/WeeklyReportsList.jsx';
import { Card, Button, Input, Badge, NextGenChart } from '../components/ui';
import { formatDate, getMonthDateRange, getWeekDateRange } from '../utils/dateUtils.js';
import Swal from 'sweetalert2';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase.js';

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
    { id: 'dashboard', label: 'Dashboard', icon: (
      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    )},
    { id: 'attendance', label: 'Attendance', icon: (
      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )},
    { id: 'growth', label: 'Growth Trend', icon: (
      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    )},
    { id: 'age', label: 'Age Distribution', icon: (
      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    )},
    { id: 'weekly', label: 'Weekly Reports', icon: (
      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )}
  ];

  // Date presets
  const datePresets = [
    { label: 'Last 7 days', value: 'last7days' },
    { label: 'Last 30 days', value: 'last30days' },
    { label: 'This month', value: 'thisMonth' },
    { label: 'Last 3 months', value: 'last3months' },
  ];

  // Fix 1: Improve the fetchWithCache function to properly include filter parameters
  const fetchWithCache = useCallback(async (key, fetchFn) => {
    // Create a more specific cache key including all filter parameters
    const cacheKey = `${key}_${startDate}_${endDate}_${timeRange}`;
    
    // Clear cache when date range changes
    if (startDate !== dataCache.lastStartDate || endDate !== dataCache.lastEndDate) {
      // Only keep non-data cache properties
      const { lastStartDate, lastEndDate, ...rest } = dataCache;
      setDataCache({
        lastStartDate: startDate,
        lastEndDate: endDate
      });
      console.log('Cache cleared due to date range change');
    }
    
    const cachedItem = dataCache[cacheKey];
    
    if (cachedItem && (Date.now() - cachedItem.timestamp) < CACHE_DURATION) {
      console.log(`Using cached data for ${key}`);
      return cachedItem.data;
    }
    
    console.log(`Fetching fresh data for ${key}`);
    // Always fetch fresh data when filters change
    const data = await fetchFn();
    
    setDataCache(prev => ({
      ...prev,
      [cacheKey]: {
        data,
        timestamp: Date.now()
      }
    }));
    
    return data;
  }, [dataCache, startDate, endDate, timeRange]); // Add timeRange as dependency

  // Fix 2: Make fetchReportData depend on filters directly
  // Update the fetchReportData function to prevent jittering
  const fetchReportData = useCallback(async () => {
    // Don't set loading to true immediately - this is what causes jitter
    // Instead, keep the old data visible while loading new data in background
    
    try {
      console.log(`Fetching data from ${startDate} to ${endDate}`);
      
      // Fetch all data types in parallel
      const [attendanceData, growthData, ageData, rawData, registeredCount, totalStats] = await Promise.all([
        fetchWithCache('attendance', () => fetchAttendanceData(startDate, endDate)),
        fetchWithCache('growth', () => fetchGrowthData(startDate, endDate)),
        fetchWithCache('age', () => fetchAgeDistributionData(startDate, endDate)),
        fetchWithCache('raw', () => fetchRawAttendanceData(startDate, endDate)),
        fetchWithCache('registered', () => fetchRegisteredChildrenCount(startDate, endDate)),
        fetchWithCache('totalStats', () => fetchTotalStats()),
      ]);
      
      console.log('Attendance data count:', attendanceData?.length);
      console.log('Growth data count:', growthData?.length);
      console.log('Age data count:', ageData?.length);
      console.log('Raw data count:', rawData?.length);
      console.log('Registered children count:', registeredCount);
      
      // Now set data for each report type all at once
      setReportData({
        attendance: attendanceData || [],
        growth: growthData || [],
        age: ageData || [],
        raw: rawData || [],
        registeredCount: registeredCount,
        totalStats: totalStats
      });
      
      // Also update chart data in the same render cycle
      updateChartData(reportType, attendanceData || [], growthData || [], ageData || []);
      
      // Fetch weekly reports
      await fetchWeeklyReports();
      
      // Only set loading to false after everything is ready
      setLoading(false);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setLoading(false);
    }
  }, [startDate, endDate, timeRange, reportType, fetchWithCache]);

  // Fix 3: Update the useEffect to use the memoized fetchReportData
  useEffect(() => {
    console.log('Date range changed, fetching new data...');
    
    // Set a short loading state only on initial load
    if (reportData.attendance.length === 0 && reportData.growth.length === 0) {
      setLoading(true);
    }
    
    // Use a timeout to prevent rapid filter changes from causing jitter
    const timer = setTimeout(() => {
      fetchReportData();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [startDate, endDate, timeRange]); // Remove fetchReportData from dependencies to prevent excess renders

  // Add another effect for report type changes
  useEffect(() => {
    // Update chart data when report type changes without refetching all data
    if (!loading && reportData.attendance.length > 0) {
      updateChartData(reportType, reportData.attendance, reportData.growth, reportData.age);
    }
  }, [reportType]);

  // Fix 4: Update API functions to accept date parameters directly
  const fetchAttendanceData = async (start, end) => {
    console.log(`Fetching attendance data from ${start} to ${end}`);
    const { data, error } = await supabase
      .from('daily_attendance_summary')
      .select('*')
      .gte('attendance_date', start)
      .lte('attendance_date', end)
      .order('attendance_date', { ascending: true });

    if (error) {
      console.error('Error fetching attendance data:', error);
      throw error;
    }
    return data || [];
  };

  const fetchRawAttendanceData = async (start, end) => {
    console.log(`Fetching raw attendance data from ${start} to ${end}`);
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
      .gte('attendance_date', start)
      .lte('attendance_date', end);

    if (error) {
      console.error('Error fetching raw attendance data:', error);
      throw error;
    }
    return data || [];
  };

  const fetchGrowthData = async (start, end) => {
    console.log(`Fetching growth data from ${start} to ${end}`);
    // Create month strings for filtering
    const startMonth = start.substring(0, 7); // YYYY-MM format
    const endMonth = end.substring(0, 7); // YYYY-MM format

    const { data, error } = await supabase
      .from('service_growth_trend')
      .select('*')
      .gte('month', startMonth)
      .lte('month', endMonth)
      .order('month', { ascending: true });

    if (error) {
      console.error('Error fetching growth data:', error);
      throw error;
    }
    return data || [];
  };

  const fetchAgeDistributionData = async (start, end) => {
    console.log(`Fetching age data from ${start} to ${end}`);
    const { data, error } = await supabase
      .from('age_group_analysis')
      .select('*')
      .gte('attendance_date', start)
      .lte('attendance_date', end);

    if (error) {
      console.error('Error fetching age data:', error);
      throw error;
    }
    return data || [];
  };

  const fetchRegisteredChildrenCount = async (start, end) => {
    console.log(`Fetching registered children from ${start} to ${end}`);
    
    try {
      // Use the same approach as Dashboard.jsx - filter by registration_date
      const { data, error } = await supabase
        .from('children')
        .select('child_id')
        .gte('registration_date', start)
        .lte('registration_date', end);
      
      if (error) throw error;
      
      console.log(`Children registered between ${start} and ${end}: ${data?.length || 0}`);
      return data?.length || 0;
    } catch (err) {
      console.error('Error fetching registered children count:', err);
      return 0;
    }
  };

  // Add this function to fetch total counts regardless of date range
  const fetchTotalStats = async () => {
    console.log('Fetching total stats (regardless of date filters)');
    
    try {
      // Get total children count (same as Dashboard)
      const { count: totalChildren, error: childrenError } = await supabase
        .from('children')
        .select('*', { count: 'exact', head: true });
        
      if (childrenError) throw childrenError;
      
      // Get total attendance count
      const { count: totalAttendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true });
        
      if (attendanceError) throw attendanceError;
      
      return {
        totalChildren: totalChildren || 0,
        totalAttendance: totalAttendance || 0
      };
    } catch (err) {
      console.error('Error fetching total stats:', err);
      return { totalChildren: 0, totalAttendance: 0 };
    }
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

  // Add a new state to track report refresh triggers
  const [reportRefreshTrigger, setReportRefreshTrigger] = useState(0);

  // Update your handleGenerateReport function to include PDF generation
  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      
      // Generate the weekly analytics in the database
      const { data, error } = await supabase.rpc('generate_weekly_analytics');
      
      if (error) throw error;
      
      // Get the most recently created report
      const { data: reportData, error: reportError } = await supabase
        .from('weekly_reports')
        .select('report_id, week_start_date, week_end_date')
        .order('report_id', { ascending: false })
        .limit(1);
        
      if (reportError) throw reportError;
      
      if (reportData && reportData.length > 0) {
        const report = reportData[0];
        
        // Get the start/end dates from the newly created report
        const startDate = report.week_start_date;
        const endDate = report.week_end_date;
        
        // Generate and upload PDF for the report
        await generateReportPDF(
          report.report_id, 
          startDate, 
          endDate
        );
      }
      
      // Refresh weekly reports
      await fetchWeeklyReports();
      
      // Increment report refresh trigger to update the WeeklyReportsList
      setReportRefreshTrigger(prev => prev + 1);
      
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Weekly report generated and PDF created successfully',
        confirmButtonColor: '#30cee4'
      });
    } catch (error) {
      console.error('Error generating report:', error);
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Error generating report: ${error.message}`,
        confirmButtonColor: '#30cee4'
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this function to generate and upload the PDF report
  const generateReportPDF = async (reportId, startDate, endDate) => {
    try {
      // Fetch all the data needed for the report
      const [attendanceData, ageData, registeredCount, rawData] = await Promise.all([
        fetchWithCache('attendance_pdf', () => fetchAttendanceData(startDate, endDate)),
        fetchWithCache('age_pdf', () => fetchAgeDistributionData(startDate, endDate)),
        fetchWithCache('registered_pdf', () => fetchRegisteredChildrenCount(startDate, endDate)),
        fetchWithCache('raw_pdf', () => fetchRawAttendanceData(startDate, endDate)),
      ]);
      
      // Create a temporary element to render the report content
      const reportElement = document.createElement('div');
      reportElement.style.padding = '20px';
      reportElement.style.fontFamily = 'Arial, sans-serif';
      reportElement.style.width = '800px';
      reportElement.style.backgroundColor = 'white';
      reportElement.style.color = 'black';
      
      // Generate service data summary
      const serviceData = {};
      if (rawData) {
        rawData.forEach(item => {
          const serviceName = item.services?.service_name || 'Unknown';
          if (!serviceData[serviceName]) {
            serviceData[serviceName] = { 
              attendance: 0, 
              firstTimers: 0,
              age4_5: 0,
              age6_7: 0,
              age8_9: 0,
              age10_12: 0
            };
          }
          
          serviceData[serviceName].attendance++;
          
          // Count first timers (registered during this report period)
          if (item.children?.registration_date >= startDate && item.children?.registration_date <= endDate) {
            serviceData[serviceName].firstTimers++;
          }
          
          // Count by age category
          const ageCategory = item.children?.age_categories?.category_name;
          if (ageCategory?.includes('4-5')) serviceData[serviceName].age4_5++;
          else if (ageCategory?.includes('6-7')) serviceData[serviceName].age6_7++;
          else if (ageCategory?.includes('8-9')) serviceData[serviceName].age8_9++;
          else if (ageCategory?.includes('10-12')) serviceData[serviceName].age10_12++;
        });
      }
      
      // Calculate unique children
      const uniqueChildren = rawData ? new Set(rawData.map(item => item.child_id)).size : 0;
      
      // Calculate total attendance
      const totalAttendance = rawData ? rawData.length : 0;
      
      // Generate HTML content for PDF
      reportElement.innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #30cee4; margin: 0;">NextGen Ministry Weekly Report</h1>
          <h2 style="color: #1ca7bc; margin-top: 5px;">Week of ${formatDate(startDate)} to ${formatDate(endDate)}</h2>
          <p style="font-style: italic; color: #666;">Generated on ${formatDate(new Date().toISOString().split('T')[0])}</p>
        </div>
        
        <div style="margin-bottom: 30px; background-color: rgba(48, 206, 228, 0.1); padding: 15px; border-radius: 10px;">
          <h3 style="color: #1ca7bc; margin-top: 0;">Summary</h3>
          <div style="display: flex; justify-content: space-between;">
            <div style="flex: 1; text-align: center; padding: 10px;">
              <p style="font-size: 14px; color: #666; margin: 0;">Total Attendance</p>
              <p style="font-size: 24px; font-weight: bold; color: #30cee4; margin: 5px 0;">${totalAttendance}</p>
            </div>
            <div style="flex: 1; text-align: center; padding: 10px;">
              <p style="font-size: 14px; color: #666; margin: 0;">Unique Children</p>
              <p style="font-size: 24px; font-weight: bold; color: #30cee4; margin: 5px 0;">${uniqueChildren}</p>
            </div>
            <div style="flex: 1; text-align: center; padding: 10px;">
              <p style="font-size: 14px; color: #666; margin: 0;">First Timers</p>
              <p style="font-size: 24px; font-weight: bold; color: #fb7610; margin: 5px 0;">${registeredCount || 0}</p>
            </div>
          </div>
        </div>
        
        <h3 style="color: #1ca7bc;">Service Breakdown</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Service</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Attendance</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">First Timers</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Age 4-5</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Age 6-7</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Age 8-9</th>
            <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Age 10-12</th>
          </tr>
          ${Object.entries(serviceData).map(([service, data]) => `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">${service}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${data.attendance}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${data.firstTimers}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${data.age4_5}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${data.age6_7}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${data.age8_9}</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${data.age10_12}</td>
            </tr>
          `).join('')}
          <tr style="background-color: rgba(48, 206, 228, 0.1); font-weight: bold;">
            <td style="padding: 10px; border: 1px solid #ddd;">Totals</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${totalAttendance}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${registeredCount || 0}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${Object.values(serviceData).reduce((sum, data) => sum + data.age4_5, 0)}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${Object.values(serviceData).reduce((sum, data) => sum + data.age6_7, 0)}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${Object.values(serviceData).reduce((sum, data) => sum + data.age8_9, 0)}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${Object.values(serviceData).reduce((sum, data) => sum + data.age10_12, 0)}</td>
          </tr>
        </table>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #ddd; font-size: 12px; color: #999; text-align: center;">
          This is an automatically generated report from the NextGen Ministry System.
          <br>For questions, please contact the ministry administrator.
        </div>
      `;
      
      // Append to body temporarily for rendering (hidden)
      document.body.appendChild(reportElement);
      reportElement.style.position = 'absolute';
      reportElement.style.left = '-9999px';
      
      // Generate PDF using html2canvas and jsPDF
      const canvas = await html2canvas(reportElement, { 
        scale: 1.5, // Higher scale for better quality
        logging: false,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Create PDF (A4 size)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      // If content is too tall for one page, add more pages
      if (pdfHeight > pdf.internal.pageSize.getHeight()) {
        let heightLeft = pdfHeight;
        let position = 0;
        
        pdf.addPage();
        heightLeft -= pdf.internal.pageSize.getHeight();
        position -= pdf.internal.pageSize.getHeight();
        
        while (heightLeft >= 0) {
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pdf.internal.pageSize.getHeight();
          position -= pdf.internal.pageSize.getHeight();
          
          if (heightLeft > 0) {
            pdf.addPage();
          }
        }
      }
      
      // Generate filename from the week start date
      const filename = `weekly_${startDate.replace(/-/g, '')}.pdf`;
      
      // Clean up the temporary element
      document.body.removeChild(reportElement);
      
      // Upload to Firebase Storage
      const pdfBlob = await pdf.output('blob');
      const storageRef = ref(storage, `NextGen/weekly-reports-pdf/${filename}`);
      
      await uploadBytes(storageRef, pdfBlob);
      const pdfUrl = await getDownloadURL(storageRef);
      
      console.log('PDF generated and uploaded:', pdfUrl);
      
      // Update the weekly_reports table with the PDF URL in Supabase format
      await supabase
        .from('weekly_reports')
        .update({
          report_pdf_url: `reports/weekly_${startDate.replace(/-/g, '')}.pdf`
        })
        .eq('report_id', reportId);
      
      return pdfUrl;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
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

  // Export data functionality
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
      Swal.fire({
        icon: 'warning',
        title: 'No Data',
        text: 'There is no data available to export',
        confirmButtonColor: '#30cee4'
      });
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
    
    // Show success notification
    Swal.fire({
      icon: 'success',
      title: 'Export Complete',
      text: `Data exported to ${filename}`,
      timer: 1500,
      timerProgressBar: true,
      showConfirmButton: false
    });
  };

  // Handlers for tab switching
  const handleTabChange = (tab) => {
    setReportType(tab);
    if (['attendance', 'growth', 'age'].includes(tab)) {
      updateChartData(tab, reportData.attendance, reportData.growth, reportData.age);
    }
  };

  // Add this function to your ReportsPage component
  const updateChartData = useCallback((type, attendanceData, growthData, ageData) => {
    console.log('Updating chart data for:', type);
    
    if (type === 'attendance') {
      const groupedData = groupDataByTimeRange(attendanceData, 'attendance_date', 'total_children');
      
      setChartData({
        labels: groupedData.map(item => item.label),
        datasets: [
          {
            label: 'Total Attendance',
            data: groupedData.map(item => item.value),
            backgroundColor: 'rgba(87, 28, 31, 0.7)',
            borderColor: '#571C1F',
            borderWidth: 1,
            tension: 0.3
          },
          {
            label: 'First Time Visitors',
            data: groupDataByTimeRange(attendanceData, 'attendance_date', 'first_timers').map(item => item.value),
            backgroundColor: 'rgba(33, 90, 117, 0.7)',
            borderColor: '#215A75',
            borderWidth: 1,
            tension: 0.3
          }
        ]
      });
    } 
    else if (type === 'growth') {
      // For growth trend chart
      const services = [...new Set(growthData.map(item => item.service_name))];
      const months = [...new Set(growthData.map(item => item.month))].sort();
      
      const datasets = services.map((service, index) => {
        const serviceData = months.map(month => {
          const record = growthData.find(item => item.service_name === service && item.month === month);
          return record ? record.growth_percent : 0;
        });
        
        // Generate a color based on index
        const hue = (index * 137) % 360; // Golden ratio approximation for good color distribution
        
        return {
          label: service,
          data: serviceData,
          backgroundColor: `hsla(${hue}, 70%, 50%, 0.7)`,
          borderColor: `hsl(${hue}, 70%, 45%)`,
          borderWidth: 1,
          tension: 0.3
        };
      });
      
      setChartData({
        labels: months.map(month => {
          const date = new Date(month + '-01');
          return date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
        }),
        datasets
      });
    }
    else if (type === 'age') {
      // For age distribution chart
      const ageGroups = {};
      
      ageData.forEach(item => {
        if (!ageGroups[item.age_category]) {
          ageGroups[item.age_category] = 0;
        }
        ageGroups[item.age_category] += item.attendance_count;
      });
      
      // NextGen theme colors for age groups
      const backgroundColors = [
        'rgba(87, 28, 31, 0.7)',  // NextGen primary
        'rgba(33, 90, 117, 0.7)',  // NextGen blue
        'rgba(168, 48, 55, 0.7)',  // NextGen accent
        'rgba(58, 129, 159, 0.7)',  // NextGen secondary blue
        'rgba(237, 137, 62, 0.7)'  // NextGen orange
      ];
      
      setChartData({
        labels: Object.keys(ageGroups),
        datasets: [
          {
            data: Object.values(ageGroups),
            backgroundColor: backgroundColors.slice(0, Object.keys(ageGroups).length),
            borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
            borderWidth: 1
          }
        ]
      });
    }
  }, [groupDataByTimeRange]);

  // Add this function as well
  const handleDatePreset = (preset) => {
    const today = new Date();
    
    switch(preset) {
      case 'last7days': {
        const start = new Date();
        start.setDate(today.getDate() - 7);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      }
      case 'last30days': {
        const start = new Date();
        start.setDate(today.getDate() - 30);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      }
      case 'thisMonth': {
        // First day of current month
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        // Last day of current month
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]); // Fix: Set to last day of month
        break;
      }
      case 'last3months': {
        // Three months ago
        const start = new Date();
        start.setMonth(today.getMonth() - 3);
        start.setDate(1); // First day of that month
        setStartDate(start.toISOString().split('T')[0]);
        // Current date as end date
        setEndDate(today.toISOString().split('T')[0]); 
        break;
      }
      default:
        break;
    }
  };

  // Add these helper functions to your ReportsPage component, before the return statement

  // Generate data for the attendance pattern chart
  const generateAttendancePatternData = (attendanceData) => {
    if (!attendanceData || attendanceData.length === 0) return { labels: [], datasets: [] };
    
    // Group attendance by child_id
    const childAttendanceMap = {};
    
    attendanceData.forEach(record => {
      if (!childAttendanceMap[record.child_id]) {
        childAttendanceMap[record.child_id] = 0;
      }
      childAttendanceMap[record.child_id]++;
    });
    
    // Categorize attendance frequencies
    const patterns = {
      'One-time': 0,
      'Occasional (2-3)': 0,
      'Regular (4-7)': 0,
      'Frequent (8+)': 0
    };
    
    Object.values(childAttendanceMap).forEach(count => {
      if (count === 1) patterns['One-time']++;
      else if (count >= 2 && count <= 3) patterns['Occasional (2-3)']++;
      else if (count >= 4 && count <= 7) patterns['Regular (4-7)']++;
      else patterns['Frequent (8+)']++;
    });
    
    return {
      labels: Object.keys(patterns),
      datasets: [
        {
          data: Object.values(patterns),
          backgroundColor: [
            'rgba(48, 206, 228, 0.7)',  // NextGen blue - one-time
            'rgba(251, 118, 16, 0.7)',  // NextGen orange - occasional
            'rgba(92, 215, 233, 0.7)',  // NextGen blue light - regular
            'rgba(230, 99, 0, 0.7)',    // NextGen orange dark - frequent
          ],
          borderColor: [
            '#30cee4', // NextGen blue
            '#fb7610', // NextGen orange
            '#5cd7e9', // NextGen blue light
            '#e66300', // NextGen orange dark
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  // Generate data and stats for service comparison chart
  const generateServiceStats = (serviceData) => {
    if (!serviceData || serviceData.length === 0) {
      return { topService: null, fastestGrowing: null };
    }
    
    // Get unique services
    const services = [...new Set(serviceData.map(item => item.service_name))];
    
    // Aggregate data by service
    const serviceStats = services.map(service => {
      const serviceItems = serviceData.filter(item => item.service_name === service);
      const total = serviceItems.reduce((sum, item) => sum + item.monthly_attendance, 0);
      const monthCount = serviceItems.length;
      const growth = calculateServiceGrowth(serviceItems);
      
      return {
        service,
        total,
        average: monthCount > 0 ? total / monthCount : 0,
        growth
      };
    });
    
    // Find top performing service and fastest growing
    if (serviceStats.length > 0) {
      const topByAttendance = serviceStats.reduce((max, curr) => 
        curr.average > max.average ? curr : max, serviceStats[0]);
      
      const topByGrowth = serviceStats.reduce((max, curr) => 
        curr.growth > max.growth ? curr : max, serviceStats[0]);
      
      return {
        topService: topByAttendance,
        fastestGrowing: topByGrowth
      };
    }
    
    return { topService: null, fastestGrowing: null };
  };

  // Calculate growth rate for a service
  const calculateServiceGrowth = (serviceItems) => {
    if (serviceItems.length < 2) return 0;
    
    // Sort by month ascending
    const sorted = [...serviceItems].sort((a, b) => {
      return new Date(a.month + '-01') - new Date(b.month + '-01');
    });
    
    // Use first and last month to calculate growth rate
    const firstMonth = sorted[0];
    const lastMonth = sorted[sorted.length - 1];
    
    if (firstMonth.monthly_attendance === 0) return 0;
    
    return Math.round(
      ((lastMonth.monthly_attendance - firstMonth.monthly_attendance) / 
        firstMonth.monthly_attendance) * 100
    );
  };

  // Generate chart data for service comparison
  const generateServiceComparisonData = (serviceData) => {
    if (!serviceData || serviceData.length === 0) {
      return { labels: [], datasets: [] };
    }
    
    // Get unique services and their stats
    const services = [...new Set(serviceData.map(item => item.service_name))];
    const serviceStats = services.map(service => {
      const serviceItems = serviceData.filter(item => item.service_name === service);
      const monthCount = serviceItems.length;
      const total = serviceItems.reduce((sum, item) => sum + item.monthly_attendance, 0);
      const growth = calculateServiceGrowth(serviceItems);
      
      return {
        service,
        average: monthCount > 0 ? Math.round(total / monthCount) : 0,
        growth
      };
    });
    
    return {
      labels: serviceStats.map(item => item.service),
      datasets: [
        {
          label: 'Average Attendance',
          data: serviceStats.map(item => item.average),
          backgroundColor: 'rgba(48, 206, 228, 0.7)', // NextGen blue
          borderColor: '#30cee4',
          borderWidth: 2,
          order: 1
        },
        {
          label: 'Growth Rate (%)',
          data: serviceStats.map(item => item.growth),
          backgroundColor: 'rgba(251, 118, 16, 0.7)', // NextGen orange
          borderColor: '#fb7610',
          borderWidth: 2,
          type: 'line',
          yAxisID: 'y1',
          order: 0
        }
      ]
    };
  };

  // Add this function before the return statement in your ReportsPage component

  // Generate chart options based on report type
  const getChartOptions = (type) => {
    switch (type) {
      case 'attendance':
        return {
          scales: {
            y: {
              title: {
                display: true,
                text: 'Number of Children',
                font: {
                  size: 12,
                  weight: 'medium'
                }
              }
            },
            x: {
              title: {
                display: true,
                text: 'Time Period',
                font: {
                  size: 12,
                  weight: 'medium'
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  const value = context.raw;
                  return `${label}: ${value}`;
                }
              }
            }
          }
        };
      
      case 'growth':
        return {
          scales: {
            y: {
              title: {
                display: true,
                text: 'Growth Percentage',
                font: {
                  size: 12,
                  weight: 'medium'
                }
              }
            },
            x: {
              title: {
                display: true,
                text: 'Month',
                font: {
                  size: 12,
                  weight: 'medium'
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  const value = context.raw;
                  return `${label}: ${value}%`;
                }
              }
            }
          }
        };
      
      case 'age':
        return {
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                  const percentage = total > 0 ? Math.round((context.raw / total) * 100) : 0;
                  return `${context.label}: ${context.raw} (${percentage}%)`;
                }
              }
            },
            legend: {
              position: 'right',
              labels: {
                padding: 20,
                usePointStyle: true,
                generateLabels: function(chart) {
                  const data = chart.data;
                  if (data.labels.length && data.datasets.length) {
                    const labels = data.labels.map((label, i) => {
                      const meta = chart.getDatasetMeta(0);
                      const style = meta.controller.getStyle(i);
                      const total = data.datasets[0].data.reduce((sum, val) => sum + val, 0);
                      const percentage = total > 0 ? Math.round((data.datasets[0].data[i] / total) * 100) : 0;

                      return {
                        text: `${label} (${percentage}%)`,
                        fillStyle: style.backgroundColor,
                        strokeStyle: style.borderColor,
                        lineWidth: style.borderWidth,
                        hidden: isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                        index: i
                      };
                    });

                    return labels;
                  }
                  return [];
                }
              }
            },
            datalabels: {
              display: true,
              color: '#fff',
              font: {
                weight: 'bold',
                size: 11
              },
              formatter: (value, context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = Math.round((value / total) * 100);
                return percentage > 5 ? `${percentage}%` : '';
              }
            }
          }
        };
      
      default:
        return {};
    }
  };

  return (
    <div className="page-container">
      <Card
        variant="default"
        title="Reports & Analytics"
        titleColor="text-nextgen-blue-dark"
        className="mb-6"
        animate
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      >
        <motion.div 
          className="px-1 py-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Filters Section - Styled like AttendancePage */}
          {/* Improved Filters Section */}
        <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm mb-6">
          {/* Header with title and action buttons */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-nextgen-blue-dark">
              Data Filters
            </h3>
            
            {/* Action Buttons - Positioned in the header */}
            <div>
              {reportType !== 'dashboard' && reportType !== 'weekly' && (
                <Button 
                  variant="primary"
                  onClick={exportData}
                  disabled={loading}
                >
                  <svg className="h-4 w-4 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Export Data</span>
                </Button>
              )}
              
              {reportType === 'weekly' && (
                <Button 
                  variant="primary"
                  onClick={handleGenerateReport}
                  disabled={loading}
                >
                  <svg className="h-4 w-4 mr-2 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Generate Report</span>
                </Button>
              )}
            </div>
          </div>

          {/* First row - 4 column grid layout to utilize all space */}
          <div className="grid grid-cols-4 gap-4 mb-1">
            {/* Time Interval */}
            <div>
              <label htmlFor="time-interval" className="block text-sm font-medium text-gray-700 mb-1">
                Time Interval
              </label>
              <Input
                type="select"
                id="time-interval"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' }
                ]}
              />
            </div>
            
            {/* Start Date */}
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                id="start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            {/* End Date */}
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <Input
                type="date"
                id="end-date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            
            {/* Quick Select - More compact layout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quick Select
              </label>
              <div className="flex flex-wrap gap-1 h-[38px]">
                <Button 
                  variant="outline" 
                  size="xs"
                  onClick={() => handleDatePreset('last7days')}
                  className="text-xs px-2 py-1"
                >
                  7d
                </Button>
                <Button 
                  variant="outline" 
                  size="xs"
                  onClick={() => handleDatePreset('last30days')}
                  className="text-xs px-2 py-1"
                >
                  30d
                </Button>
                <Button 
                  variant="outline" 
                  size="xs"
                  onClick={() => handleDatePreset('thisMonth')}
                  className="text-xs px-2 py-1"
                >
                  This Month
                </Button>
                <Button 
                  variant="outline" 
                  size="xs"
                  onClick={() => handleDatePreset('last3months')}
                  className="text-xs px-2 py-1"
                >
                  3 Months
                </Button>
              </div>
            </div>
          </div>

          {/* Second row - Current period indicator */}
          <div className="bg-nextgen-blue/5 px-3 py-2 rounded-md flex items-center">
            <svg className="h-4 w-4 mr-2 text-nextgen-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-nextgen-blue-dark">
              <span className="font-medium">Current Period:</span> {formatDate(startDate, { month: 'short', day: 'numeric' })} - {formatDate(endDate, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

          {/* Modern Tab Navigation */}
          <div className="mb-6 overflow-hidden">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="flex overflow-x-auto scrollbar-hide p-1">
                {tabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      flex items-center px-4 py-2.5 rounded-md transition-all duration-200 whitespace-nowrap mx-0.5
                      ${reportType === tab.id
                        ? 'bg-nextgen-blue text-white shadow-md'
                        : 'text-gray-700 hover:bg-nextgen-blue/5'}
                    `}
                    whileHover={reportType !== tab.id ? { scale: 1.03 } : {}}
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="mr-1.5">{tab.icon}</span>
                    <span className="text-sm font-medium">{tab.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Content Views - Dashboard */}
          <AnimatePresence mode="wait">
            {reportType === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Summary Cards - Streamlined with just 4 essential cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Card 1: Total Children */}
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, delay: 0.1 }}
  >
    <Card className="hover:shadow-md transition-shadow duration-300">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-nextgen-blue/10 rounded-md p-3">
            <svg className="h-6 w-6 text-nextgen-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="ml-5">
            <p className="text-sm font-medium text-gray-500">Total Children</p>
            <p className="text-2xl font-semibold text-nextgen-blue-dark">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                reportData.totalStats?.totalChildren || 0
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">All children</p>
          </div>
        </div>
      </div>
    </Card>
  </motion.div>
  
  {/* Card 2: First-Timers (New Registrations) */}
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, delay: 0.2 }}
  >
    <Card className="hover:shadow-md transition-shadow duration-300">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-green-700/10 rounded-md p-3">
            <svg className="h-6 w-6 text-green-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div className="ml-5">
            <p className="text-sm font-medium text-gray-500">First-Timers</p>
            <p className="text-2xl font-semibold text-green-700">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                reportData.registeredCount || 0
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">New registrations</p>
          </div>
        </div>
      </div>
    </Card>
  </motion.div>
  
  {/* Card 3: Total Attendance */}
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, delay: 0.3 }}
  >
    <Card className="hover:shadow-md transition-shadow duration-300">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-nextgen-blue-dark/10 rounded-md p-3">
            <svg className="h-6 w-6 text-nextgen-blue-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-5">
            <p className="text-sm font-medium text-gray-500">Total Attendance</p>
            <p className="text-2xl font-semibold text-nextgen-blue-dark">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                reportData.attendance?.reduce((sum, item) => sum + item.total_children, 0) || 0
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">All check-ins</p>
          </div>
        </div>
      </div>
    </Card>
  </motion.div>

  {/* Card 4: Services */}
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, delay: 0.4 }}
  >
    <Card className="hover:shadow-md transition-shadow duration-300">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-nextgen-orange-dark/10 rounded-md p-3">
            <svg className="h-6 w-6 text-nextgen-orange-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="ml-5">
            <p className="text-sm font-medium text-gray-500">Services</p>
            <p className="text-2xl font-semibold text-nextgen-orange-dark">
              {loading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                reportData.raw?.length > 0 ? 
                  new Set(reportData.raw.map(item => item.service_id)).size :
                  0
              )}
            </p>
            <p className="text-xs text-gray-500 mt-1">Active services</p>
          </div>
        </div>
      </div>
    </Card>
  </motion.div>
</div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Attendance Pattern Chart */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <Card className="h-full hover:shadow-md transition-shadow duration-300">
                      <div className="p-5">
                        <div className="mb-4">
                          <h3 className="text-lg font-medium text-nextgen-blue-dark">Attendance Patterns</h3>
                          <p className="text-sm text-gray-500">How frequently children attend services</p>
                        </div>
                        
                        {loading || !reportData.raw?.length ? (
                          <div className="flex justify-center items-center h-64">
                            {loading ? (
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-blue"></div>
                            ) : (
                              <p className="text-gray-500">No attendance data available</p>
                            )}
                          </div>
                        ) : (
                          <>
                            <NextGenChart
                              type="doughnut"
                              height="240px"
                              data={generateAttendancePatternData(reportData.raw)}
                              options={{
                                cutout: '65%',
                                plugins: {
                                  tooltip: {
                                    callbacks: {
                                      label: function(context) {
                                        const value = context.raw;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                        return `${context.label}: ${value} (${percentage}%)`;
                                      }
                                    }
                                  },
                                  legend: {
                                    position: 'bottom',
                                    labels: {
                                      padding: 20,
                                      usePointStyle: true,
                                    }
                                  }
                                }
                              }}
                              enableDownload
                              downloadFilename="attendance-patterns"
                            />
                            
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="text-xs text-gray-500">
                                <p><span className="font-medium text-[#30cee4]">One-time:</span> Attended only once</p>
                                <p><span className="font-medium text-[#fb7610]">Occasional:</span> Attended 2-3 times</p>
                                <p><span className="font-medium text-[#5cd7e9]">Regular:</span> Attended 4-7 times</p>
                                <p><span className="font-medium text-[#e66300]">Frequent:</span> Attended 8+ times</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                  
                  {/* Service Comparison Chart */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <Card className="h-full hover:shadow-md transition-shadow duration-300">
                      <div className="p-5">
                        <div className="mb-4">
                          <h3 className="text-lg font-medium text-nextgen-blue-dark">Service Comparison</h3>
                          <p className="text-sm text-gray-500">Attendance and growth by service</p>
                        </div>
                        
                        {loading || !reportData.growth?.length ? (
                          <div className="flex justify-center items-center h-64">
                            {loading ? (
                              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-blue"></div>
                            ) : (
                              <p className="text-gray-500">No service data available</p>
                            )}
                          </div>
                        ) : (
                          <>
                            {/* Service stats cards */}
                            {generateServiceStats(reportData.growth).topService && generateServiceStats(reportData.growth).fastestGrowing && (
                              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="bg-nextgen-blue/5 p-3 rounded-md">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-nextgen-blue-dark">
                                      Highest Attendance
                                    </p>
                                    <Badge variant="primary" size="sm">
                                      {Math.round(generateServiceStats(reportData.growth).topService.average)} avg
                                    </Badge>
                                  </div>
                                  <p className="text-base font-semibold mt-1 truncate">
                                    {generateServiceStats(reportData.growth).topService.service}
                                  </p>
                                </div>
                                
                                <div className="bg-nextgen-orange/5 p-3 rounded-md">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-nextgen-orange-dark">
                                      Fastest Growing
                                    </p>
                                    <Badge 
                                      variant={generateServiceStats(reportData.growth).fastestGrowing.growth > 0 ? "success" : "danger"}
                                      size="sm"
                                    >
                                      {generateServiceStats(reportData.growth).fastestGrowing.growth}%
                                    </Badge>
                                  </div>
                                  <p className="text-base font-semibold mt-1 truncate">
                                    {generateServiceStats(reportData.growth).fastestGrowing.service}
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            <NextGenChart
                              type="bar"
                              height="240px"
                              data={generateServiceComparisonData(reportData.growth)}
                              options={{
                                responsive: true,
                                interaction: {
                                  mode: 'index',
                                  intersect: false,
                                },
                                scales: {
                                  y: {
                                    position: 'left',
                                    beginAtZero: true,
                                    title: {
                                      display: true,
                                      text: 'Average Attendance',
                                      color: '#30cee4'
                                    },
                                    ticks: {
                                      font: {
                                        family: "system-ui, Avenir, Helvetica, Arial, sans-serif"
                                      }
                                    },
                                    grid: {
                                      color: 'rgba(0, 0, 0, 0.05)'
                                    }
                                  },
                                  y1: {
                                    position: 'right',
                                    beginAtZero: true,
                                    title: {
                                      display: true,
                                      text: 'Growth Rate (%)',
                                      color: '#fb7610'
                                    },
                                    ticks: {
                                      callback: function(value) {
                                        return value + '%';
                                      }
                                    },
                                    grid: {
                                      drawOnChartArea: false
                                    }
                                  }
                                }
                              }}
                              enableDownload
                              downloadFilename="service-comparison"
                            />
                          </>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                </div>

                {/* Recent Reports */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <Card>
                    <div className="p-6">
                      <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">Recent Weekly Reports</h3>
                      
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
                                <motion.tr 
                                  key={report.report_id} 
                                  className="hover:bg-gray-50"
                                  whileHover={{ backgroundColor: 'rgba(48, 206, 228, 0.05)' }}
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {formatDate(report.week_start_date, { month: 'short', day: 'numeric' })} - {formatDate(report.week_end_date, { month: 'short', day: 'numeric', year: 'numeric' })}
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
                                        className="text-nextgen-blue hover:text-nextgen-blue-dark flex items-center"
                                      >
                                        <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        View PDF
                                      </a>
                                    ) : (
                                      <span className="text-gray-400 flex items-center">
                                        <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                        </svg>
                                        No PDF
                                      </span>
                                    )}
                                  </td>
                                </motion.tr>
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
                </motion.div>
              </motion.div>
            )}

            {/* Chart Views */}
            {(reportType === 'attendance' || reportType === 'growth' || reportType === 'age') && (
              <motion.div
                key={reportType}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-medium text-nextgen-blue-dark mb-4">
                    {reportType === 'attendance' ? 'Attendance Overview' : 
                    reportType === 'growth' ? 'Growth Trend Analysis' : 'Age Distribution'}
                  </h3>
                  
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-blue"></div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg h-96">
                      {/* Use NextGenChart directly instead of ReportChart */}
                      <NextGenChart 
                        type={reportType === 'age' ? 'pie' : 'line'}
                        data={chartData}
                        options={getChartOptions(reportType)}
                        enableDownload
                        downloadFilename={`${reportType}-report`}
                      />
                    </div>
                  )}
                </div>
                
                {/* Extra information box */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                  className="mt-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                >
                  <h4 className="text-sm font-semibold text-nextgen-blue-dark mb-2">
                    {reportType === 'attendance' ? 'About Attendance Data' : 
                    reportType === 'growth' ? 'About Growth Trends' : 'About Age Distribution'}
                  </h4>
                  
                  <p className="text-sm text-gray-600">
                    {reportType === 'attendance' 
                      ? 'This chart shows the total number of children and first-time visitors for each time period. Use it to track attendance patterns and identify peak days.'
                      : reportType === 'growth'
                        ? 'This chart displays attendance growth across different services over time. Compare services to identify which ones are growing most rapidly.'
                        : 'This chart shows the distribution of children by age group. Use it to ensure your programming is appropriate for your demographic mix.'
                    }
                  </p>
                  
                  {reportType === 'attendance' && (
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div className="bg-nextgen-blue/5 p-3 rounded-md">
                        <p className="text-sm font-medium text-nextgen-blue-dark">
                          Average Attendance
                        </p>
                        <p className="text-xl font-semibold mt-1">
                          {loading ? '-' : Math.round(reportData.attendance.reduce((sum, item) => sum + item.total_children, 0) / Math.max(1, reportData.attendance.length))}
                        </p>
                      </div>
                      
                      <div className="bg-nextgen-orange/5 p-3 rounded-md">
                        <p className="text-sm font-medium text-nextgen-orange-dark">
                          First-timer %
                        </p>
                        <p className="text-xl font-semibold mt-1">
                          {loading ? '-' : (reportData.attendance.reduce((sum, item) => sum + item.first_timers, 0) / Math.max(1, reportData.attendance.reduce((sum, item) => sum + item.total_children, 0)) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* Weekly Reports View */}
            {reportType === 'weekly' && (
              <motion.div
                key="weekly"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <WeeklyReportsList onGenerateReport={handleGenerateReport} triggerRefresh={reportRefreshTrigger} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Card>
    </div>
  );
};

export default ReportsPage;