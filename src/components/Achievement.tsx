'use client'

import { useState, useEffect } from 'react'

interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  unlocked: boolean
}

interface AchievementNotificationProps {
  achievement: Achievement
  onClose: () => void
}

function AchievementNotification({ achievement, onClose }: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300)
    }, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const rarityColors = {
    common: 'from-gray-400 to-gray-600',
    rare: 'from-blue-400 to-blue-600', 
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-yellow-400 to-yellow-600'
  }

  const rarityBorders = {
    common: 'border-gray-400',
    rare: 'border-blue-400',
    epic: 'border-purple-400', 
    legendary: 'border-yellow-400'
  }

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 transform ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`bg-white rounded-lg shadow-2xl border-2 ${rarityBorders[achievement.rarity]} p-4 max-w-sm`}>
        <div className="flex items-start space-x-3">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${rarityColors[achievement.rarity]} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
            {achievement.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-gray-900 text-sm">¡Achievement Desbloqueado!</h3>
              <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${rarityColors[achievement.rarity]} text-white font-medium`}>
                {achievement.rarity.toUpperCase()}
              </span>
            </div>
            <h4 className="font-semibold text-gray-800 mt-1">{achievement.title}</h4>
            <p className="text-gray-600 text-xs mt-1">{achievement.description}</p>
          </div>
          <button 
            onClick={() => {
              setIsVisible(false)
              setTimeout(onClose, 300)
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

interface AchievementBadgeProps {
  achievement: Achievement
  size?: 'sm' | 'md' | 'lg'
}

export function AchievementBadge({ achievement, size = 'md' }: AchievementBadgeProps) {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg', 
    lg: 'w-16 h-16 text-xl'
  }

  const rarityColors = {
    common: 'from-gray-400 to-gray-600',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-yellow-400 to-yellow-600'
  }

  return (
    <div className="group relative">
      <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${
        achievement.unlocked 
          ? rarityColors[achievement.rarity]
          : 'from-gray-300 to-gray-400'
        } flex items-center justify-center text-white font-bold shadow-lg transition-transform duration-200 ${
        achievement.unlocked ? 'group-hover:scale-110' : 'opacity-50'
      }`}>
        {achievement.unlocked ? achievement.icon : '🔒'}
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
          <div className="font-semibold">{achievement.title}</div>
          <div className="text-gray-300">{achievement.description}</div>
        </div>
        <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
      </div>
    </div>
  )
}

interface AchievementSystemProps {
  challengeId?: string
  onAchievementUnlocked?: (achievement: Achievement) => void
}

export default function AchievementSystem({ challengeId, onAchievementUnlocked }: AchievementSystemProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: 'first-hash',
      title: 'Primer Hash',
      description: 'Completaste tu primera función SHA-256',
      icon: '🔐',
      rarity: 'common',
      unlocked: false
    },
    {
      id: 'hash-master',
      title: 'Maestro del Hash',
      description: 'Dominaste las funciones criptográficas',
      icon: '🎯',
      rarity: 'rare',
      unlocked: false
    },
    {
      id: 'lightning-striker', 
      title: 'Rayo Certero',
      description: 'Completaste tu primer challenge Lightning',
      icon: '⚡',
      rarity: 'epic',
      unlocked: false
    },
    {
      id: 'bitcoin-wizard',
      title: 'Mago Bitcoin',
      description: 'Completaste todos los challenges básicos',
      icon: '🧙‍♂️',
      rarity: 'legendary',
      unlocked: false
    }
  ])

  const [notification, setNotification] = useState<Achievement | null>(null)

  const unlockAchievement = (achievementId: string) => {
    setAchievements(prev => prev.map(achievement => {
      if (achievement.id === achievementId && !achievement.unlocked) {
        const unlockedAchievement = { ...achievement, unlocked: true }
        setNotification(unlockedAchievement)
        onAchievementUnlocked?.(unlockedAchievement)
        return unlockedAchievement
      }
      return achievement
    }))
  }

  // Auto-unlock based on challenge completion
  useEffect(() => {
    if (challengeId === 'bitcoin-hash-256') {
      unlockAchievement('first-hash')
    } else if (challengeId === 'lightning-invoice') {
      unlockAchievement('lightning-striker')
    }
  }, [challengeId])

  const unlockedCount = achievements.filter(a => a.unlocked).length

  return (
    <>
      {/* Achievement Panel */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex items-center text-sm">
            <span className="mr-2">🏆</span>
            Achievements
          </h3>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {unlockedCount}/{achievements.length}
          </span>
        </div>
        
        <div className="grid grid-cols-4 gap-2 mb-3">
          {achievements.map((achievement) => (
            <AchievementBadge 
              key={achievement.id} 
              achievement={achievement}
              size="sm"
            />
          ))}
        </div>

        <div className="bg-gray-200 h-1.5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-500"
            style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
          />
        </div>
        
        {unlockedCount > 0 && (
          <p className="text-xs text-gray-600 mt-2 text-center">
            ¡Sigue así! {achievements.length - unlockedCount} por desbloquear
          </p>
        )}
      </div>

      {/* Achievement Notification */}
      {notification && (
        <AchievementNotification 
          achievement={notification}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  )
}