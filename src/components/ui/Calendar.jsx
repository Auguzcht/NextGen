import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const Calendar = ({
  mode = 'single',
  selected,
  onSelect,
  className,
  captionLayout = 'buttons',
  minDate,
  maxDate,
}) => {
  const initialMonth = selected instanceof Date ? selected : new Date();
  const [displayMonth, setDisplayMonth] = useState(startOfMonth(initialMonth));

  const minDateObject = useMemo(() => {
    if (!minDate) return null;
    const date = new Date(minDate);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [minDate]);

  const maxDateObject = useMemo(() => {
    if (!maxDate) return null;
    const date = new Date(maxDate);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [maxDate]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(displayMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(displayMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [displayMonth]);

  const handleSelect = (day) => {
    if (mode !== 'single' || typeof onSelect !== 'function') return;
    if (isDayDisabled(day)) return;
    onSelect(day);
  };

  const isDayDisabled = (day) => {
    if (minDateObject && isBefore(day, startOfDay(minDateObject))) return true;
    if (maxDateObject && isAfter(day, endOfDay(maxDateObject))) return true;
    return false;
  };

  const canMoveByMonths = (offset) => {
    const candidate = addMonths(displayMonth, offset);

    if (minDateObject && endOfMonth(candidate) < startOfDay(minDateObject)) return false;
    if (maxDateObject && startOfMonth(candidate) > endOfDay(maxDateObject)) return false;
    return true;
  };

  const canMoveByYears = (offset) => canMoveByMonths(offset * 12);

  const renderCaption = () => {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setDisplayMonth(addYears(displayMonth, -1))}
          disabled={!canMoveByYears(-1)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous year"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 19l-7-7 7-7M11 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="min-w-[122px] text-center text-sm font-semibold text-gray-900">
          {format(displayMonth, captionLayout === 'dropdown' ? 'MMM yyyy' : 'MMMM yyyy')}
        </div>

        <button
          type="button"
          onClick={() => setDisplayMonth(addYears(displayMonth, 1))}
          disabled={!canMoveByYears(1)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next year"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5l7 7-7 7m7-14l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn('w-full max-w-[340px] rounded-lg border border-gray-300 bg-white p-3 shadow-xl', className)}
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setDisplayMonth(addMonths(displayMonth, -1))}
          disabled={!canMoveByMonths(-1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {renderCaption()}

        <button
          type="button"
          onClick={() => setDisplayMonth(addMonths(displayMonth, 1))}
          disabled={!canMoveByMonths(1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Next month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 pb-1">
        {WEEK_DAYS.map((label) => (
          <div key={label} className="h-8 text-center text-xs font-medium text-gray-500 leading-8">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = selected instanceof Date && isSameDay(day, selected);
          const inCurrentMonth = isSameMonth(day, displayMonth);
          const isDisabled = isDayDisabled(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleSelect(day)}
              disabled={isDisabled}
              className={cn(
                'h-9 w-9 rounded-md text-sm transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-nextgen-blue/40',
                inCurrentMonth ? 'text-gray-900' : 'text-gray-300',
                isDisabled ? 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-inherit' : '',
                isToday(day) && !isSelected ? 'font-semibold text-nextgen-blue-dark' : '',
                isSelected
                  ? 'bg-nextgen-blue text-white hover:bg-nextgen-blue-dark'
                  : 'hover:bg-nextgen-blue/10 hover:text-nextgen-blue-dark'
              )}
              aria-pressed={isSelected}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

Calendar.propTypes = {
  mode: PropTypes.oneOf(['single']),
  selected: PropTypes.instanceOf(Date),
  onSelect: PropTypes.func,
  className: PropTypes.string,
  captionLayout: PropTypes.oneOf(['buttons', 'dropdown']),
  minDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  maxDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
};

function startOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function endOfDay(date) {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

export default Calendar;
