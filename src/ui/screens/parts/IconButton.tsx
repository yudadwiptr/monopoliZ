import clsx from 'clsx';
import { Button, type ButtonProps } from '@/ui/common';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'size'> {
  label: string;
  children: React.ReactNode;
}

/** Square 44px touch target built on the shared Button (glass by default). */
export function IconButton({ label, children, className, variant = 'glass', ...rest }: IconButtonProps) {
  return (
    <Button
      variant={variant}
      size="md"
      aria-label={label}
      title={label}
      className={clsx('h-11 w-11 shrink-0 !px-0', className)}
      {...rest}
    >
      {children}
    </Button>
  );
}
