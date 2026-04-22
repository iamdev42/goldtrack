import { forwardRef } from 'react'
import { cn } from '~/lib/utils'

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base',
        'placeholder:text-gray-400 resize-y',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
})
