import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

    const assignments = assignmentsResult.data || []
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

    const headerRow = [
      'github_username',
      'assignment_name',
      'points_available',
      'points_awarded',
      'progress_pct',
      'fork_created_at',
      'fork_updated_at'
    ]

    const lines: string[] = [
      csvLine(['B4OS Course Status Report', '', '', '', '', '', '']),
      csvLine(['Export date', exportDate, '', '', '', '', '']),
      csvLine(['Total students', totalStudents, '', '', '', '', '']),
      csvLine(['Total assignments', totalAssignments, '', '', '', '', '']),
      csvLine(['Total grades', totalGrades, '', '', '', '', '']),
      csvLine(['Average score (points)', avgScore, '', '', '', '', '']),
      csvLine(['Completion rate (%)', completionRate, '', '', '', '', '']),
      csvLine([]),
      csvLine(headerRow)
    ]

    for (const username of allStudents) {
      for (const assignment of assignments) {
        const key = `${username}|${assignment.name}`
        const pointsAvailable = assignment.points_available ?? 0
        const grade = gradesByKey.get(key)
        const pointsAwarded = grade?.points_awarded ?? 0
        const progressPct = pointsAvailable > 0
          ? Math.round((Number(pointsAwarded) / pointsAvailable) * 100)
          : 0
        const forkCreated = grade?.fork_created_at ?? ''
        const forkUpdated = grade?.fork_updated_at ?? ''

        lines.push(
          csvLine([
            username,
            assignment.name,
            pointsAwarded,
            pointsAvailable,
            progressPct,
            forkCreated,
            forkUpdated
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
