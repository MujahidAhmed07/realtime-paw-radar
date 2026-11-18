import { forwardRef, type LabelHTMLAttributes } from 'react'

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={'label-base' + (className ? ' ' + className : '')} {...props} />
  )
)
Label.displayName = 'Label'
