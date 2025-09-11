interface GitHubRepository {
  owner: string
  name: string
}

interface GitHubReadmeResponse {
  content: string
  encoding: string
  download_url: string
  html_url: string
}

interface GitHubContent {
  readme: string
  htmlUrl: string
  lastModified?: string
}

class GitHubAPIService {
  private baseUrl = 'https://api.github.com'
  
  constructor(private accessToken?: string) {}

  private getHeaders() {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'B4OS-Challenges-Platform'
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    return headers
  }

  // Parse GitHub repository URL or return owner/name
  private parseRepository(repoUrl: string): GitHubRepository {
    // Handle various formats:
    // - https://github.com/owner/repo
    // - owner/repo
    // - https://github.com/owner/repo.git
    
    if (repoUrl.includes('github.com')) {
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/)
      if (match) {
        return { owner: match[1], name: match[2] }
      }
    } else if (repoUrl.includes('/')) {
      const [owner, name] = repoUrl.split('/')
      return { owner, name }
    }
    
    throw new Error(`Invalid repository format: ${repoUrl}`)
  }

  // Fetch README content from a repository
  async fetchReadme(repoUrl: string): Promise<GitHubContent | null> {
    try {
      const { owner, name } = this.parseRepository(repoUrl)
      
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${name}/readme`, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        console.error(`GitHub API error: ${response.status} ${response.statusText}`)
        return null
      }

      const data: GitHubReadmeResponse = await response.json()
      
      // Decode base64 content
      const content = data.encoding === 'base64' 
        ? atob(data.content.replace(/\n/g, ''))
        : data.content

      return {
        readme: content,
        htmlUrl: data.html_url,
        lastModified: response.headers.get('last-modified') || undefined
      }
    } catch (error) {
      console.error('Error fetching README:', error)
      return null
    }
  }

  // Generate GitHub Classroom invite link
  generateClassroomInvite(assignmentSlug: string): string {
    return `https://classroom.github.com/a/${assignmentSlug}`
  }

  // Fetch repository information
  async fetchRepositoryInfo(repoUrl: string): Promise<any> {
    try {
      const { owner, name } = this.parseRepository(repoUrl)
      
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${name}`, {
        headers: this.getHeaders()
      })

      if (!response.ok) {
        console.error(`GitHub API error: ${response.status} ${response.statusText}`)
        return null
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching repository info:', error)
      return null
    }
  }

  // Check if user has access to repository
  async checkRepositoryAccess(repoUrl: string): Promise<boolean> {
    try {
      const { owner, name } = this.parseRepository(repoUrl)
      
      const response = await fetch(`${this.baseUrl}/repos/${owner}/${name}`, {
        headers: this.getHeaders()
      })

      return response.ok
    } catch (error) {
      console.error('Error checking repository access:', error)
      return false
    }
  }

  // Generate student repository URL based on assignment pattern
  generateStudentRepoUrl(assignmentBaseName: string, githubUsername: string): string {
    return `https://github.com/B4OS-Dev/${assignmentBaseName}-${githubUsername}`
  }

  // Check if student has already accepted and has their own repository
  async checkStudentRepository(assignmentBaseName: string, githubUsername: string): Promise<{
    exists: boolean
    url: string
    hasAccess: boolean
  }> {
    const studentRepoUrl = this.generateStudentRepoUrl(assignmentBaseName, githubUsername)
    
    try {
      const hasAccess = await this.checkRepositoryAccess(studentRepoUrl)
      
      return {
        exists: hasAccess,
        url: studentRepoUrl,
        hasAccess
      }
    } catch (error) {
      console.error('Error checking student repository:', error)
      return {
        exists: false,
        url: studentRepoUrl,
        hasAccess: false
      }
    }
  }
}

// Export singleton with no token (for public repos)
export const githubAPI = new GitHubAPIService()

// Export factory for authenticated requests
export const createGitHubAPI = (accessToken: string) => 
  new GitHubAPIService(accessToken)

export type { GitHubRepository, GitHubContent }