'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ExternalLinkIcon, Calendar } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface GitHubTooltipProps {
  readonly username: string
  readonly children: React.ReactNode
  readonly index?: number
}

interface GitHubRepo {
  name: string
  full_name: string
  description: string
  stargazers_count: number
  forks_count: number
  language: string
  updated_at: string
  html_url: string
}

export default function GitHubTooltip({ username, children, index }: GitHubTooltipProps) {
  const { t } = useTranslation()
  const [showTooltip, setShowTooltip] = useState(false)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (showTooltip && repos.length === 0) {
      fetchGitHubData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTooltip, username])

  const fetchGitHubData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch recent repos (only those with activity)
      const reposResponse = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=5&type=all`)
      if (!reposResponse.ok) throw new Error('Failed to fetch repositories')
      const reposData = await reposResponse.json()
      
      // Filter repos that have been updated recently (last 30 days)
      const recentRepos = reposData.filter((repo: GitHubRepo) => {
        const lastUpdate = new Date(repo.updated_at)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return lastUpdate > thirtyDaysAgo
      })
      
      setRepos(recentRepos.slice(0, 3))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) {
      return `hace ${diffInHours}h`
    } else if (diffInHours < 168) {
      const days = Math.floor(diffInHours / 24)
      return `hace ${days}d`
    } else {
      return formatDate(dateString)
    }
  }

  const renderReposContent = () => {
    if (loading) {
      return (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <div className="text-xs text-gray-500">{t('github_tooltip.loading_repos')}</div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center py-4">
          <div className="text-red-500 text-xs mb-2">⚠️</div>
          <div className="text-xs text-gray-500">{t('github_tooltip.error_loading_repos')}</div>
        </div>
      )
    }

    if (repos.length > 0) {
      return (
        <div>
          <div className="text-xs font-medium text-gray-700 mb-3">{t('github_tooltip.recent_repos')}</div>
          <div className="space-y-2">
            {repos.map((repo) => (
              <div key={repo.name} className="p-2 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center gap-2">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3 h-3 text-gray-500 shrink-0"
                    fill="currentColor"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline truncate block"
                    >
                      {repo.name}
                    </a>
                    <div className="text-xs text-gray-500 mt-1">
                      {getTimeAgo(repo.updated_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="text-center py-4">
        <div className="text-gray-400 text-2xl mb-2">📁</div>
        <div className="text-xs text-gray-500">{t('github_tooltip.no_recent_repos')}</div>
        <div className="text-xs text-gray-400 mt-1">{t('github_tooltip.no_activity_30_days')}</div>
      </div>
    )
  }

  return (
    <button
      type="button"
      className="relative inline-block cursor-pointer bg-transparent border-none p-0 m-0 text-inherit font-inherit"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      aria-label={`GitHub info for ${username}`}
    >
      {children}

      {showTooltip && (
        <div className={`absolute left-1/2 transform -translate-x-1/2 ml-8 ${
          index !== undefined && index < 4 
            ? 'top-full mt-3' 
            : 'bottom-full mb-3'
        }`} style={{ zIndex: 99999 }}>
          <div className="bg-white text-gray-900 text-sm rounded-lg py-3 px-4 shadow-lg border border-gray-200 min-w-80 max-w-96">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
              <Image
                src={`https://github.com/${username}.png`}
                alt={username}
                width={32}
                height={32}
                className="rounded-full border border-gray-200"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm">@{username}</div>
                <div className="text-xs text-gray-500">{t('github_tooltip.collaboration_activity')}</div>
              </div>
              <a
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            </div>

            {/* Recent Repositories */}
            {renderReposContent()}

            {/* Footer */}
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {t('github_tooltip.last_30_days')}
                </div>
                <a
                  href={`https://github.com/${username}?tab=repositories`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  {t('github_tooltip.view_all')}
                </a>
              </div>
            </div>

            {/* Arrow */}
            <div className={`absolute left-1/2 transform -translate-x-1/2 ${
              index !== undefined && index < 4 
                ? 'bottom-full border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-white' 
                : 'top-full border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white'
            }`}></div>
          </div>
        </div>
      )}
    </button>
  )
}