import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { motion } from 'framer-motion';

const ReportChart = ({ type, data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    // If we already have a chart, destroy it before creating a new one
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    if (!chartRef.current) return;
    
    const ctx = chartRef.current.getContext('2d');
    
    let chartType = 'line';
    if (type === 'age') {
      chartType = 'pie';
    }
    
    const animations = {
      tension: {
        duration: 1000,
        easing: 'easeOutQuart',
        from: 0,
        to: 0.3,
        loop: false
      }
    };
    
    if (chartType === 'pie') {
      // Add rotation animation for pie charts
      animations.animateRotate = true;
      animations.animateScale = true;
    }
    
    // NextGen theme colors
    const nextGenColors = {
      primary: '#571C1F',
      secondary: '#215A75',
      accent: '#A83037',
      secondaryBlue: '#3A819F',
      lightGray: '#F3F4F6'
    };
    
    chartInstance.current = new Chart(ctx, {
      type: chartType,
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1500, // General animation duration
          easing: 'easeOutQuart'
        },
        animations: animations,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: {
                family: "'Inter', 'Helvetica', 'Arial', sans-serif",
                size: 12
              },
              padding: 20,
              usePointStyle: true,
              boxWidth: 8
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#000',
            titleFont: {
              size: 14,
              weight: 'bold',
              family: "'Inter', 'Helvetica', 'Arial', sans-serif"
            },
            bodyColor: '#666',
            bodyFont: {
              size: 12,
              family: "'Inter', 'Helvetica', 'Arial', sans-serif"
            },
            borderColor: '#ddd',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)'
          }
        },
        ...(type !== 'age' && {
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.05)',
                drawBorder: false
              },
              ticks: {
                font: {
                  family: "'Inter', 'Helvetica', 'Arial', sans-serif"
                },
                padding: 10,
                color: '#666'
              },
              title: {
                display: true,
                text: type === 'attendance' ? 'Number of Children' : 'Growth Percentage',
                font: {
                  family: "'Inter', 'Helvetica', 'Arial', sans-serif",
                  size: 12
                },
                color: '#571C1F'
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: {
                  family: "'Inter', 'Helvetica', 'Arial', sans-serif"
                },
                maxRotation: 45,
                minRotation: 45,
                padding: 10,
                color: '#666'
              },
              title: {
                display: true,
                text: 'Time Period',
                font: {
                  family: "'Inter', 'Helvetica', 'Arial', sans-serif",
                  size: 12
                },
                color: '#571C1F'
              }
            }
          }
        })
      }
    });
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, type]);
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-full w-full"
    >
      <canvas ref={chartRef} />
    </motion.div>
  );
};

export default ReportChart;