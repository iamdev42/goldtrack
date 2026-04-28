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

/**
 * Dialog content uses a 3-region flex column:
 *
 *   ┌─────────────────────┐
 *   │ DialogHeader        │  fixed at top
 *   ├─────────────────────┤
 *   │ DialogBody          │  scrollable
 *   │ ...                 │
 *   ├─────────────────────┤
 *   │ DialogFooter        │  fixed at bottom (e.g. for Save/Cancel)
 *   └─────────────────────┘
 *
 * Forms wrap their button row in <DialogFooter> to get a sticky save bar.
 * If a form doesn't use DialogFooter, the body just scrolls all the way.
 *
 * The container caps the dialog height to 90vh so the sticky footer doesn't
 * sit way below the viewport on tall screens. Body uses min-h-0 so it can
 * actually shrink below its content's natural size — without that, flex
 * children refuse to scroll.
 */
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
          'flex flex-col max-h-[90vh]',
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
        // No longer position:sticky — it's a fixed-height flex child at the top.
        // Background stays white so the body scrolling behind doesn't bleed through.
        'flex items-center justify-between border-b border-gray-100 bg-white px-6 pt-5 pb-3',
        className
      )}
      {...props}
    />
  )
}

/**
 * Scrollable body. Replaces the implicit body region — every form should
 * wrap its content in DialogBody (or set similar styling on its own root).
 *
 * If you don't wrap a body, the dialog still scrolls but the footer won't
 * pin correctly because the children won't have a flex-grow region.
 */
export function DialogBody({ className, ...props }) {
  return (
    <div
      className={cn(
        // flex-1 + min-h-0 is the key: lets this region shrink AND grow within
        // the flex column. overflow-y-auto handles the scroll.
        'flex-1 min-h-0 overflow-y-auto',
        className
      )}
      {...props}
    />
  )
}

/**
 * Sticky footer at the bottom of the dialog. Sits below the scrolling body.
 *
 * Visually distinct: a subtle brand-cream wash + slightly stronger top border
 * make the bar read as "this is a separate, always-visible region" instead of
 * looking like the page just got cut off.
 *
 * Bottom corners are rounded on sm+ to match the dialog's outer curve. On
 * mobile (bottom sheet, no bottom radius on the dialog itself) we leave them
 * square — the footer flows to the screen edge.
 */
export function DialogFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-b-2xl border-t border-gray-200 bg-brand-50/60 px-6 py-3',
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
