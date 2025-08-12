import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const Table = ({
  data = [],
  columns = [],
  isLoading = false,
  noDataMessage = 'No data available',
  onRowClick,
  highlightOnHover = true,
  stripedRows = false,
  size = 'md',
  variant = 'default',
  dense = false,
  stickyHeader = false,
  className = '',
  ...props
}) => {
  // Size classes
  const sizeClasses = {
    sm: {
      table: 'text-xs',
      header: 'px-3 py-2',
      cell: 'px-3 py-1.5'
    },
    md: {
      table: 'text-sm',
      header: 'px-6 py-3',
      cell: 'px-6 py-4'
    },
    lg: {
      table: 'text-base',
      header: 'px-8 py-4',
      cell: 'px-8 py-5'
    }
  };

  // Variant classes
  const variantClasses = {
    default: {
      table: 'bg-white',
      header: 'bg-gray-50 text-gray-500',
      row: 'border-b border-gray-200',
      cell: 'text-gray-500'
    },
    primary: {
      table: 'bg-white',
      header: 'bg-nextgen-blue/10 text-nextgen-blue-dark',
      row: 'border-b border-nextgen-blue/10',
      cell: 'text-gray-600'
    },
    secondary: {
      table: 'bg-white',
      header: 'bg-nextgen-orange/10 text-nextgen-orange-dark',
      row: 'border-b border-nextgen-orange/10',
      cell: 'text-gray-600'
    },
    minimal: {
      table: 'bg-transparent',
      header: 'bg-transparent text-gray-500 border-b-2 border-gray-200',
      row: 'border-b border-gray-100',
      cell: 'text-gray-500'
    }
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;
  const selectedVariant = variantClasses[variant] || variantClasses.default;

  // Compute table classes
  const tableClasses = `
    min-w-full divide-y divide-gray-200 
    ${selectedSize.table} 
    ${selectedVariant.table} 
    ${dense ? 'table-fixed' : 'table-auto'} 
    ${stickyHeader ? 'relative' : ''}
    ${className}
  `;

  // Compute header classes
  const headerClasses = `
    text-left font-medium uppercase tracking-wider 
    ${selectedSize.header} 
    ${selectedVariant.header}
    ${stickyHeader ? 'sticky top-0 z-10' : ''}
  `;

  // Row hover animation variants
  const rowVariants = {
    initial: { 
      backgroundColor: 'rgba(255, 255, 255, 0)' 
    },
    hover: {
      backgroundColor: 'rgba(48, 206, 228, 0.05)'
    }
  };

  // Loading skeleton
  const renderSkeleton = () => (
    <tbody className="divide-y divide-gray-200">
      {[...Array(5)].map((_, rowIndex) => (
        <tr key={`skeleton-row-${rowIndex}`}>
          {columns.map((column, colIndex) => (
            <td
              key={`skeleton-cell-${rowIndex}-${colIndex}`}
              className={`whitespace-nowrap ${selectedSize.cell}`}
            >
              <div className={`h-4 bg-gray-200 rounded animate-pulse ${column.width ? column.width : 'w-20'}`}></div>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );

  // No data display
  const renderNoData = () => (
    <tbody>
      <tr>
        <td
          colSpan={columns.length}
          className="px-6 py-8 text-center text-gray-500 whitespace-nowrap"
        >
          <div className="flex flex-col items-center justify-center">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-12 w-12 text-gray-300 mb-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <p>{noDataMessage}</p>
          </div>
        </td>
      </tr>
    </tbody>
  );

  // Apply accessor to get data from the row
  const getCellValue = (row, accessor) => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    
    if (accessor.includes('.')) {
      return accessor.split('.').reduce((obj, key) => {
        return obj && obj[key] !== undefined ? obj[key] : null;
      }, row);
    }
    
    return row[accessor];
  };

  return (
    // Enhanced responsive container with proper width constraints
    <div className="overflow-x-auto shadow-sm rounded-lg w-full">
      <div className="inline-block min-w-full align-middle">
        <div className="overflow-hidden">
          <table className={tableClasses} {...props}>
            <thead className={`${stickyHeader ? 'sticky top-0' : ''}`}>
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={`header-${index}`}
                    scope="col"
                    className={`${headerClasses} ${column.className || ''}`}
                    style={column.width ? { width: column.width } : {}}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>

            {isLoading ? (
              renderSkeleton()
            ) : data.length === 0 ? (
              renderNoData()
            ) : (
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, rowIndex) => (
                  <motion.tr
                    key={`row-${row.id || rowIndex}`}
                    className={`
                      ${selectedVariant.row}
                      ${stripedRows && rowIndex % 2 ? 'bg-gray-50' : ''}
                      ${onRowClick ? 'cursor-pointer' : ''}
                    `}
                    onClick={() => onRowClick && onRowClick(row)}
                    initial="initial"
                    whileHover={highlightOnHover ? "hover" : "initial"}
                    variants={rowVariants}
                    transition={{ duration: 0.2 }}
                  >
                    {columns.map((column, colIndex) => (
                      <td
                        key={`cell-${rowIndex}-${colIndex}`}
                        className={`whitespace-nowrap ${selectedSize.cell} ${selectedVariant.cell} ${column.cellClassName || ''}`}
                      >
                        {column.cell ? column.cell(row) : getCellValue(row, column.accessor)}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

Table.propTypes = {
  data: PropTypes.array,
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      header: PropTypes.node.isRequired,
      accessor: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
      cell: PropTypes.func,
      className: PropTypes.string,
      cellClassName: PropTypes.string,
      width: PropTypes.string
    })
  ),
  isLoading: PropTypes.bool,
  noDataMessage: PropTypes.string,
  onRowClick: PropTypes.func,
  highlightOnHover: PropTypes.bool,
  stripedRows: PropTypes.bool,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  variant: PropTypes.oneOf(['default', 'primary', 'secondary', 'minimal']),
  dense: PropTypes.bool,
  stickyHeader: PropTypes.bool,
  className: PropTypes.string
};

export default Table;