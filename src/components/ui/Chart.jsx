import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import Chart from 'chart.js/auto';
import { debounce } from 'lodash';

const NextGenChart = ({ 
  type = 'line', 
  data, 
  options = {}, 
  height = '100%',
  animate = true,
  className = '',
  onDataPointClick = null,
  enableResponsive = true,
  enableDownload = false,
  downloadFormat = 'png',
  downloadFilename = 'chart-export',
  customLoader = null
}) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // NextGen theme colors
  const theme = {
    blue: '#30cee4',
    blueLight: '#5cd7e9',
    blueDark: '#1ca7bc',
    orange: '#fb7610',
    orangeLight: '#fc9544',
    orangeDark: '#e66300',
    
    // With transparency
    blueAlpha: 'rgba(48, 206, 228, 0.7)',
    blueLightAlpha: 'rgba(92, 215, 233, 0.7)',
    blueDarkAlpha: 'rgba(28, 167, 188, 0.7)',
    orangeAlpha: 'rgba(251, 118, 16, 0.7)',
    orangeLightAlpha: 'rgba(252, 149, 68, 0.7)',
    orangeDarkAlpha: 'rgba(230, 99, 0, 0.7)',
  };

  // Handle window resize for responsive charts
  useEffect(() => {
    if (!enableResponsive) return;
    
    const handleResize = debounce(() => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    }, 250);
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial call
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [enableResponsive]);

  // Handle download functionality
  const handleDownload = () => {
    if (!chartRef.current || !chartInstance.current) return;
    
    // Get chart as image data
    const image = chartRef.current.toDataURL(`image/${downloadFormat}`, 1.0);
    
    // Create link for download
    const link = document.createElement('a');
    link.download = `${downloadFilename}.${downloadFormat}`;
    link.href = image;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Main effect to initialize and update chart
  useEffect(() => {
    if (!chartRef.current) return;

    // If we already have a chart, destroy it before creating a new one
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    
    // Chart.js global settings
    Chart.defaults.font.family = "system-ui, Avenir, Helvetica, Arial, sans-serif";
    Chart.defaults.color = "#555";
    
    // Default animations
    const animations = {
      tension: {
        duration: 1000,
        easing: 'easeOutQuart',
        from: 0,
        to: 0.3,
        loop: false
      }
    };
    
    // Add rotation for pie/doughnut
    if (type === 'pie' || type === 'doughnut') {
      animations.animateRotate = true;
      animations.animateScale = true;
    }
    
    // Default NextGen theme options
    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1200,
        easing: 'easeOutQuart'
      },
      animations,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              family: "system-ui, Avenir, Helvetica, Arial, sans-serif",
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
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: theme.blueDark,
          titleFont: {
            size: 14,
            weight: 'bold',
            family: "system-ui, Avenir, Helvetica, Arial, sans-serif"
          },
          bodyColor: '#666',
          bodyFont: {
            size: 12,
            family: "system-ui, Avenir, Helvetica, Arial, sans-serif"
          },
          borderColor: `${theme.blue}33`,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          boxShadow: `0px 2px 8px ${theme.blue}26`
        },
        // Add datalabels plugin config for showing values on chart
        datalabels: {
          display: (context) => type === 'pie' || type === 'doughnut' || type === 'polarArea',
          color: '#fff',
          font: {
            weight: 'bold',
            size: 11
          },
          formatter: (value, context) => {
            // Only show percentage for pie/doughnut/polar charts
            if (type === 'pie' || type === 'doughnut' || type === 'polarArea') {
              const sum = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / sum) * 100);
              return percentage > 5 ? `${percentage}%` : ''; // Only show if big enough slice
            }
            return value;
          }
        }
      },
      ...(type !== 'pie' && type !== 'doughnut' ? {
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: `${theme.blue}10`,
              drawBorder: false
            },
            ticks: {
              font: {
                family: "system-ui, Avenir, Helvetica, Arial, sans-serif"
              },
              padding: 10,
              color: '#666'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: {
                family: "system-ui, Avenir, Helvetica, Arial, sans-serif"
              },
              maxRotation: 45,
              minRotation: 45,
              padding: 10,
              color: '#666'
            }
          }
        }
      } : {})
    };
    
    // Merge with provided options
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      plugins: {
        ...defaultOptions.plugins,
        ...(options.plugins || {})
      }
    };
    
    // Add onClick event handler if provided
    if (onDataPointClick) {
      mergedOptions.onClick = (event, elements) => {
        if (elements && elements.length > 0) {
          const datasetIndex = elements[0].datasetIndex;
          const dataIndex = elements[0].index;
          
          // Get all relevant data
          const dataset = data.datasets[datasetIndex];
          const value = dataset.data[dataIndex];
          const label = data.labels[dataIndex];
          
          // Call the handler with formatted data
          onDataPointClick({
            datasetIndex,
            dataIndex,
            dataset,
            value,
            label
          });
        }
      };
    }
    
    // Apply NextGen color palette to datasets if not specified
    if (data && data.datasets) {
      const themeColors = [
        theme.blueAlpha,
        theme.orangeAlpha, 
        theme.blueLightAlpha,
        theme.orangeLightAlpha,
        theme.blueDarkAlpha,
        theme.orangeDarkAlpha
      ];
      
      const themeBorders = [
        theme.blue,
        theme.orange, 
        theme.blueLight,
        theme.orangeLight,
        theme.blueDark,
        theme.orangeDark
      ];
      
      data.datasets = data.datasets.map((dataset, index) => {
        const colorIndex = index % themeColors.length;
        
        // Only apply theme colors if not specified
        const backgroundColor = dataset.backgroundColor || 
          (type === 'pie' || type === 'doughnut' || type === 'polarArea' 
            ? themeColors.map((c, i) => themeColors[(i + index) % themeColors.length]) 
            : themeColors[colorIndex]);
        
        const borderColor = dataset.borderColor || 
          (type === 'pie' || type === 'doughnut' || type === 'polarArea' 
            ? themeBorders.map((c, i) => themeBorders[(i + index) % themeBorders.length]) 
            : themeBorders[colorIndex]);
        
        // Add common styling
        return {
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: dataset.borderColor || (Array.isArray(borderColor) ? borderColor[0] : borderColor),
          pointBorderColor: '#fff',
          backgroundColor,
          borderColor,
          ...dataset
        };
      });
    }

    // Create the chart
    chartInstance.current = new Chart(ctx, {
      type,
      data,
      options: mergedOptions
    });
    
    setIsReady(true);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, type, options, dimensions, onDataPointClick]);

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full relative ${className}`} 
      style={{ height }}
    >
      {animate ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isReady ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full relative"
        >
          <canvas ref={chartRef} />
          
          {/* Download button */}
          {enableDownload && isReady && (
            <motion.button
              type="button"
              className="absolute top-2 right-2 bg-white/80 hover:bg-white p-1.5 rounded-md shadow-sm border border-gray-200 text-gray-600 hover:text-nextgen-blue transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownload}
              title={`Download as ${downloadFormat}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </motion.button>
          )}
        </motion.div>
      ) : (
        <div className="w-full h-full relative">
          <canvas ref={chartRef} />
          
          {/* Download button (non-animated version) */}
          {enableDownload && isReady && (
            <button
              type="button"
              className="absolute top-2 right-2 bg-white/80 hover:bg-white p-1.5 rounded-md shadow-sm border border-gray-200 text-gray-600 hover:text-nextgen-blue transition-colors"
              onClick={handleDownload}
              title={`Download as ${downloadFormat}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
        </div>
      )}
      
      {/* Loading state */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          {customLoader || (
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nextgen-blue"></div>
          )}
        </div>
      )}
    </div>
  );
};

NextGenChart.propTypes = {
  type: PropTypes.oneOf(['line', 'bar', 'pie', 'doughnut', 'radar', 'polarArea', 'bubble', 'scatter']),
  data: PropTypes.object.isRequired,
  options: PropTypes.object,
  height: PropTypes.string,
  animate: PropTypes.bool,
  className: PropTypes.string,
  onDataPointClick: PropTypes.func,
  enableResponsive: PropTypes.bool,
  enableDownload: PropTypes.bool,
  downloadFormat: PropTypes.oneOf(['png', 'jpeg']),
  downloadFilename: PropTypes.string,
  customLoader: PropTypes.node
};

export default NextGenChart;