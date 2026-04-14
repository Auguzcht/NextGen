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
  numberOfMonths = 1,
}) => {
  const selectedFromDate = useMemo(() => {
    if (mode === 'single' && selected instanceof Date) return selected;
    if (mode === 'range' && selected?.from instanceof Date) return selected.from;
    return null;
  }, [mode, selected]);

  const initialMonth = selectedFromDate || new Date();
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

  const monthsToRender = useMemo(() => {
    const safeMonths = Math.max(1, numberOfMonths);
    return Array.from({ length: safeMonths }, (_, index) => addMonths(displayMonth, index));
  }, [displayMonth, numberOfMonths]);

  const monthGrids = useMemo(() => {
    return monthsToRender.map((monthStart) => {
      const start = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 });
      const days = eachDayOfInterval({ start, end });

      return {
        monthStart,
        days,
      };
    });
  }, [monthsToRender]);

  const normalizedSelected = useMemo(() => {
    if (mode === 'single') {
      return {
        single: selected instanceof Date ? startOfDay(selected) : null,
        from: null,
        to: null,
      };
    }

    const from = selected?.from instanceof Date ? startOfDay(selected.from) : null;
    const to = selected?.to instanceof Date ? startOfDay(selected.to) : null;
    return { single: null, from, to };
  }, [mode, selected]);

  const handleSelect = (day) => {
    if (typeof onSelect !== 'function') return;
    if (isDayDisabled(day)) return;

    if (mode === 'single') {
      onSelect(day);
      return;
    }

    const clicked = startOfDay(day);
    const currentFrom = normalizedSelected.from;
    const currentTo = normalizedSelected.to;

    if (!currentFrom) {
      onSelect({ from: clicked, to: undefined });
      return;
    }

    if (currentFrom && currentTo) {
      // Third click starts a new range.
      onSelect({ from: clicked, to: undefined });
      return;
    }

    if (isBefore(clicked, currentFrom)) {
      onSelect({ from: clicked, to: currentFrom });
      return;
    }

    if (isSameDay(clicked, currentFrom)) {
      onSelect({ from: clicked, to: clicked });
      return;
    }

    onSelect({ from: currentFrom, to: clicked });
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
    const firstMonth = monthsToRender[0] || displayMonth;
    const lastMonth = monthsToRender[monthsToRender.length - 1] || displayMonth;
    const captionText = monthsToRender.length > 1
      ? `${format(firstMonth, captionLayout === 'dropdown' ? 'MMM yyyy' : 'MMMM yyyy')} - ${format(lastMonth, captionLayout === 'dropdown' ? 'MMM yyyy' : 'MMMM yyyy')}`
      : format(displayMonth, captionLayout === 'dropdown' ? 'MMM yyyy' : 'MMMM yyyy');

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

        <div className="min-w-[220px] text-center text-sm font-semibold text-gray-900">
          {captionText}
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
      className={cn(
        monthsToRender.length > 1 ? 'w-auto max-w-none' : 'w-full max-w-[340px]',
        'rounded-lg border border-gray-300 bg-white p-3 shadow-xl',
        className
      )}
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

      <div className={cn('grid gap-2', monthsToRender.length > 1 ? 'md:grid-cols-2 md:gap-0' : 'grid-cols-1')}>
        {monthGrids.map(({ monthStart, days }) => (
          <div key={monthStart.toISOString()}>
            {monthsToRender.length > 1 && (
              <div className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                {format(monthStart, 'MMMM yyyy')}
              </div>
            )}

            <div className="grid grid-cols-7 gap-1 pb-1">
              {WEEK_DAYS.map((label) => (
                <div key={`${monthStart.toISOString()}_${label}`} className="h-8 text-center text-xs font-medium text-gray-500 leading-8">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1 gap-x-0">
              {days.map((day) => {
                const isSelected = mode === 'single' && normalizedSelected.single && isSameDay(day, normalizedSelected.single);
                const inCurrentMonth = isSameMonth(day, monthStart);
                const isDisabled = isDayDisabled(day);

                const isRangeStart = mode === 'range' && normalizedSelected.from && isSameDay(day, normalizedSelected.from);
                const isRangeEnd = mode === 'range' && normalizedSelected.to && isSameDay(day, normalizedSelected.to);
                const isInRange =
                  mode === 'range' &&
                  normalizedSelected.from &&
                  normalizedSelected.to &&
                  isAfter(day, normalizedSelected.from) &&
                  isBefore(day, normalizedSelected.to);

                const isSingleDayRange = isRangeStart && isRangeEnd;
                const isPendingRangeStart = mode === 'range' && isRangeStart && !normalizedSelected.to;
                const isWeekStart = day.getDay() === 0;
                const isWeekEnd = day.getDay() === 6;

                const rangeFillClass = isSingleDayRange || isPendingRangeStart
                  ? 'inset-x-1 rounded-md'
                  : isRangeStart
                    ? 'left-1/2 right-0 rounded-none'
                    : isRangeEnd
                      ? 'left-0 right-1/2 rounded-none'
                      : isWeekStart
                        ? 'inset-y-0 left-0 right-0 rounded-l-md'
                        : isWeekEnd
                          ? 'inset-y-0 left-0 right-0 rounded-r-md'
                          : 'inset-x-0 rounded-none';

                return (
                  <div key={day.toISOString()} className="relative flex h-9 w-full items-center justify-center">
                    {(isInRange || isRangeStart || isRangeEnd) && (
                      <div
                        className={cn(
                          'pointer-events-none absolute inset-y-0 bg-nextgen-blue/15',
                          rangeFillClass
                        )}
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => handleSelect(day)}
                      disabled={isDisabled}
                      className={cn(
                        'relative z-10 h-9 w-9 text-sm transition-colors',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-nextgen-blue/40',
                        inCurrentMonth ? 'text-gray-900' : 'text-gray-300',
                        isDisabled ? 'cursor-not-allowed opacity-35 hover:bg-transparent hover:text-inherit' : '',
                        isToday(day) && !(isSelected || isRangeStart || isRangeEnd) ? 'font-semibold text-nextgen-blue-dark' : '',
                        isSelected || isSingleDayRange || isPendingRangeStart
                          ? 'rounded-md bg-nextgen-blue text-white hover:bg-nextgen-blue-dark'
                          : isRangeStart
                            ? 'rounded-l-md rounded-r-none bg-nextgen-blue text-white hover:bg-nextgen-blue-dark'
                            : isRangeEnd
                              ? 'rounded-r-md rounded-l-none bg-nextgen-blue text-white hover:bg-nextgen-blue-dark'
                          : isInRange
                            ? 'rounded-none text-nextgen-blue-dark hover:bg-nextgen-blue/10'
                            : 'rounded-md hover:bg-nextgen-blue/10 hover:text-nextgen-blue-dark'
                      )}
                      aria-pressed={isSelected || isRangeStart || isRangeEnd || isInRange}
                    >
                      {format(day, 'd')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

Calendar.propTypes = {
  mode: PropTypes.oneOf(['single', 'range']),
  selected: PropTypes.oneOfType([
    PropTypes.instanceOf(Date),
    PropTypes.shape({
      from: PropTypes.instanceOf(Date),
      to: PropTypes.instanceOf(Date),
    }),
  ]),
  onSelect: PropTypes.func,
  className: PropTypes.string,
  captionLayout: PropTypes.oneOf(['buttons', 'dropdown']),
  minDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  maxDate: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  numberOfMonths: PropTypes.number,
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
