import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Card } from '../ui';

const ServiceComparisonChart = ({ serviceData }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serviceData || serviceData.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Get unique services
    const services = [...new Set(serviceData.map(item => item.service_name))];
    
    // Aggregate data by service
    const serviceStats = services.map(service => {
      const serviceItems = serviceData.filter(item => item.service_name === service);
      const total = serviceItems.reduce((sum, item) => sum + item.monthly_attendance, 0);
      const monthCount = serviceItems.length;
      
      return {
        service,
        total,
        average: monthCount > 0 ? total / monthCount : 0,
        growth: calculateGrowth(serviceItems)
      };
    });
    
    setChartData({
      labels: services,
      datasets: [
        {
          label: 'Average Attendance',
          data: serviceStats.map(item => Math.round(item.average)),
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderColor: 'rgb(99, 102, 241)',
          borderWidth: 1,
          order: 1
        },
        {
          label: 'Growth Rate (%)',
          data: serviceStats.map(item => item.growth),
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          order: 0,
          type: 'line',
          yAxisID: 'y1'
        }
      ]
    });

    setLoading(false);
  }, [serviceData]);

  // Calculate growth rate for a service
  const calculateGrowth = (serviceItems) => {
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
          <p className="text-gray-500">No service data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <div className="p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Service Comparison</h3>
        <div className="h-64">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                mode: 'index',
                intersect: false,
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Average Attendance'
                  }
                },
                y1: {
                  position: 'right',
                  beginAtZero: false,
                  title: {
                    display: true,
                    text: 'Growth Rate (%)'
                  },
                  grid: {
                    drawOnChartArea: false
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

export default ServiceComparisonChart;