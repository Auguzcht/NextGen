import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

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
    
    chartInstance.current = new Chart(ctx, {
      type: chartType,
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          }
        },
        ...(type !== 'age' && {
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: type === 'attendance' ? 'Number of Children' : 'Growth Percentage'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Time Period'
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
  
  return <canvas ref={chartRef} />;
};

export default ReportChart;