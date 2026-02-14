import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info 
} from 'lucide-react';

const alertVariants = cva(
  "relative w-full rounded-xl border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-white text-gray-900 border-gray-200/60",
        destructive: "bg-red-50/50 text-red-900 border-red-200/60 [&>svg]:text-red-500",
        success: "bg-green-50/50 text-green-900 border-green-200/60 [&>svg]:text-green-500",
        warning: "bg-amber-50/50 text-amber-900 border-amber-200/60 [&>svg]:text-amber-500",
        info: "bg-blue-50/50 text-blue-900 border-blue-200/60 [&>svg]:text-blue-500",
        nextgen: "bg-[#30cee4]/10 text-[#1ca7bc] border-[#30cee4]/30 [&>svg]:text-[#30cee4]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef(({ className, variant, children, icon, ...props }, ref) => {
  const IconComponent = icon || getIconForVariant(variant);
  
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {IconComponent && <IconComponent className="h-5 w-5" />}
      {children}
    </div>
  );
});

Alert.displayName = "Alert";

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('mb-1 font-semibold text-sm leading-tight tracking-tight', className)}
    {...props}
  />
));

AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  />
));

AlertDescription.displayName = "AlertDescription";

function getIconForVariant(variant) {
  switch (variant) {
    case 'destructive':
      return XCircle;
    case 'success':
      return CheckCircle2;
    case 'warning':
      return AlertTriangle;
    case 'info':
      return Info;
    case 'nextgen':
      return AlertCircle;
    default:
      return null;
  }
}

export { Alert, AlertTitle, AlertDescription };
