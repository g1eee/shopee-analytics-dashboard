import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface CopyButtonProps {
  value: string
  label?: string
  className?: string
  size?: 'sm' | 'md'
}

export function CopyButton({ value, label = 'Salin nama produk', className = '', size = 'sm' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const onClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!value) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        // Fallback for older browsers / non-secure contexts
        const ta = document.createElement('textarea')
        ta.value = value
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignore — silent failure is OK for clipboard
    }
  }

  const sizeCls = size === 'md' ? 'h-7 w-7' : 'h-6 w-6'
  const iconSize = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'

  return (
    <button
      type="button"
      onClick={onClick}
      title={copied ? 'Tersalin!' : label}
      aria-label={label}
      className={
        `${sizeCls} shrink-0 rounded-md border border-border bg-bg-elev/60 hover:bg-bg-hover ` +
        `flex items-center justify-center transition-colors ` +
        (copied ? 'text-emerald-300 border-emerald-500/40' : 'text-muted hover:text-white') +
        ' ' +
        className
      }
    >
      {copied ? <Check className={iconSize} /> : <Copy className={iconSize} />}
    </button>
  )
}
