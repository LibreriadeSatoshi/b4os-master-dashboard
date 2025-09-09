'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getChallengeById } from '@/lib/challenges'
import CodeEditor from '@/components/CodeEditor'
import StorySection from '@/components/StorySection'
import UserProfile from '@/components/UserProfile'
import ProtectedRoute from '@/components/ProtectedRoute'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeIcon, ArrowLeftIcon, HomeIcon, BeakerIcon, ClockIcon, CrownIcon, CheckCircleIcon } from 'lucide-react'
import { Challenge, ValidationResult } from '@/types/challenge'
import Image from 'next/image'

interface ChallengePageProps {
  params: Promise<{
    id: string
  }>
}

export default function ChallengePage({ params }: ChallengePageProps) {
  const resolvedParams = use(params)
  const challenge = getChallengeById(resolvedParams.id)
  const [userCode, setUserCode] = useState('')
  const [completedChallenge, setCompletedChallenge] = useState(false)
  const [showStoryConclusion, setShowStoryConclusion] = useState(false)

  if (!challenge) {
    notFound()
  }

  const handleValidation = async (code: string) => {
    const result = await challenge.validator.validate(code, null)
    if (result.success) {
      setCompletedChallenge(true)
      setShowStoryConclusion(true)
    }
    return result
  }

  return (
    <ProtectedRoute>
      <ChallengePageContent 
        challenge={challenge}
        userCode={userCode}
        completedChallenge={completedChallenge}
        showStoryConclusion={showStoryConclusion}
        onCodeChange={setUserCode}
        onValidation={handleValidation}
        onStoryConclusion={setShowStoryConclusion}
      />
    </ProtectedRoute>
  )
}

function ChallengePageContent({ 
  challenge, 
  completedChallenge, 
  showStoryConclusion, 
  onCodeChange, 
  onStoryConclusion 
}: {
  challenge: Challenge
  userCode: string
  completedChallenge: boolean
  showStoryConclusion: boolean
  onCodeChange: (code: string) => void
  onValidation: (code: string) => Promise<ValidationResult>
  onStoryConclusion: (show: boolean) => void
}) {
  const handleCodeChange = (code: string) => {
    onCodeChange(code)
  }

  const handleValidation = async (code: string) => {
    const result = await challenge.validator.validate(code, null)
    if (result.success) {
      onStoryConclusion(true)
    }
    return result
  }

  // const handleStoryConclusion = () => {
  //   onStoryConclusion(false)
  // }

  const difficultyColors: Record<string, string> = {
    beginner: 'bg-green-100 text-green-800 border-green-200',
    intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    advanced: 'bg-red-100 text-red-800 border-red-200',
  }

  const categoryColors: Record<string, string> = {
    'bitcoin-basics': 'bg-orange-100 text-orange-800',
    'transactions': 'bg-blue-100 text-blue-800',
    'lightning-network': 'bg-purple-100 text-purple-800',
    'scripting': 'bg-green-100 text-green-800',
    'cryptography': 'bg-red-100 text-red-800',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/challenges" className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center shadow-sm border border-gray-200">
                <Image 
                  src="/web-app-manifest-192x192.png" 
                  alt="B4OS Logo" 
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">B4OS Challenges</h1>
              </div>
            </Link>
            <div className="flex items-center gap-6">
              <nav className="flex gap-6">
                <Link href="/" className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors">
                  <HomeIcon className="w-4 h-4" />
                  Home
                </Link>
                <Link href="/challenges" className="flex items-center gap-1 text-orange-500 font-medium">
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back to Challenges
                </Link>
              </nav>
              <UserProfile />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Story Introduction */}
        {challenge.story && (
          <StorySection 
            story={challenge.story} 
            phase="introduction" 
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar: Challenge Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Challenge Header */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-lg font-bold text-gray-900 mb-1">
                    {challenge.metadata.title}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {challenge.metadata.description}
                  </p>
                </div>
                {completedChallenge && (
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <CheckCircleIcon className="w-3 h-3" />
                    Completed
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`px-2 py-1 rounded text-xs font-medium border ${difficultyColors[challenge.metadata.difficulty]}`}>
                  {challenge.metadata.difficulty}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${categoryColors[challenge.metadata.category]}`}>
                  {challenge.metadata.category.replace('-', ' ')}
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  {challenge.metadata.estimatedTime} min
                </span>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium flex items-center gap-1">
                  <CrownIcon className="w-3 h-3" />
                  {challenge.metadata.points} pts
                </span>
              </div>

              {challenge.metadata.prerequisites && challenge.metadata.prerequisites.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500 mb-2">Prerequisites:</p>
                  <div className="flex flex-wrap gap-1">
                    {challenge.metadata.prerequisites.map((prereq: string) => (
                      <span key={prereq} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                        {prereq}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Challenge Description */}
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 overflow-hidden">
              <div className="prose prose-sm max-w-none challenge-content prose-gray prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-code:text-gray-900">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="break-words text-gray-800 leading-relaxed">{children}</p>,
                    h1: ({ children }) => <h1 className="text-2xl font-bold text-gray-900 mb-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold text-gray-900 mb-3 mt-6">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">{children}</h3>,
                    code: ({ children }) => <code className="break-words bg-gray-100 text-gray-900 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                    pre: ({ children }) => <pre className="break-words bg-gray-900 text-gray-100 p-4 rounded-lg whitespace-pre-wrap overflow-wrap-anywhere">{children}</pre>,
                    ul: ({ children }) => <ul className="list-disc list-inside text-gray-800 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside text-gray-800 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-gray-800">{children}</li>
                  }}
                >
                  {challenge.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Resources */}
            {challenge.resources && challenge.resources.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Helpful Resources
                </h3>
                <div className="space-y-2">
                  {challenge.resources.map((resource: { title: string; url: string; type: string }, index: number) => (
                    <a
                      key={index}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <span className="text-gray-400">
                        {resource.type === 'documentation' && '📖'}
                        {resource.type === 'article' && '📄'}
                        {resource.type === 'video' && '🎥'}
                        {resource.type === 'tool' && '🔧'}
                      </span>
                      {resource.title}
                      <span className="text-gray-400">↗</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Main Code Editor - PROTAGONISTA */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-orange-200 hover:border-orange-300 transition-colors">
              <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <CodeIcon className="w-6 h-6 text-orange-500" />
                      Code Editor
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Your workspace - this is where the magic happens!
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-orange-600 font-semibold">
                      {challenge.validator.language.toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Ready to code
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <CodeEditor
                    initialCode={challenge.initialCode || '// Write your solution here'}
                    language={challenge.validator.language}
                    onCodeChange={handleCodeChange}
                    onValidate={handleValidation}
                    className="min-h-[400px]"
                  />
                </div>

                {/* Test Cases Info - Enhanced */}
                {challenge.validator.testCases.length > 0 && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <BeakerIcon className="w-4 h-4" />
                      Test Cases - Your code will be evaluated against these cases
                      <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                        {challenge.validator.testCases.length} tests
                      </span>
                    </h4>
                    <div className="grid gap-2">
                      {challenge.validator.testCases.slice(0, 3).map((testCase: { name: string; input: unknown; expectedOutput: unknown }, index: number) => (
                        <div key={index} className="bg-white p-3 rounded border border-blue-100">
                          <div className="font-medium text-blue-800 text-sm mb-1">
                            📋 {testCase.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            Input: 
                            <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded">
                              {typeof testCase.input === 'string' 
                                ? `"${testCase.input}"` 
                                : JSON.stringify(testCase.input)
                              }
                            </span>
                          </div>
                        </div>
                      ))}
                      {challenge.validator.testCases.length > 3 && (
                        <div className="text-sm text-blue-700 mt-2 text-center p-2 bg-blue-100 rounded flex items-center justify-center gap-1">
                          <BeakerIcon className="w-4 h-4" />
                          +{challenge.validator.testCases.length - 3} additional test cases will run when you validate your code
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Story Conclusion */}
        {challenge.story && showStoryConclusion && (
          <div className="mt-8">
            <StorySection 
              story={challenge.story} 
              phase="conclusion" 
              onComplete={() => {
                // Here you could navigate to next challenge or show completion screen
                console.log('Challenge story completed!')
              }}
            />
          </div>
        )}
        </div>
      </div>
  )
}