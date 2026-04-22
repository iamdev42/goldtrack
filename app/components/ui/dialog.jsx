import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '~/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export const DialogOverlay = forwardRef(function DialogOverlay({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        'fixed inset-0 z-50 bg-black/40',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
        className
      )}
      {...props}
    />
  )
})

export const DialogContent = forwardRef(function DialogContent(
  { className, children, ...props },
  ref
) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        // Mobile: bottom sheet. sm+: centered modal.
        className={cn(
          'fixed left-0 right-0 bottom-0 z-50 bg-white shadow-xl rounded-t-2xl',
          'max-h-[90vh] overflow-y-auto',
          'sm:left-1/2 sm:right-auto sm:bottom-auto sm:top-1/2',
          'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:rounded-2xl',
          'focus:outline-none',
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})

export function DialogHeader({ className, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-b border-gray-100 px-6 pt-5 pb-3 sticky top-0 bg-white z-10',
        className
      )}
      {...props}
    />
  )
}

export const DialogTitle = forwardRef(function DialogTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      className={cn('text-xl font-bold text-brand-800', className)}
      {...props}
    />
  )
})

export const DialogDescription = forwardRef(function DialogDescription(
  { className, ...props },
  ref
) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-gray-500', className)}
      {...props}
    />
  )
})

/** Close button (the X in the corner). Embed inside DialogHeader. */
export function DialogCloseButton({ className }) {
  return (
    <DialogPrimitive.Close
      className={cn(
        'rounded-full p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-400',
        className
      )}
      aria-label="Close"
    >
      <X className="h-5 w-5" />
    </DialogPrimitive.Close>
  )
}
