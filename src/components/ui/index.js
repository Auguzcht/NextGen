// Legacy components
export { default as Badge } from './Badge';
export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as Input } from './Input';
export { default as Spinner } from './Spinner';
export { default as Modal } from './Modal';
export { default as Table } from './Table';
export { default as NextGenChart } from './Chart';

// New shadcn-inspired components
export { Alert as AlertNew, AlertTitle, AlertDescription } from './AlertNew';
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './DialogNew';
export { ToastProvider, useToast, toast } from './Toast';