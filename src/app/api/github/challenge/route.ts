import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createGitHubAPI } from '@/lib/github-api'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.accessToken) {
      return NextResponse.json({
        error: 'Authentication required',
        authenticated: false
      }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const templateRepo = searchParams.get('templateRepo')
    const assignmentSlug = searchParams.get('assignmentSlug')
    const assignmentBaseName = searchParams.get('assignmentBaseName') || 'ejercicios-de-prueba'
    
    if (!templateRepo || !assignmentSlug) {
      return NextResponse.json({
        error: 'Missing required parameters: templateRepo and assignmentSlug'
      }, { status: 400 })
    }

    // Create authenticated GitHub API service
    const githubAPI = createGitHubAPI(session.accessToken as string)
    
    // Get user's GitHub username
    const githubUsername = (session.user as any)?.username
    
    // Check if student already has their own repository
    const studentRepo = githubUsername 
      ? await githubAPI.checkStudentRepository(assignmentBaseName, githubUsername)
      : { exists: false, url: '', hasAccess: false }
    
    // Fetch README content from template repository (or student repo if exists)
    const readmeSource = studentRepo.exists ? studentRepo.url : templateRepo
    const readmeContent = await githubAPI.fetchReadme(readmeSource)
    
    // Generate invite link
    const inviteLink = githubAPI.generateClassroomInvite(assignmentSlug)
    
    // Get repository info
    const repoInfo = await githubAPI.fetchRepositoryInfo(templateRepo)
    
    return NextResponse.json({
      success: true,
      user: {
        name: session.user?.name,
        githubUsername: (session.user as any)?.username,
        githubId: (session.user as any)?.githubId
      },
      templateRepository: {
        url: templateRepo,
        info: repoInfo,
        hasAccess: !!readmeContent
      },
      content: readmeContent,
      classroom: {
        assignmentSlug,
        inviteLink
      },
      studentRepository: studentRepo
    })
  } catch (error) {
    console.error('GitHub challenge API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}