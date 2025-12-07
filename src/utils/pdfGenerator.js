import { jsPDF } from 'jspdf';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { formatDate } from './dateUtils.js';

/**
 * Generate Weekly Report PDF using jsPDF with Chart.js canvas capture
 * Modern, minimalist corporate design
 * 
 * @param {string} reportId - The ID of the report to generate
 * @param {string} startDate - Week start date (YYYY-MM-DD)
 * @param {string} endDate - Week end date (YYYY-MM-DD)
 * @param {Object} storage - Firebase storage instance
 * @param {Object} supabase - Supabase client instance
 * @param {Function} fetchAttendanceData - Function to fetch attendance data
 * @param {Function} fetchAgeDistributionData - Function to fetch age distribution data
 * @param {Function} fetchRegisteredChildrenCount - Function to fetch registered children count
 * @param {Function} fetchRawAttendanceData - Function to fetch raw attendance data
 * @param {Function} fetchGrowthData - Function to fetch growth data
 * @param {Function} fetchWithCache - Function to fetch data with caching
 * @param {boolean} shouldCaptureCharts - Whether to attempt canvas chart capture
 * @returns {Promise<string>} The URL of the uploaded PDF
 */
export const generateWeeklyReportPDF = async (
  reportId,
  startDate, 
  endDate,
  storage,
  supabase,
  fetchAttendanceData,
  fetchAgeDistributionData,
  fetchRegisteredChildrenCount,
  fetchRawAttendanceData,
  fetchGrowthData,
  fetchWithCache,
  shouldCaptureCharts = false
) => {
  try {
    // Fetch all the data needed for the report
    const [attendanceData, ageData, registeredCount, rawData, growthData] = await Promise.all([
      fetchWithCache('attendance_pdf', () => fetchAttendanceData(startDate, endDate)),
      fetchWithCache('age_pdf', () => fetchAgeDistributionData(startDate, endDate)),
      fetchWithCache('registered_pdf', () => fetchRegisteredChildrenCount(startDate, endDate)),
      fetchWithCache('raw_pdf', () => fetchRawAttendanceData(startDate, endDate)),
      fetchWithCache('growth_pdf', () => fetchGrowthData(startDate, endDate)),
    ]);
    
    // Capture chart screenshots by creating temporary canvas elements
    let chartImages = {};
    if (shouldCaptureCharts) {
      console.log('Capturing chart screenshots from temporary canvas...');
      
      try {
        // Import Chart.js dynamically
        const { Chart } = await import('chart.js/auto');
        
        // Generate attendance pattern chart
        const attendancePatternData = {
          labels: [],
          datasets: []
        };
        
        // Process attendance patterns from rawData
        const childAttendanceMap = {};
        if (rawData) {
          rawData.forEach(record => {
            if (!childAttendanceMap[record.child_id]) {
              childAttendanceMap[record.child_id] = 0;
            }
            childAttendanceMap[record.child_id]++;
          });
        }
        
        const attendancePatterns = [
          { label: 'One-time', count: 0, color: 'rgba(48, 206, 228, 0.7)' },
          { label: 'Occasional (2-3)', count: 0, color: 'rgba(251, 118, 16, 0.7)' },
          { label: 'Regular (4-7)', count: 0, color: 'rgba(92, 215, 233, 0.7)' },
          { label: 'Frequent (8+)', count: 0, color: 'rgba(230, 99, 0, 0.7)' }
        ];
        
        Object.values(childAttendanceMap).forEach(count => {
          if (count === 1) attendancePatterns[0].count++;
          else if (count >= 2 && count <= 3) attendancePatterns[1].count++;
          else if (count >= 4 && count <= 7) attendancePatterns[2].count++;
          else attendancePatterns[3].count++;
        });
        
        attendancePatternData.labels = attendancePatterns.map(p => p.label);
        attendancePatternData.datasets = [{
          data: attendancePatterns.map(p => p.count),
          backgroundColor: attendancePatterns.map(p => p.color),
          borderColor: [
            '#30cee4', // NextGen blue
            '#fb7610', // NextGen orange
            '#5cd7e9', // NextGen blue light
            '#e66300'  // NextGen orange dark
          ],
          borderWidth: 1
        }];
        
        // Create temporary canvas for attendance pattern chart
        if (attendancePatternData.labels.length > 0) {
          const chartCanvas = document.createElement('canvas');
          chartCanvas.width = 1200;
          chartCanvas.height = 800;
          document.body.appendChild(chartCanvas);
          chartCanvas.style.position = 'absolute';
          chartCanvas.style.left = '-9999px';
          
          const attendanceChart = new Chart(chartCanvas, {
            type: 'doughnut',
            data: attendancePatternData,
            options: {
              responsive: false,
              animation: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    padding: 20,
                    font: { size: 14 }
                  }
                }
              }
            }
          });
          
          // Wait for chart to render
          await new Promise(resolve => setTimeout(resolve, 500));
          
          chartImages.attendancePattern = chartCanvas.toDataURL('image/png');
          console.log('Attendance pattern chart captured from temporary canvas');
          
          // Clean up
          attendanceChart.destroy();
          document.body.removeChild(chartCanvas);
        }
        
        // Generate age distribution chart
        const ageGroups = {};
        if (ageData && ageData.length > 0) {
          ageData.forEach(item => {
            const category = item.age_category;
            if (!ageGroups[category]) {
              ageGroups[category] = 0;
            }
            ageGroups[category] += item.count || 0;
          });
          
          // Create temporary canvas for age distribution chart
          if (Object.keys(ageGroups).length > 0) {
            const chartCanvas = document.createElement('canvas');
            chartCanvas.width = 1200;
            chartCanvas.height = 800;
            document.body.appendChild(chartCanvas);
            chartCanvas.style.position = 'absolute';
            chartCanvas.style.left = '-9999px';
            
            const ageChart = new Chart(chartCanvas, {
              type: 'pie',
              data: {
                labels: Object.keys(ageGroups),
                datasets: [{
                  data: Object.values(ageGroups),
                  backgroundColor: [
                    'rgba(48, 206, 228, 0.7)',
                    'rgba(251, 118, 16, 0.7)',
                    'rgba(92, 215, 233, 0.7)',
                    'rgba(230, 99, 0, 0.7)',
                    'rgba(28, 167, 188, 0.7)',
                    'rgba(252, 149, 68, 0.7)'
                  ],
                  borderColor: [
                    '#30cee4',
                    '#fb7610',
                    '#5cd7e9',
                    '#e66300',
                    '#1ca7bc',
                    '#fc9544'
                  ],
                  borderWidth: 1
                }]
              },
              options: {
                responsive: false,
                animation: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      padding: 15,
                      font: { size: 12 }
                    }
                  }
                }
              }
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            chartImages.ageDistribution = chartCanvas.toDataURL('image/png');
            console.log('Age distribution chart captured from temporary canvas');
            
            ageChart.destroy();
            document.body.removeChild(chartCanvas);
          }
        }
        
        // Generate service comparison / growth chart
        if (growthData && growthData.length > 0) {
          const services = [...new Set(growthData.map(item => item.service_name))];
          const serviceStats = services.map(service => {
            const serviceItems = growthData.filter(item => item.service_name === service);
            const monthCount = serviceItems.length;
            const total = serviceItems.reduce((sum, item) => sum + item.monthly_attendance, 0);
            const latestGrowth = serviceItems.length > 0 
              ? serviceItems[serviceItems.length - 1].growth_percent || 0
              : 0;
            
            return {
              service,
              average: monthCount > 0 ? Math.round(total / monthCount) : 0,
              growth: latestGrowth
            };
          });
          
          if (serviceStats.length > 0) {
            const chartCanvas = document.createElement('canvas');
            chartCanvas.width = 1200;
            chartCanvas.height = 800;
            document.body.appendChild(chartCanvas);
            chartCanvas.style.position = 'absolute';
            chartCanvas.style.left = '-9999px';
            
            const growthChart = new Chart(chartCanvas, {
              type: 'bar',
              data: {
                labels: serviceStats.map(item => item.service),
                datasets: [
                  {
                    label: 'Average Attendance',
                    data: serviceStats.map(item => item.average),
                    backgroundColor: 'rgba(48, 206, 228, 0.7)',
                    borderColor: '#30cee4',
                    borderWidth: 2,
                    yAxisID: 'y'
                  },
                  {
                    label: 'Growth Rate (%)',
                    data: serviceStats.map(item => item.growth),
                    backgroundColor: 'rgba(251, 118, 16, 0.7)',
                    borderColor: '#fb7610',
                    borderWidth: 2,
                    type: 'line',
                    yAxisID: 'y1'
                  }
                ]
              },
              options: {
                responsive: false,
                animation: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: {
                      padding: 15,
                      font: { size: 14 }
                    }
                  }
                },
                scales: {
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Average Attendance',
                      font: { size: 12 }
                    }
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Growth Rate (%)',
                      font: { size: 12 }
                    },
                    grid: {
                      drawOnChartArea: false
                    }
                  }
                }
              }
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            chartImages.serviceComparison = chartCanvas.toDataURL('image/png');
            console.log('Service comparison chart captured from temporary canvas');
            
            growthChart.destroy();
            document.body.removeChild(chartCanvas);
          }
        }
      } catch (chartError) {
        console.warn('Error capturing charts from canvas, will use fallback visualizations:', chartError);
      }
    } else {
      console.log('Chart capture disabled, using fallback charts');
    }
    
    // Process service breakdown from analytics data
    const serviceData = {};
    let totalAttendance = 0;
    let uniqueChildren = new Set();
    
    // Aggregate attendance and first timers from attendanceData (analytics)
    if (attendanceData) {
      attendanceData.forEach(record => {
        const serviceName = record.service_name || 'Unknown';
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
        
        serviceData[serviceName].attendance += record.total_children || 0;
        serviceData[serviceName].firstTimers += record.first_timers || 0;
        totalAttendance += record.total_children || 0;
      });
    }
    
    // Aggregate age distribution from ageData
    if (ageData) {
      ageData.forEach(record => {
        const serviceName = record.service_name || 'Unknown';
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
        
        const ageCategory = record.age_category;
        const count = record.count || 0;
        
        if (ageCategory.includes('4-5')) {
          serviceData[serviceName].age4_5 += count;
        } else if (ageCategory.includes('6-7')) {
          serviceData[serviceName].age6_7 += count;
        } else if (ageCategory.includes('8-9')) {
          serviceData[serviceName].age8_9 += count;
        } else if (ageCategory.includes('10-12')) {
          serviceData[serviceName].age10_12 += count;
        }
      });
    }
    
    // Count unique children from rawData
    if (rawData) {
      rawData.forEach(item => {
        uniqueChildren.add(item.child_id);
      });
    }
    
    console.log('Processed service data:', serviceData);
    
    // Process attendance patterns - look at ALL attendance, not just this week
    const childAttendanceMap = {};
    if (rawData) {
      rawData.forEach(record => {
        if (!childAttendanceMap[record.child_id]) {
          childAttendanceMap[record.child_id] = 0;
        }
        childAttendanceMap[record.child_id]++;
      });
    }
    
    const attendancePatterns = [
      { label: 'One-time', count: 0 },
      { label: 'Occasional (2-3)', count: 0 },
      { label: 'Regular (4-7)', count: 0 },
      { label: 'Frequent (8+)', count: 0 }
    ];
    
    Object.values(childAttendanceMap).forEach(count => {
      if (count === 1) attendancePatterns[0].count++;
      else if (count >= 2 && count <= 3) attendancePatterns[1].count++;
      else if (count >= 4 && count <= 7) attendancePatterns[2].count++;
      else attendancePatterns[3].count++;
    });
    
    console.log('Attendance patterns:', attendancePatterns);
    
    // Process age distribution - from ageData
    const ageDistribution = [];
    if (ageData && ageData.length > 0) {
      const ageGroups = {};
      ageData.forEach(item => {
        const category = item.age_category;
        if (!ageGroups[category]) {
          ageGroups[category] = 0;
        }
        ageGroups[category] += item.count || 0;
      });
      
      Object.entries(ageGroups).forEach(([category, count]) => {
        ageDistribution.push({ category, count });
      });
    }
    
    console.log('Age distribution:', ageDistribution);
    
    // Fetch new registrations
    const { data: newRegistrations } = await supabase
      .from('children')
      .select(`
        child_id,
        formal_id,
        first_name,
        last_name,
        birthdate,
        registration_date,
        age_categories (category_name)
      `)
      .gte('registration_date', startDate)
      .lte('registration_date', endDate)
      .order('registration_date', { ascending: false });
    
    // Fetch new guardians - get all child_guardian links with their children and guardians
    const { data: allGuardianLinks, error: guardianError } = await supabase
      .from('child_guardian')
      .select(`
        id,
        child_id,
        guardians (
          guardian_id,
          first_name,
          last_name,
          email,
          phone_number,
          relationship
        ),
        children (
          first_name,
          last_name,
          registration_date
        )
      `);
    
    if (guardianError) {
      console.error('Error fetching guardians:', guardianError);
    }
    
    // Filter to guardians whose children were registered this week and deduplicate
    const uniqueGuardians = new Map();
    (allGuardianLinks || []).forEach(item => {
      const registrationDate = item.children?.registration_date;
      const guardianId = item.guardians?.guardian_id;
      
      // Check if child was registered during this week
      if (guardianId && registrationDate && registrationDate >= startDate && registrationDate <= endDate) {
        if (!uniqueGuardians.has(guardianId)) {
          uniqueGuardians.set(guardianId, item);
        }
      }
    });
    const newGuardians = Array.from(uniqueGuardians.values());
    
    console.log('New guardians this week:', newGuardians.length);
    
    // Process growth insights
    let growthInsights = { topService: null, fastestGrowing: null };
    if (growthData && growthData.length > 0) {
      const services = [...new Set(growthData.map(item => item.service_name))];
      const serviceStats = services.map(service => {
        const serviceItems = growthData.filter(item => item.service_name === service);
        const total = serviceItems.reduce((sum, item) => sum + item.monthly_attendance, 0);
        const monthCount = serviceItems.length;
        const latestGrowth = serviceItems.length > 0 
          ? serviceItems[serviceItems.length - 1].growth_percent || 0
          : 0;
        
        return {
          service,
          total,
          average: monthCount > 0 ? total / monthCount : 0,
          growth: latestGrowth
        };
      });
      
      if (serviceStats.length > 0) {
        const topByAttendance = serviceStats.reduce((max, curr) => 
          curr.average > max.average ? curr : max, serviceStats[0]);
        const topByGrowth = serviceStats.reduce((max, curr) => 
          curr.growth > max.growth ? curr : max, serviceStats[0]);
        
        growthInsights = {
          topService: topByAttendance,
          fastestGrowing: topByGrowth
        };
      }
    }
    
    // Initialize PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;
    
    // NextGen Color Palette
    const colors = {
      primary: [48, 206, 228],      // #30cee4 - NextGen Blue (PRIMARY)
      maroon: [87, 28, 31],         // #571C1F - NextGen Maroon (accent)
      orange: [251, 118, 16],       // #fb7610 - NextGen Orange
      gray: {
        dark: [24, 24, 27],         // #18181b
        medium: [113, 113, 122],    // #71717a
        light: [161, 161, 170],     // #a1a1aa
        bg: [250, 250, 250],        // #fafafa
        border: [228, 228, 231]     // #e4e4e7
      }
    };
    
    // Helper function to add new page if needed
    const checkPageBreak = (requiredSpace) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
        return true;
      }
      return false;
    };
    
    // Helper function to draw section header
    const drawSectionHeader = (title, subtitle = '') => {
      checkPageBreak(30);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(...colors.primary); // NextGen Primary
      pdf.text(title, margin, yPosition);
      yPosition += 8;
      
      if (subtitle) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(...colors.gray.medium);
        pdf.text(subtitle, margin, yPosition);
        yPosition += 6;
      }
      
      // Draw line
      pdf.setDrawColor(...colors.gray.border);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
    };
    
    // Page 1: Header and Executive Summary
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(24);
    pdf.setTextColor(...colors.primary); // NextGen Primary
    pdf.text('NextGen Ministry', margin, yPosition);
    yPosition += 8;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(14);
    pdf.setTextColor(...colors.primary); // NextGen Blue (Primary)
    pdf.text('Weekly Report', margin, yPosition);
    yPosition += 6;
    
    pdf.setFontSize(11);
    pdf.setTextColor(...colors.gray.medium);
    pdf.text(
      `${formatDate(startDate, { month: 'long', day: 'numeric' })} - ${formatDate(endDate, { month: 'long', day: 'numeric', year: 'numeric' })}`,
      margin,
      yPosition
    );
    yPosition += 15;
    
    // Stats Cards
    const cardWidth = (pageWidth - margin * 2 - 10) / 3;
    const cardHeight = 30;
    
    // Total Attendance Card
    pdf.setFillColor(...colors.gray.bg);
    pdf.setDrawColor(...colors.primary); // NextGen Blue (Primary) border
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, yPosition, cardWidth, cardHeight, 2, 2, 'FD');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...colors.gray.medium);
    pdf.text('TOTAL ATTENDANCE', margin + 5, yPosition + 8);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(...colors.primary); // NextGen Primary
    pdf.text(totalAttendance.toString(), margin + 5, yPosition + 22);
    
    // Unique Children Card
    pdf.setFillColor(...colors.gray.bg);
    pdf.setDrawColor(...colors.primary);
    pdf.roundedRect(margin + cardWidth + 5, yPosition, cardWidth, cardHeight, 2, 2, 'FD');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...colors.gray.medium);
    pdf.text('UNIQUE CHILDREN', margin + cardWidth + 10, yPosition + 8);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(...colors.primary);
    pdf.text(uniqueChildren.size.toString(), margin + cardWidth + 10, yPosition + 22);
    
    // First Timers Card
    pdf.setFillColor(...colors.gray.bg);
    pdf.setDrawColor(...colors.orange); // Orange for first timers
    pdf.roundedRect(margin + cardWidth * 2 + 10, yPosition, cardWidth, cardHeight, 2, 2, 'FD');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor(...colors.gray.medium);
    pdf.text('FIRST TIMERS', margin + cardWidth * 2 + 15, yPosition + 8);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(...colors.orange); // Orange value
    pdf.text((registeredCount || 0).toString(), margin + cardWidth * 2 + 15, yPosition + 22);
    
    yPosition += cardHeight + 15;
    
    // Service Breakdown Table
    drawSectionHeader('Service Breakdown', 'Attendance distribution across all services during this week');
    
    // Table headers
    const colWidths = [45, 25, 22, 20, 20, 20, 25];
    const headers = ['Service', 'Attend', 'First', '4-5yr', '6-7yr', '8-9yr', '10-12yr'];
    
    pdf.setFillColor(...colors.gray.bg);
    pdf.rect(margin, yPosition, pageWidth - margin * 2, 10, 'F');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.primary); // Primary color for headers
    
    let xPos = margin + 3;
    headers.forEach((header, i) => {
      pdf.text(header.toUpperCase(), xPos, yPosition + 6);
      xPos += colWidths[i];
    });
    yPosition += 10;
    
    // Table rows
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...colors.gray.dark);
    
    Object.entries(serviceData).forEach(([service, data], index) => {
      if (index % 2 === 0) {
        pdf.setFillColor(255, 255, 255);
      } else {
        pdf.setFillColor(250, 250, 250);
      }
      pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F');
      
      xPos = margin + 3;
      pdf.setFont('helvetica', 'bold');
      pdf.text(service, xPos, yPosition + 5);
      xPos += colWidths[0];
      
      pdf.setFont('helvetica', 'normal');
      const values = [data.attendance, data.firstTimers, data.age4_5, data.age6_7, data.age8_9, data.age10_12];
      values.forEach((val, i) => {
        pdf.text(val.toString(), xPos, yPosition + 5);
        xPos += colWidths[i + 1];
      });
      
      yPosition += 8;
    });
    
    // Table footer (totals)
    pdf.setFillColor(250, 250, 250);
    pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F');
    
    pdf.setFont('helvetica', 'bold');
    xPos = margin + 3;
    pdf.text('TOTALS', xPos, yPosition + 5);
    xPos += colWidths[0];
    
    const totals = [
      totalAttendance,
      registeredCount || 0,
      Object.values(serviceData).reduce((sum, d) => sum + d.age4_5, 0),
      Object.values(serviceData).reduce((sum, d) => sum + d.age6_7, 0),
      Object.values(serviceData).reduce((sum, d) => sum + d.age8_9, 0),
      Object.values(serviceData).reduce((sum, d) => sum + d.age10_12, 0)
    ];
    
    totals.forEach((val, i) => {
      pdf.text(val.toString(), xPos, yPosition + 5);
      xPos += colWidths[i + 1];
    });
    yPosition += 15;
    
    // Page 2: Attendance Patterns
    pdf.addPage();
    yPosition = margin;
    
    drawSectionHeader(
      'Attendance Patterns Analysis',
      'Understanding attendance frequency helps identify engagement levels'
    );
    
    // Attendance pattern summary grid
    const patternTotal = attendancePatterns.reduce((sum, p) => sum + p.count, 0);
    const patternCardWidth = (pageWidth - margin * 2 - 15) / 4;
    
    attendancePatterns.forEach((pattern, index) => {
      const percent = patternTotal > 0 ? ((pattern.count / patternTotal) * 100).toFixed(1) : 0;
      const xOffset = margin + index * (patternCardWidth + 5);
      
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(228, 228, 231);
      pdf.roundedRect(xOffset, yPosition, patternCardWidth, 25, 2, 2, 'FD');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(113, 113, 122);
      const labelText = pattern.label.toUpperCase();
      const labelWidth = pdf.getTextWidth(labelText);
      pdf.text(labelText, xOffset + (patternCardWidth - labelWidth) / 2, yPosition + 6);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(24, 24, 27);
      const countText = pattern.count.toString();
      const countWidth = pdf.getTextWidth(countText);
      pdf.text(countText, xOffset + (patternCardWidth - countWidth) / 2, yPosition + 15);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(113, 113, 122);
      const percentText = `${percent}%`;
      const percentWidth = pdf.getTextWidth(percentText);
      pdf.text(percentText, xOffset + (patternCardWidth - percentWidth) / 2, yPosition + 21);
    });
    yPosition += 35;
    
    // Insights
    const insightWidth = (pageWidth - margin * 2 - 5) / 2;
    const regularCount = attendancePatterns.find(p => p.label === 'Regular (4-7)')?.count || 0;
    const oneTimeCount = attendancePatterns.find(p => p.label === 'One-time')?.count || 0;
    
    // Key Insight
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...colors.primary); // Primary (Blue) border
    pdf.setLineWidth(1);
    pdf.roundedRect(margin, yPosition, insightWidth, 30, 2, 2, 'FD');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.primary); // Primary (Blue) label
    pdf.text('KEY INSIGHT', margin + 5, yPosition + 6);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...colors.gray.dark);
    pdf.text(`${regularCount} Regular Attendees`, margin + 5, yPosition + 14);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(113, 113, 122);
    const insightText1 = 'Children attending 4-7 times show strong';
    const insightText2 = 'engagement with the ministry program.';
    pdf.text(insightText1, margin + 5, yPosition + 20);
    pdf.text(insightText2, margin + 5, yPosition + 25);
    
    // Opportunity
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(...colors.orange); // Orange border
    pdf.setLineWidth(1);
    pdf.roundedRect(margin + insightWidth + 5, yPosition, insightWidth, 30, 2, 2, 'FD');
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.orange); // Orange label
    pdf.text('OPPORTUNITY', margin + insightWidth + 10, yPosition + 6);
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...colors.gray.dark);
    pdf.text(`${oneTimeCount} One-Time Visitors`, margin + insightWidth + 10, yPosition + 14);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(113, 113, 122);
    const opportunityText1 = 'Consider follow-up strategies to encourage';
    const opportunityText2 = 'these children to return.';
    pdf.text(opportunityText1, margin + insightWidth + 10, yPosition + 20);
    pdf.text(opportunityText2, margin + insightWidth + 10, yPosition + 25);
    yPosition += 40;
    
    // Add attendance pattern chart (screenshot or drawn)
    if (chartImages.attendancePattern) {
      // Use captured chart screenshot
      const chartHeight = 120;
      const chartWidth = pageWidth - margin * 2;
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...colors.gray.dark);
      pdf.text('Attendance Frequency Distribution', margin, yPosition);
      yPosition += 8;
      
      try {
        pdf.addImage(chartImages.attendancePattern, 'PNG', margin, yPosition, chartWidth, chartHeight);
        yPosition += chartHeight + 10;
      } catch (imgError) {
        console.warn('Error adding attendance chart image, using fallback');
        // Fall back to drawn chart
        addDrawnAttendanceChart();
      }
    } else {
      // Use drawn chart as fallback
      addDrawnAttendanceChart();
    }
    
    // Helper function for drawn attendance chart
    function addDrawnAttendanceChart() {
      const chartHeight = 60;
      const chartWidth = pageWidth - margin * 2;
      const barWidth = (chartWidth - 40) / attendancePatterns.length;
      const maxCount = Math.max(...attendancePatterns.map(p => p.count), 1);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(...colors.gray.dark);
      pdf.text('Attendance Frequency Distribution', margin, yPosition);
      yPosition += 8;
      
      // Draw bars
      attendancePatterns.forEach((pattern, index) => {
        const barHeight = (pattern.count / maxCount) * (chartHeight - 20);
        const xPos = margin + 10 + (index * barWidth);
        const yPos = yPosition + (chartHeight - 20) - barHeight;
        
        // Draw bar
        pdf.setFillColor(...colors.primary);
        pdf.rect(xPos, yPos, barWidth - 10, barHeight, 'F');
        
        // Draw value on top
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(...colors.gray.dark);
        const valueText = pattern.count.toString();
        const valueWidth = pdf.getTextWidth(valueText);
        pdf.text(valueText, xPos + (barWidth - 10 - valueWidth) / 2, yPos - 2);
        
        // Draw label at bottom
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(...colors.gray.medium);
        const label = pattern.label;
        const labelWidth = pdf.getTextWidth(label);
        pdf.text(label, xPos + (barWidth - 10 - labelWidth) / 2, yPosition + chartHeight - 5);
      });
      
      // Draw baseline
      pdf.setDrawColor(...colors.gray.border);
      pdf.line(margin + 10, yPosition + (chartHeight - 20), pageWidth - margin - 10, yPosition + (chartHeight - 20));
      
      yPosition += chartHeight + 10;
    }
    
    // Page 3: Age Demographics
    pdf.addPage();
    yPosition = margin;
    
    drawSectionHeader(
      'Age Demographics',
      'Attendance breakdown by age category helps with resource allocation'
    );
    
    // Age distribution summary
    const ageTotal = ageDistribution.reduce((sum, a) => sum + a.count, 0);
    if (ageDistribution.length > 0) {
      const ageCardWidth = (pageWidth - margin * 2 - 15) / Math.min(4, ageDistribution.length);
      
      ageDistribution.slice(0, 4).forEach((age, index) => {
        const percent = ageTotal > 0 ? ((age.count / ageTotal) * 100).toFixed(1) : 0;
        const xOffset = margin + index * (ageCardWidth + 5);
        
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(228, 228, 231);
        pdf.roundedRect(xOffset, yPosition, ageCardWidth, 25, 2, 2, 'FD');
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(113, 113, 122);
        const categoryText = age.category.toUpperCase();
        const categoryWidth = pdf.getTextWidth(categoryText);
        pdf.text(categoryText, xOffset + (ageCardWidth - categoryWidth) / 2, yPosition + 6);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(24, 24, 27);
        const ageCountText = age.count.toString();
        const ageCountWidth = pdf.getTextWidth(ageCountText);
        pdf.text(ageCountText, xOffset + (ageCardWidth - ageCountWidth) / 2, yPosition + 15);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(113, 113, 122);
        const agePercentText = `${percent}%`;
        const agePercentWidth = pdf.getTextWidth(agePercentText);
        pdf.text(agePercentText, xOffset + (ageCardWidth - agePercentWidth) / 2, yPosition + 21);
      });
      yPosition += 35;
      
      // Age insights
      const largestGroup = ageDistribution.reduce((max, a) => a.count > max.count ? a : max, ageDistribution[0]);
      
      // Largest Group
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(228, 228, 231);
      pdf.roundedRect(margin, yPosition, insightWidth, 30, 2, 2, 'FD');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(113, 113, 122);
      pdf.text('LARGEST GROUP', margin + 5, yPosition + 6);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(24, 24, 27);
      pdf.text(largestGroup.category, margin + 5, yPosition + 14);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(113, 113, 122);
      const largestText1 = 'This age group represents the majority of';
      const largestText2 = 'attendees for program development.';
      pdf.text(largestText1, margin + 5, yPosition + 20);
      pdf.text(largestText2, margin + 5, yPosition + 25);
      
      // Total Reach
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin + insightWidth + 5, yPosition, insightWidth, 30, 2, 2, 'FD');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(113, 113, 122);
      pdf.text('TOTAL REACH', margin + insightWidth + 10, yPosition + 6);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(24, 24, 27);
      pdf.text(`${ageTotal} Children`, margin + insightWidth + 10, yPosition + 14);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(113, 113, 122);
      const totalText1 = 'Across all age categories during this';
      const totalText2 = 'reporting period.';
      pdf.text(totalText1, margin + insightWidth + 10, yPosition + 20);
      pdf.text(totalText2, margin + insightWidth + 10, yPosition + 25);
      yPosition += 40;
      
      // Add age distribution chart (screenshot or drawn)
      if (chartImages.ageDistribution) {
        // Use captured chart screenshot
        const ageChartHeight = 120;
        const ageChartWidth = pageWidth - margin * 2;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(...colors.gray.dark);
        pdf.text('Age Group Distribution', margin, yPosition);
        yPosition += 8;
        
        try {
          pdf.addImage(chartImages.ageDistribution, 'PNG', margin, yPosition, ageChartWidth, ageChartHeight);
          yPosition += ageChartHeight + 10;
        } catch (imgError) {
          console.warn('Error adding age chart image, using fallback');
          // Fall back to drawn chart
          addDrawnAgeChart();
        }
      } else {
        // Use drawn chart as fallback
        addDrawnAgeChart();
      }
      
      // Helper function for drawn age chart
      function addDrawnAgeChart() {
        const ageChartHeight = 60;
        const ageChartWidth = pageWidth - margin * 2;
        const ageBarWidth = (ageChartWidth - 40) / ageDistribution.length;
        const maxAgeCount = Math.max(...ageDistribution.map(a => a.count), 1);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(...colors.gray.dark);
        pdf.text('Age Group Distribution', margin, yPosition);
        yPosition += 8;
        
        // Draw bars with different colors matching NextGenChart theme
        const ageColors = [
          [48, 206, 228],   // NextGen Blue (#30cee4)
          [251, 118, 16],   // NextGen Orange (#fb7610)
          [92, 215, 233],   // NextGen Blue Light (#5cd7e9)
          [230, 99, 0],     // NextGen Orange Dark (#e66300)
          [28, 167, 188],   // NextGen Blue Dark (#1ca7bc)
          [252, 149, 68]    // NextGen Orange Light (#fc9544)
        ];
        
        ageDistribution.forEach((age, index) => {
          const barHeight = (age.count / maxAgeCount) * (ageChartHeight - 20);
          const xPos = margin + 10 + (index * ageBarWidth);
          const yPos = yPosition + (ageChartHeight - 20) - barHeight;
          
          // Draw bar with alternating colors
          pdf.setFillColor(...ageColors[index % ageColors.length]);
          pdf.rect(xPos, yPos, ageBarWidth - 10, barHeight, 'F');
          
          // Draw value on top
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(...colors.gray.dark);
          const valueText = age.count.toString();
          const valueWidth = pdf.getTextWidth(valueText);
          pdf.text(valueText, xPos + (ageBarWidth - 10 - valueWidth) / 2, yPos - 2);
          
          // Draw label at bottom
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(...colors.gray.medium);
          const label = age.category;
          const labelWidth = pdf.getTextWidth(label);
          pdf.text(label, xPos + (ageBarWidth - 10 - labelWidth) / 2, yPosition + ageChartHeight - 5);
        });
        
        // Draw baseline
        pdf.setDrawColor(...colors.gray.border);
        pdf.line(margin + 10, yPosition + (ageChartHeight - 20), pageWidth - margin - 10, yPosition + (ageChartHeight - 20));
        
        yPosition += ageChartHeight + 10;
      }
    }
    
    // Page 4: New Registrations
    pdf.addPage();
    yPosition = margin;
    
    drawSectionHeader(
      'New Registrations & Growth',
      `${(newRegistrations || []).length} new children joined the ministry this week`
    );
    
    if (newRegistrations && newRegistrations.length > 0) {
      // New children table
      const regColWidths = [20, 60, 40, 50];
      const regHeaders = ['ID', 'Name', 'Age Group', 'Registration Date'];
      
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(82, 82, 91);
      
      xPos = margin + 3;
      regHeaders.forEach((header, i) => {
        pdf.text(header.toUpperCase(), xPos, yPosition + 5);
        xPos += regColWidths[i];
      });
      yPosition += 8;
      
      // Registration rows
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(63, 63, 70);
      
      newRegistrations.slice(0, 15).forEach((child, index) => {
        if (checkPageBreak(8)) {
          // Redraw headers on new page
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(82, 82, 91);
          xPos = margin + 3;
          regHeaders.forEach((header, i) => {
            pdf.text(header.toUpperCase(), xPos, yPosition + 5);
            xPos += regColWidths[i];
          });
          yPosition += 8;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(63, 63, 70);
        }
        
        if (index % 2 === 0) {
          pdf.setFillColor(255, 255, 255);
        } else {
          pdf.setFillColor(250, 250, 250);
        }
        pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F');
        
        xPos = margin + 3;
        pdf.text(child.formal_id || 'N/A', xPos, yPosition + 5);
        xPos += regColWidths[0];
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${child.first_name} ${child.last_name}`, xPos, yPosition + 5);
        xPos += regColWidths[1];
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(child.age_categories?.category_name || 'N/A', xPos, yPosition + 5);
        xPos += regColWidths[2];
        
        pdf.text(formatDate(child.registration_date, { month: 'short', day: 'numeric', year: 'numeric' }), xPos, yPosition + 5);
        
        yPosition += 8;
      });
    } else {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(113, 113, 122);
      pdf.text('No new registrations during this period', margin, yPosition);
      yPosition += 10;
    }
    
    yPosition += 10;
    
    // New Guardians
    drawSectionHeader(
      'New Guardians',
      `${(newGuardians || []).length} new guardians added to the system`
    );
    
    if (newGuardians && newGuardians.length > 0) {
      const guardColWidths = [50, 50, 35, 35];
      const guardHeaders = ['Guardian Name', 'Child', 'Relationship', 'Contact'];
      
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(82, 82, 91);
      
      xPos = margin + 3;
      guardHeaders.forEach((header, i) => {
        pdf.text(header.toUpperCase(), xPos, yPosition + 5);
        xPos += guardColWidths[i];
      });
      yPosition += 8;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(63, 63, 70);
      
      newGuardians.slice(0, 15).forEach((item, index) => {
        if (checkPageBreak(8)) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(82, 82, 91);
          xPos = margin + 3;
          guardHeaders.forEach((header, i) => {
            pdf.text(header.toUpperCase(), xPos, yPosition + 5);
            xPos += guardColWidths[i];
          });
          yPosition += 8;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(63, 63, 70);
        }
        
        if (index % 2 === 0) {
          pdf.setFillColor(255, 255, 255);
        } else {
          pdf.setFillColor(250, 250, 250);
        }
        pdf.rect(margin, yPosition, pageWidth - margin * 2, 8, 'F');
        
        xPos = margin + 3;
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${item.guardians?.first_name || ''} ${item.guardians?.last_name || ''}`, xPos, yPosition + 5);
        xPos += guardColWidths[0];
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${item.children?.first_name || ''} ${item.children?.last_name || ''}`, xPos, yPosition + 5);
        xPos += guardColWidths[1];
        
        pdf.text(item.guardians?.relationship || 'N/A', xPos, yPosition + 5);
        xPos += guardColWidths[2];
        
        const contact = item.guardians?.phone_number || item.guardians?.email || 'N/A';
        pdf.text(contact.length > 15 ? contact.substring(0, 15) + '...' : contact, xPos, yPosition + 5);
        
        yPosition += 8;
      });
    } else {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(113, 113, 122);
      pdf.text('No new guardians added during this period', margin, yPosition);
    }
    
    // Page 5: Growth Trends (if available)
    if (growthData && growthData.length > 0 && growthInsights.topService && growthInsights.fastestGrowing) {
      pdf.addPage();
      yPosition = margin;
      
      drawSectionHeader(
        'Growth Trends & Insights',
        'Month-over-month attendance trends and growth metrics by service'
      );
      
      // Growth insights
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(228, 228, 231);
      pdf.roundedRect(margin, yPosition, insightWidth, 30, 2, 2, 'FD');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(113, 113, 122);
      pdf.text('HIGHEST ATTENDANCE', margin + 5, yPosition + 6);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(24, 24, 27);
      pdf.text(growthInsights.topService.service, margin + 5, yPosition + 14);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(113, 113, 122);
      const avgText = `Average of ${Math.round(growthInsights.topService.average)} children per service`;
      pdf.text(avgText, margin + 5, yPosition + 20);
      
      // Fastest Growing
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin + insightWidth + 5, yPosition, insightWidth, 30, 2, 2, 'FD');
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.setTextColor(113, 113, 122);
      pdf.text('FASTEST GROWING', margin + insightWidth + 10, yPosition + 6);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(14);
      pdf.setTextColor(24, 24, 27);
      pdf.text(growthInsights.fastestGrowing.service, margin + insightWidth + 10, yPosition + 14);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(113, 113, 122);
      const growthText = `${growthInsights.fastestGrowing.growth}% growth rate over period`;
      pdf.text(growthText, margin + insightWidth + 10, yPosition + 20);
      
      yPosition += 40;
      
      // Add service comparison chart if captured
      if (chartImages.serviceComparison) {
        checkPageBreak(130);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(...colors.gray.dark);
        pdf.text('Service Comparison - Attendance vs Growth', margin, yPosition);
        yPosition += 8;
        
        try {
          const comparisonChartHeight = 100;
          const comparisonChartWidth = pageWidth - margin * 2;
          pdf.addImage(chartImages.serviceComparison, 'PNG', margin, yPosition, comparisonChartWidth, comparisonChartHeight);
          yPosition += comparisonChartHeight + 10;
        } catch (imgError) {
          console.warn('Error adding service comparison chart image:', imgError);
        }
      }
    }
    
    // Footer on last page
    const lastPageNum = pdf.internal.pages.length - 1;
    pdf.setPage(lastPageNum);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...colors.gray.light);
    const footerY = pageHeight - 15;
    
    pdf.text(
      `Generated on ${formatDate(new Date().toISOString().split('T')[0], { month: 'long', day: 'numeric', year: 'numeric' })}`,
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );
    
    pdf.text(
      'NextGen Ministry Weekly Report - Confidential',
      pageWidth / 2,
      footerY + 5,
      { align: 'center' }
    );
    
    // Upload to Firebase Storage with timestamp to ensure unique files
    console.log('Generating PDF blob...');
    const pdfBlob = pdf.output('blob');
    console.log('PDF blob generated:', pdfBlob.size, 'bytes');
    
    // Generate unique filename with timestamp
    const timestamp = new Date().getTime();
    const filename = `weekly_${startDate.replace(/-/g, '')}_${timestamp}.pdf`;
    const storagePath = `NextGen/weekly-reports-pdf/${filename}`;
    console.log('Uploading to Firebase Storage:', storagePath);
    
    const storageRef = ref(storage, storagePath);
    
    const uploadResult = await uploadBytes(storageRef, pdfBlob);
    console.log('Upload complete:', uploadResult.metadata.fullPath);
    
    const pdfUrl = await getDownloadURL(storageRef);
    console.log('PDF URL obtained:', pdfUrl);
    
    // Update the existing weekly_reports entry with the Firebase storage path
    // Use the actual storage path (with timestamp) so it can be found later
    console.log('Updating weekly_reports entry with report_id:', reportId);
    
    const { error: updateError } = await supabase
      .from('weekly_reports')
      .update({
        report_pdf_url: storagePath  // Use the actual Firebase storage path
      })
      .eq('report_id', reportId);
    
    if (updateError) {
      console.error('Error updating Supabase record:', updateError);
      throw updateError;
    }
    
    console.log('Supabase record updated successfully with path:', storagePath);
    console.log('PDF generation complete. URL:', pdfUrl);
    
    return pdfUrl;
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      reportId,
      startDate,
      endDate
    });
    throw error;
  }
};
