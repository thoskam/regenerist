import Image from 'next/image'

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: { container: 'w-6 h-6', text: 'text-xs' },
  md: { container: 'w-8 h-8', text: 'text-sm' },
  lg: { container: 'w-12 h-12', text: 'text-lg' },
}

const imageSizes = {
  sm: 24,
  md: 32,
  lg: 48,
}

export default function UserAvatar({ src, name, size = 'md', className = '' }: UserAvatarProps) {
  const { container, text } = sizes[size]
  const imageSize = imageSizes[size]

  if (src) {
    return (
      <Image
        src={src}
        alt={name || 'User avatar'}
        width={imageSize}
        height={imageSize}
        className={`rounded-full ${className}`}
      />
    )
  }

  const initial = (name || '?')[0].toUpperCase()

  return (
    <div
      className={`${container} rounded-full bg-slate-700 flex items-center justify-center ${text} text-slate-400 ${className}`}
    >
      {initial}
    </div>
  )
}
