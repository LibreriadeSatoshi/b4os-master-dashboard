'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Trophy, WorkflowIcon, UserCheck, MessageSquare, Calendar } from 'lucide-react'
import { SupabaseService } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'

interface GradesBreakdownProps {
  username: string
  isExpanded: boolean
  selectedAssignment?: string  // Filter to show only this assignment
  onOpenActions?: (username: string, assignmentName: string) => void
  onOpenReview?: (username: string, assignmentName: string) => void
  onDataUpdate?: () => void
  refreshTrigger?: number  // Increment to force refresh of review data
}

interface GradeBreakdown {
  assignment_name: string
  points_awarded: number | null
  points_available: number | null
  progress: number | null
  fork_created_at?: string | null
  fork_updated_at?: string | null
}

export default function GradesBreakdown({ username, isExpanded, selectedAssignment, onOpenActions, onOpenReview, refreshTrigger }: GradesBreakdownProps) {
  const { t } = useTranslation()
  const [grades, setGrades] = useState<GradeBreakdown[]>([])
  const [reviewData, setReviewData] = useState<{[key: string]: {reviewers: unknown[], comments: unknown[]}}>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isExpanded) {
      loadGradesBreakdown()
    }
  }, [isExpanded, username, selectedAssignment])

  // Reload review data when refreshTrigger changes (after reviewer assignment/update)
  useEffect(() => {
    if (isExpanded && grades.length > 0 && refreshTrigger !== undefined && refreshTrigger > 0) {
      loadReviewDataForGrades(grades)
    }
  }, [refreshTrigger])

  const loadGradesBreakdown = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const breakdown = await SupabaseService.getStudentGradesBreakdown(username)

      // Filter only assignments that have been accepted (have fork_created_at)
      const acceptedAssignments = breakdown.filter(grade => grade.fork_created_at !== null)

      const filteredBreakdown = selectedAssignment && selectedAssignment !== 'all'
        ? acceptedAssignments.filter(grade => grade.assignment_name === selectedAssignment)
        : acceptedAssignments

      // Sort by fork_created_at (oldest first) for chronological order
      const sortedBreakdown = filteredBreakdown.sort((a, b) => {
        if (!a.fork_created_at && !b.fork_created_at) return 0
        if (!a.fork_created_at) return 1
        if (!b.fork_created_at) return -1
        return new Date(a.fork_created_at).getTime() - new Date(b.fork_created_at).getTime()
      })

      setGrades(sortedBreakdown)

      // Load review data for these assignments
      await loadReviewDataForGrades(sortedBreakdown)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading grades')
    } finally {
      setIsLoading(false)
    }
  }

  const loadReviewDataForGrades = async (gradesData: GradeBreakdown[]) => {
    try {
      const reviewers = await SupabaseService.getStudentReviewersByStudent(username)
      const comments = await SupabaseService.getReviewComments(username)

      const reviewDataMap: {[key: string]: {reviewers: unknown[], comments: unknown[]}} = {}

      gradesData.forEach(grade => {
        reviewDataMap[grade.assignment_name] = {
          reviewers: reviewers.filter(r => r.assignment_name === grade.assignment_name),
          comments: comments.filter(c => c.assignment_name === grade.assignment_name)
        }
      })

      setReviewData(reviewDataMap)
    } catch (err) {
      console.error('Error loading review data:', err)
    }
  }

  const getStatusIcon = (progress: number | null) => {
    if (progress === null || progress === 0) {
      return <Clock className="w-4 h-4 text-gray-400" />
    } else if (progress >= 80) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    } else if (progress >= 60) {
      return <Trophy className="w-4 h-4 text-yellow-500" />
    } else {
      return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = (progress: number | null) => {
    if (progress === null || progress === 0) {
      return 'text-gray-500'
    } else if (progress >= 80) {
      return 'text-green-600'
    } else if (progress >= 60) {
      return 'text-yellow-600'
    } else {
      return 'text-red-600'
    }
  }

  const getprogressColor = (progress: number | null) => {
    if (progress === null || progress === 0) {
      return 'bg-gray-200'
    } else if (progress >= 80) {
      return 'bg-green-500'
    } else if (progress >= 60) {
      return 'bg-yellow-500'
    } else {
      return 'bg-red-500'
    }
  }

  const getReviewStatus = (assignmentName: string) => {
    const data = reviewData[assignmentName]
    if (!data || data.reviewers.length === 0) {
      return { status: 'none', text: t('grades_breakdown.status.no_reviewer'), color: 'text-gray-500' }
    }
    
    const hasInprogress = data.reviewers.some((r: unknown) => (r as { status: string }).status === 'in_progress')
    const hasCompleted = data.reviewers.some((r: unknown) => (r as { status: string }).status === 'completed')
    
    if (hasCompleted) {
      return { status: 'completed', text: t('grades_breakdown.status.reviewed'), color: 'text-green-600' }
    } else if (hasInprogress) {
      return { status: 'in_progress', text: t('grades_breakdown.status.in_review'), color: 'text-amber-600' }
    } else {
      return { status: 'pending', text: t('grades_breakdown.status.pending'), color: 'text-blue-600' }
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateShort = (dateString: string | null | undefined) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const calculateDurationDays = (startDate: string | null | undefined, endDate: string | null | undefined): number => {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(1, diffDays) // Mínimo 1 día
  }

  const getReviewCounts = (assignmentName: string) => {
    const data = reviewData[assignmentName]
    if (!data) return { reviewers: 0, comments: 0 }

    return {
      reviewers: data.reviewers.length,
      comments: data.comments.length
    }
  }

  if (!isExpanded) return null

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900">{t('grades_breakdown.title')}</h4>
        <div className="text-sm text-gray-500">
          {t('grades_breakdown.assignments_count').replace('{count}', grades.length.toString())}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">{t('grades_breakdown.loading_grades')}</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <button
            onClick={loadGradesBreakdown}
            className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
          >
            {t('grades_breakdown.retry_button')}
          </button>
        </div>
      ) : grades.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">{t('grades_breakdown.no_grades')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {grades.map((grade) => {
            const reviewStatus = getReviewStatus(grade.assignment_name)
            const reviewCounts = getReviewCounts(grade.assignment_name)
            
            return (
              <div key={grade.assignment_name} className="grades-breakdown-card bg-white rounded-lg p-2 border border-gray-200 hover:shadow-sm transition-shadow">
                {/* Header with status icon and title */}
                <div className="flex items-start gap-2 mb-1.5">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(grade.progress)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-gray-900 text-sm truncate leading-tight">
                      {grade.assignment_name}
                    </h5>
                    {grade.fork_created_at && (() => {
                      const createdDate = new Date(grade.fork_created_at)
                      const updatedDate = grade.fork_updated_at ? new Date(grade.fork_updated_at) : null
                      const isSameDay = updatedDate && createdDate.toDateString() === updatedDate.toDateString()
                      const duration = calculateDurationDays(grade.fork_created_at, grade.fork_updated_at)
                      const hasprogress = grade.progress !== null && grade.progress > 0

                      return (
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-600 leading-tight">
                          <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="whitespace-nowrap">
                            {!hasprogress ? (
                              // Sin progreso: solo mostrar fecha de inicio
                              <>{formatDateShort(grade.fork_created_at)}</>
                            ) : isSameDay || !updatedDate ? (
                              // Mismo día con progreso
                              <>
                                {formatDateShort(grade.fork_created_at)}
                                <span className="text-gray-400"> · {duration} {duration > 1 ? t('grades_breakdown.duration.days') : t('grades_breakdown.duration.day')}</span>
                              </>
                            ) : (
                              // Días diferentes con progreso
                              <>
                                {formatDateShort(grade.fork_created_at)}
                                <span className="text-gray-400"> → </span>
                                {formatDateShort(grade.fork_updated_at)}
                                <span className="text-gray-400"> · {duration}{t('grades_breakdown.duration.day_short')}</span>
                              </>
                            )}
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="buttons-container flex gap-1 flex-shrink-0">
                    {onOpenActions && (
                      <button
                        onClick={() => onOpenActions(username, grade.assignment_name)}
                        className="w-5 h-5 bg-gray-50 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded flex items-center justify-center cursor-pointer transition-colors group"
                        title="Ver GitHub Actions"
                      >
                        <WorkflowIcon className="w-2.5 h-2.5 text-gray-500 group-hover:text-orange-600" />
                      </button>
                    )}
                    {onOpenReview && (
                      <button
                        onClick={() => onOpenReview(username, grade.assignment_name)}
                        className="w-5 h-5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded flex items-center justify-center cursor-pointer transition-colors group"
                        title="Revisar"
                      >
                        <UserCheck className="w-2.5 h-2.5 text-gray-500 group-hover:text-blue-600" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Score and progress */}
                <div className="flex items-center gap-2 mb-1">
                  <div className={`text-left ${getStatusColor(grade.progress)}`}>
                    <div className="text-base font-bold leading-tight">
                      {grade.progress || 0}%
                    </div>
                    <div className="text-[10px] text-gray-500 leading-tight">
                      {grade.points_awarded || 0}/{grade.points_available || 0}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${getprogressColor(grade.progress)}`}
                        style={{ width: `${Math.min(grade.progress || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Status and Review Info */}
                <div className="flex items-center justify-between text-[10px]">
                  <div className="text-gray-600">
                    {grade.progress === null || grade.progress === 0 ? (
                      <span className="text-gray-500">Sin PoW</span>
                    ) : grade.progress >= 80 ? (
                      <span className="text-green-600 font-medium">Excelente</span>
                    ) : grade.progress >= 60 ? (
                      <span className="text-yellow-600 font-medium">Bueno</span>
                    ) : (
                      <span className="text-red-600 font-medium">Necesita mejorar</span>
                    )}
                  </div>

                  {/* Review Status */}
                  <div className="flex items-center gap-1.5">
                    <span className={`font-medium ${reviewStatus.color}`}>
                      {reviewStatus.text}
                    </span>
                    {(reviewCounts.reviewers > 0 || reviewCounts.comments > 0) && (
                      <div className="flex items-center gap-1">
                        {reviewCounts.reviewers > 0 && (
                          <button
                            onClick={() => onOpenReview?.(username, grade.assignment_name)}
                            className="flex items-center gap-0.5 hover:bg-green-50 hover:text-green-600 px-1 py-0.5 rounded transition-colors cursor-pointer"
                            title="Ver revisores"
                          >
                            <UserCheck className="w-2.5 h-2.5" />
                            <span>{reviewCounts.reviewers}</span>
                          </button>
                        )}
                        {reviewCounts.comments > 0 && (
                          <button
                            onClick={() => onOpenReview?.(username, grade.assignment_name)}
                            className="flex items-center gap-0.5 hover:bg-blue-50 hover:text-blue-600 px-1 py-0.5 rounded transition-colors cursor-pointer"
                            title="Ver comentarios"
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>{reviewCounts.comments}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
