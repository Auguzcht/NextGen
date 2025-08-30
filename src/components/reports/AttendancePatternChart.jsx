import { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Card } from '../ui';

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
      
      // Create chart data
      setChartData({
        labels: Object.keys(patterns),
        datasets: [
          {
            data: Object.values(patterns),
            backgroundColor: [
              'rgba(239, 68, 68, 0.7)',   // red - one-time
              'rgba(234, 179, 8, 0.7)',   // yellow - occasional
              'rgba(99, 102, 241, 0.7)',  // indigo - regular
              'rgba(34, 197, 94, 0.7)',   // green - frequent
            ],
            borderColor: [
              'rgb(239, 68, 68)',
              'rgb(234, 179, 8)',
              'rgb(99, 102, 241)',
              'rgb(34, 197, 94)',
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
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
    <Card className="h-full">
      <div className="p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Patterns</h3>
        <div className="h-64">
          <Doughnut 
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: '65%',
              plugins: {
                legend: {
                  position: 'bottom',
                },
                tooltip: {
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
        </div>
      </div>
    </Card>
  );
};

export default AttendancePatternChart;