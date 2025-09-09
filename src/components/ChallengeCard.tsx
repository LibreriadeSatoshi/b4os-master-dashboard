'use client'

import Link from 'next/link'
import { ChallengeMetadata } from '@/types/challenge'
import clsx from 'clsx'
import { CheckCircleIcon, LockIcon, ClockIcon, CrownIcon } from 'lucide-react'

interface ChallengeCardProps {
  challenge: ChallengeMetadata
  completed?: boolean
  locked?: boolean
}

const difficultyColors = {
  beginner: 'bg-green-100 text-green-800 border-green-200',
  intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  advanced: 'bg-red-100 text-red-800 border-red-200',
}

const categoryColors = {
  'bitcoin-basics': 'bg-orange-500',
  'transactions': 'bg-blue-500',
  'lightning-network': 'bg-purple-500',
  'scripting': 'bg-green-500',
  'cryptography': 'bg-red-500',
}

export default function ChallengeCard({ challenge, completed = false, locked = false }: ChallengeCardProps) {
  const CardContent = () => (
    <div className={clsx(
      'bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-200',
      completed && 'border-green-300 bg-green-50 ring-2 ring-green-100',
      locked && 'opacity-60 cursor-not-allowed',
      !locked && !completed && 'hover:border-orange-300 hover:-translate-y-2 hover:shadow-2xl'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'w-3 h-3 rounded-full',
            categoryColors[challenge.category]
          )} />
          <div className="flex items-center gap-2">
            {completed && (
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-3 h-3 text-white" />
              </div>
            )}
            {locked && (
              <div className="w-5 h-5 bg-gray-400 rounded-full flex items-center justify-center">
                <LockIcon className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
          <CrownIcon className="w-3 h-3" />
          {challenge.points} pts
        </div>
      </div>

      {/* Title and Description */}
      <h3 className="text-xl font-bold text-gray-900 mb-3 leading-tight">
        {challenge.title}
      </h3>
      <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
        {challenge.description}
      </p>

      {/* Metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={clsx(
            'px-2 py-1 rounded-full text-xs font-medium border',
            difficultyColors[challenge.difficulty]
          )}>
            {challenge.difficulty}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <ClockIcon className="w-3 h-3" />
            {challenge.estimatedTime} min
          </div>
        </div>
        
        <div className="text-xs text-gray-500 font-medium capitalize">
          {challenge.category.replace('-', ' ')}
        </div>
      </div>

      {/* Prerequisites */}
      {challenge.prerequisites && challenge.prerequisites.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Prerequisites:</p>
          <div className="flex flex-wrap gap-1">
            {challenge.prerequisites.map((prereq) => (
              <span 
                key={prereq}
                className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
              >
                {prereq}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  if (locked) {
    return <CardContent />
  }

  return (
    <Link href={`/challenges/${challenge.id}`} className="block">
      <CardContent />
    </Link>
  )
}