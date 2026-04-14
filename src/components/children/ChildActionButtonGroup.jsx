import { HoverCard, HoverCardContent } from '../ui';

const toneClasses = {
  primary: 'bg-nextgen-blue/15 text-nextgen-blue-dark hover:bg-nextgen-blue/25',
  secondary: 'bg-nextgen-orange/20 text-nextgen-orange-dark hover:bg-nextgen-orange/30',
  tertiary: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
};

const ActionItem = ({
  label,
  icon,
  onClick,
  disabled = false,
  loading = false,
  tone = 'primary',
  hoverTitle,
  hoverDescription,
  className = '',
}) => {
  const content = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={label}
      title={label}
      className={[
        'relative flex min-h-[42px] w-full items-center justify-center px-2 text-sm font-medium',
        'transition-colors focus:z-10 focus:outline-none focus:ring-2 focus:ring-nextgen-blue',
        toneClasses[tone],
        disabled || loading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      ].join(' ')}
    >
      <span className="inline-flex h-4 w-4 items-center justify-center">{icon}</span>
      {loading && (
        <svg className="absolute right-1.5 top-1.5 h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
    </button>
  );

  if (!hoverTitle && !hoverDescription) return content;

  return (
    <HoverCard openDelay={100} closeDelay={100}>
      {({ open, handleOpen, handleClose, triggerRef, position, updatePosition }) => (
        <div
          ref={triggerRef}
          className="relative flex-1 basis-0"
          onMouseEnter={() => {
            updatePosition('bottom');
            handleOpen();
          }}
          onMouseLeave={handleClose}
        >
          {content}
          <HoverCardContent open={open} side="bottom" position={position}>
            <div className="flex flex-col gap-1">
              {hoverTitle && <h4 className="text-sm font-medium">{hoverTitle}</h4>}
              {hoverDescription && <p className="text-xs text-gray-600">{hoverDescription}</p>}
            </div>
          </HoverCardContent>
        </div>
      )}
    </HoverCard>
  );
};

const ChildActionButtonGroup = ({
  primaryAction,
  secondaryAction,
  editAction,
  className = '',
}) => {
  return (
    <div className={["w-full", className].join(' ')}>
      <div className="inline-flex w-full overflow-hidden rounded-md border border-gray-200 shadow-sm">
        <ActionItem {...primaryAction} tone="primary" className="rounded-none" />
        <ActionItem {...secondaryAction} tone="secondary" className="rounded-none border-l border-white/60" />
        {editAction && (
          <>
            <ActionItem {...editAction} tone="tertiary" className="rounded-none border-l border-white/60" />
          </>
        )}
      </div>
    </div>
  );
};

export default ChildActionButtonGroup;
