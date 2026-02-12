import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const GITHUB_ORG = 'B4OS-Dev'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''

// Assignment order as displayed in dashboard
const ASSIGNMENT_ORDER = [
  'the-moria-mining-codex-part-1',
  'the-moria-mining-codex-part-2',
  'bitcoin-core-setup-and-tests',
  'vintage-wallet-modernization-challenge',
  'curse-of-missing-descriptors',
  'tweaks-generator-for-silent-payments'
]

/** Format resolution time as "X dias Y horas Z min W seg" */
function formatResolutionTime(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) return '0 dias 00 horas 00 min 00 seg'

  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffMs = end.getTime() - start.getTime()

  if (diffMs <= 0) return '0 dias 00 horas 00 min 00 seg'

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)

  return `${days} dias ${String(hours).padStart(2, '0')} horas ${String(minutes).padStart(2, '0')} min ${String(seconds).padStart(2, '0')} seg`
}

/** Get commit count for a repository from GitHub API (filtered by author) */
async function getCommitCount(repoName: string, author: string): Promise<number> {
  if (!GITHUB_TOKEN) {
    return 0
  }

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'B4OS-Dashboard',
      'Authorization': `Bearer ${GITHUB_TOKEN}`
    }

    // First, try to get total count via Link header (efficient for large repos)
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/commits?author=${encodeURIComponent(author)}&per_page=1`,
      { headers }
    )

    if (!response.ok) return 0

    // GitHub returns total count in Link header for pagination
    const linkHeader = response.headers.get('Link')
    if (linkHeader) {
      const match = linkHeader.match(/page=(\d+)>; rel="last"/)
      if (match) return parseInt(match[1], 10)
    }

    // No pagination means <= 1 commit, fetch actual count with larger page
    const fullResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_ORG}/${repoName}/commits?author=${encodeURIComponent(author)}&per_page=100`,
      { headers }
    )

    if (!fullResponse.ok) return 0

    const data = await fullResponse.json()
    return Array.isArray(data) ? data.length : 0
  } catch {
    return 0
  }
}

/** Fetch commits for multiple repos in batches to avoid rate limiting */
async function getCommitsInBatches(
  repos: Array<{ key: string; repoName: string; username: string }>,
  batchSize = 10
): Promise<Map<string, number>> {
  const results = new Map<string, number>()

  for (let i = 0; i < repos.length; i += batchSize) {
    const batch = repos.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async ({ key, repoName, username }) => {
        const count = await getCommitCount(repoName, username)
        return { key, count }
      })
    )
    batchResults.forEach(({ key, count }) => results.set(key, count))
  }

  return results
}

/** Escape a CSV cell (quotes and commas). */
function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Build CSV line from an array of cell values. */
function csvLine(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsvCell).join(',')
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user?.role
    const isAdminOrInstructor = userRole === 'admin' || userRole === 'instructor'
    if (!isAdminOrInstructor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const [assignmentsResult, gradesResult, studentsResult] = await Promise.all([
      supabase
        .from('zzz_assignments')
        .select('id, name, points_available')
        .order('name'),
      supabase
        .from('zzz_grades')
        .select('github_username, assignment_name, points_awarded, fork_created_at, fork_updated_at')
        .order('github_username')
        .order('assignment_name'),
      supabase
        .from('zzz_students')
        .select('github_username')
    ])

    const assignmentsRaw = assignmentsResult.data || []
    // Sort assignments by predefined order
    const assignments = [...assignmentsRaw].sort((a, b) => {
      const indexA = ASSIGNMENT_ORDER.indexOf(a.name)
      const indexB = ASSIGNMENT_ORDER.indexOf(b.name)
      // If not in list, put at the end
      const orderA = indexA === -1 ? ASSIGNMENT_ORDER.length : indexA
      const orderB = indexB === -1 ? ASSIGNMENT_ORDER.length : indexB
      return orderA - orderB
    })
    const grades = gradesResult.data || []
    const students = studentsResult.data || []

    const assignmentMap = new Map(assignments.map(a => [a.name, a.points_available ?? 0]))
    const gradesByKey = new Map<string, { points_awarded: number | null; fork_created_at: string | null; fork_updated_at: string | null }>()
    grades.forEach(g => {
      gradesByKey.set(`${g.github_username}|${g.assignment_name}`, {
        points_awarded: g.points_awarded ?? null,
        fork_created_at: g.fork_created_at ?? null,
        fork_updated_at: g.fork_updated_at ?? null
      })
    })

    const studentUsernames = new Set(students.map(s => s.github_username))
    grades.forEach(g => studentUsernames.add(g.github_username))
    const allStudents = Array.from(studentUsernames).sort()

    const exportDate = new Date().toISOString().slice(0, 19)
    const totalStudents = allStudents.length
    const totalAssignments = assignments.length
    const totalGrades = grades.length
    const avgScore = totalGrades > 0
      ? Math.round(grades.reduce((sum, g) => sum + (Number(g.points_awarded) || 0), 0) / totalGrades)
      : 0
    const completionRate = totalStudents > 0 && totalAssignments > 0
      ? Math.round((totalGrades / (totalStudents * totalAssignments)) * 100)
      : 0

    // Build list of repos that need commit counts (only those with forks)
    const reposToFetch: Array<{ key: string; repoName: string; username: string }> = []
    for (const username of allStudents) {
      for (const assignment of assignments) {
        const key = `${username}|${assignment.name}`
        const grade = gradesByKey.get(key)
        if (grade?.fork_created_at) {
          const repoName = `${assignment.name}-${username}`
          reposToFetch.push({ key, repoName, username })
        }
      }
    }

    // Fetch commit counts from GitHub API
    const commitCounts = await getCommitsInBatches(reposToFetch)

    const headerRow = [
      'github_username',
      'assignment_name',
      'points_available',
      'points_awarded',
      'challenge_accepted_at',
      'challenge_updated_at',
      'commits',
      'Resolution time'
    ]

    const lines: string[] = [
      csvLine(['B4OS Course Status Report', '', '', '', '', '', '', '']),
      csvLine(['Export date', exportDate, '', '', '', '', '', '']),
      csvLine(['Total students', totalStudents, '', '', '', '', '', '']),
      csvLine(['Total assignments', totalAssignments, '', '', '', '', '', '']),
      csvLine(['Total grades', totalGrades, '', '', '', '', '', '']),
      csvLine(['Average score (points)', avgScore, '', '', '', '', '', '']),
      csvLine(['Completion rate (%)', completionRate, '', '', '', '', '', '']),
      csvLine([]),
      csvLine(headerRow)
    ]

    for (const username of allStudents) {
      for (const assignment of assignments) {
        const key = `${username}|${assignment.name}`
        const pointsAvailable = assignment.points_available ?? 0
        const grade = gradesByKey.get(key)
        const pointsAwarded = grade?.points_awarded ?? 0
        const challengeAccepted = grade?.fork_created_at ?? ''
        const challengeUpdated = grade?.fork_updated_at ?? ''
        const commits = commitCounts.get(key) ?? 0
        const resolutionTime = formatResolutionTime(grade?.fork_created_at ?? null, grade?.fork_updated_at ?? null)

        lines.push(
          csvLine([
            username,
            assignment.name,
            pointsAvailable,
            pointsAwarded,
            challengeAccepted,
            challengeUpdated,
            commits,
            resolutionTime
          ])
        )
      }
    }

    const csv = lines.join('\r\n')
    const filename = `course-status-report-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store'
      }
    })
  } catch (error) {
    console.error('Error generating course status report:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Failed to generate report', details: errorMessage },
      { status: 500 }
    )
  }
}
