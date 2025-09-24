import { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Card } from '../ui';
import { motion } from 'framer-motion';

const AttendancePatternChart = ({ attendanceData }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attendanceData || attendanceData.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Process attendance patterns from the data
    const analyzeAttendancePatterns = () => {
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
      
      // Calculate percentages for the tooltip
      const total = Object.values(patterns).reduce((sum, val) => sum + val, 0);
      
      // Create chart data with NextGen theme colors
      setChartData({
        labels: Object.keys(patterns),
        datasets: [
          {
            data: Object.values(patterns),
            backgroundColor: [
              'rgba(168, 48, 55, 0.7)',  // NextGen accent - one-time
              'rgba(58, 129, 159, 0.7)', // NextGen secondary blue - occasional
              'rgba(33, 90, 117, 0.7)',  // NextGen blue - regular
              'rgba(87, 28, 31, 0.7)',   // NextGen primary - frequent
            ],
            borderColor: [
              '#A83037',
              '#3A819F',
              '#215A75',
              '#571C1F',
            ],
            borderWidth: 1,
          },
        ],
      });
      
      setLoading(false);
    };
    
    analyzeAttendancePatterns();
  }, [attendanceData]);

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#571C1F]"></div>
        </div>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">No attendance data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full hover:shadow-md transition-shadow duration-300">
      <div className="p-5">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-[#571C1F]">Attendance Patterns</h3>
          <p className="text-sm text-gray-500">How frequently children attend services</p>
        </div>
        
        <motion.div 
          className="h-64"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Doughnut 
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: '65%',
              animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1500
              },
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    padding: 20,
                    font: {
                      family: "'Inter', 'Helvetica', 'Arial', sans-serif"
                    },
                    usePointStyle: true,
                    boxWidth: 8
                  }
                },
                tooltip: {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  titleColor: '#000',
                  titleFont: {
                    size: 14,
                    weight: 'bold'
                  },
                  bodyColor: '#666',
                  bodyFont: {
                    size: 12
                  },
                  borderColor: '#ddd',
                  borderWidth: 1,
                  padding: 12,
                  cornerRadius: 8,
                  callbacks: {
                    label: function(context) {
                      const value = context.raw;
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                      return `${context.label}: ${value} (${percentage}%)`;
                    }
                  }
                }
              }
            }}
          />
        </motion.div>
        
        <motion.div 
          className="mt-4 pt-4 border-t border-gray-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="text-xs text-gray-500">
            <p><span className="font-medium text-[#A83037]">One-time:</span> Attended only once</p>
            <p><span className="font-medium text-[#3A819F]">Occasional:</span> Attended 2-3 times</p>
            <p><span className="font-medium text-[#215A75]">Regular:</span> Attended 4-7 times</p>
            <p><span className="font-medium text-[#571C1F]">Frequent:</span> Attended 8+ times</p>
          </div>
        </motion.div>
      </div>
    </Card>
  );
};

export default AttendancePatternChart;