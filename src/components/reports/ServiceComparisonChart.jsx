import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Card, Badge } from '../ui';
import { motion } from 'framer-motion';

const ServiceComparisonChart = ({ serviceData }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topService, setTopService] = useState(null);
  const [fastestGrowing, setFastestGrowing] = useState(null);

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
      const growth = calculateGrowth(serviceItems);
      
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
      
      setTopService(topByAttendance);
      setFastestGrowing(topByGrowth);
    }
    
    // NextGen theme colors
    setChartData({
      labels: services,
      datasets: [
        {
          label: 'Average Attendance',
          data: serviceStats.map(item => Math.round(item.average)),
          backgroundColor: 'rgba(87, 28, 31, 0.7)', // NextGen primary
          borderColor: '#571C1F',
          borderWidth: 1,
          order: 1
        },
        {
          label: 'Growth Rate (%)',
          data: serviceStats.map(item => item.growth),
          backgroundColor: 'rgba(33, 90, 117, 0.7)', // NextGen blue
          borderColor: '#215A75',
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#571C1F]"></div>
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
    <Card className="h-full hover:shadow-md transition-shadow duration-300">
      <div className="p-5">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-[#571C1F]">Service Comparison</h3>
          <p className="text-sm text-gray-500">Attendance and growth by service</p>
        </div>
        
        {topService && fastestGrowing && (
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#571C1F]/5 p-3 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#571C1F]">
                  Highest Attendance
                </p>
                <Badge variant="primary" size="sm">
                  {Math.round(topService.average)} avg
                </Badge>
              </div>
              <p className="text-base font-semibold mt-1 truncate">
                {topService.service}
              </p>
            </div>
            
            <div className="bg-[#215A75]/5 p-3 rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#215A75]">
                  Fastest Growing
                </p>
                <Badge 
                  variant={fastestGrowing.growth > 0 ? "success" : "danger"}
                  size="sm"
                >
                  {fastestGrowing.growth}%
                </Badge>
              </div>
              <p className="text-base font-semibold mt-1 truncate">
                {fastestGrowing.service}
              </p>
            </div>
          </div>
        )}
        
        <motion.div 
          className="h-64"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: {
                mode: 'index',
                intersect: false,
              },
              plugins: {
                legend: {
                  position: 'top',
                  labels: {
                    font: {
                      family: "'Inter', 'Helvetica', 'Arial', sans-serif",
                      size: 12
                    },
                    usePointStyle: true,
                    boxWidth: 6,
                    padding: 15
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
                      if (context.dataset.label === 'Growth Rate (%)') {
                        return `Growth: ${value}%`;
                      }
                      return `Attendance: ${value}`;
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Average Attendance',
                    font: {
                      size: 12,
                      family: "'Inter', 'Helvetica', 'Arial', sans-serif"
                    },
                    color: '#571C1F'
                  },
                  ticks: {
                    font: {
                      family: "'Inter', 'Helvetica', 'Arial', sans-serif"
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
                    font: {
                      size: 12,
                      family: "'Inter', 'Helvetica', 'Arial', sans-serif"
                    },
                    color: '#215A75'
                  },
                  ticks: {
                    font: {
                      family: "'Inter', 'Helvetica', 'Arial', sans-serif"
                    },
                    callback: function(value) {
                      return value + '%';
                    }
                  },
                  grid: {
                    drawOnChartArea: false
                  }
                },
                x: {
                  ticks: {
                    font: {
                      family: "'Inter', 'Helvetica', 'Arial', sans-serif"
                    }
                  },
                  grid: {
                    display: false
                  }
                }
              }
            }}
          />
        </motion.div>
      </div>
    </Card>
  );
};

export default ServiceComparisonChart;