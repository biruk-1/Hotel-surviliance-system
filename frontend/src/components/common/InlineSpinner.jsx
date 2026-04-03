import './inline-spinner.css'

/**
 * @param {{ size?: 'sm' | 'md'; label?: string }} props
 */
export default function InlineSpinner({ size = 'md', label = 'Loading' }) {
  return (
    <span className={`inline-spinner inline-spinner--${size}`} role="status" aria-label={label}>
      <span className="inline-spinner__dot" />
    </span>
  )
}
