import { NextGenChart } from '../ui';

const ReportChart = ({ type, data }) => {
  // Get chart type based on report type
  let chartType = 'line';
  let options = {};
  
  if (type === 'age') {
    chartType = 'pie';
    options = {
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
              const percentage = total > 0 ? Math.round((context.raw / total) * 100) : 0;
              return `${context.label}: ${context.raw} (${percentage}%)`;
            }
          }
        }
      }
    };
  } else if (type === 'attendance') {
    options = {
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
      }
    };
  } else if (type === 'growth') {
    options = {
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
      }
    };
  }

  return (
    <NextGenChart type={chartType} data={data} options={options} height="100%" />
  );
};

export default ReportChart;