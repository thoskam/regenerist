'use client'

interface RegenerateButtonProps {
  onClick: () => void
  isLoading: boolean
}

export default function RegenerateButton({ onClick, isLoading }: RegenerateButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`
        relative overflow-hidden px-8 py-4 rounded-lg font-bold text-lg
        transition-all duration-300 transform
        ${isLoading
          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-900 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/30'
        }
      `}
    >
      <span className={`relative z-10 ${isLoading ? '' : 'animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:200%_100%]'}`}>
        {isLoading ? 'Regenerating...' : 'REGENERATE'}
      </span>
      {!isLoading && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 opacity-0 hover:opacity-20 transition-opacity" />
      )}
    </button>
  )
}
