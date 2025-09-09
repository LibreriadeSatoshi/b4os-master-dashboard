'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRightIcon, HomeIcon, TrendingUpIcon } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const pathname = usePathname()

  // Auto-generate breadcrumbs if not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/' }
    ]

    let currentPath = ''
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      
      let label = segment
      switch (segment) {
        case 'challenges':
          label = 'Challenges'
          break
        case 'start':
          label = 'Start'
          break
        case 'bitcoin-hash-256':
          label = 'Bitcoin SHA-256'
          break
        case 'lightning-invoice':
          label = 'Lightning Invoice'
          break
        default:
          label = segment.charAt(0).toUpperCase() + segment.slice(1)
      }

      breadcrumbs.push({
        label,
        href: currentPath
      })
    })

    return breadcrumbs
  }

  const breadcrumbs = items || generateBreadcrumbs()

  if (breadcrumbs.length <= 1) return null

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6 bg-white/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-200">
      {breadcrumbs.map((item, index) => (
        <div key={item.href} className="flex items-center">
          {index > 0 && (
            <ChevronRightIcon className="w-4 h-4 text-gray-400 mx-2" />
          )}
          {index === breadcrumbs.length - 1 ? (
            <span className="text-gray-900 font-medium">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="hover:text-orange-500 transition-colors flex items-center gap-1"
            >
              {index === 0 && <HomeIcon className="w-3 h-3" />}
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}

// Progress indicator component for challenges
interface ProgressIndicatorProps {
  currentChapter: number
  totalChapters: number
  currentChallenge?: string
}

export function ProgressIndicator({ 
  currentChapter, 
  totalChapters, 
  currentChallenge 
}: ProgressIndicatorProps) {
  const progress = (currentChapter / totalChapters) * 100

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-gray-900">Your Progress</h3>
          </div>
          {currentChallenge && (
            <p className="text-sm text-gray-600 mt-1">Chapter {currentChapter}: {currentChallenge}</p>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-orange-500">{currentChapter}</div>
          <div className="text-xs text-gray-500">of {totalChapters}</div>
        </div>
      </div>
      
      <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>Starting</span>
        <span>Mastering Bitcoin</span>
      </div>
    </div>
  )
}