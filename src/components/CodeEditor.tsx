'use client'

import { useState } from 'react'
import Editor from '@monaco-editor/react'
import { ValidationResult } from '@/types/challenge'
import clsx from 'clsx'

interface CodeEditorProps {
  initialCode: string
  language: string
  onCodeChange: (code: string) => void
  onValidate: (code: string, output?: unknown) => Promise<ValidationResult>
  className?: string
}

export default function CodeEditor({
  initialCode,
  language,
  onCodeChange,
  onValidate,
  className
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const handleCodeChange = (value: string | undefined) => {
    const newCode = value || ''
    setCode(newCode)
    onCodeChange(newCode)
  }

  const handleValidate = async () => {
    if (!code.trim()) {
      setValidationResult({
        success: false,
        message: 'Please write some code first!'
      })
      return
    }

    setIsValidating(true)
    try {
      // Execute the code to get output
      let output = null
      try {
        // Create a safe evaluation context
        // In a production environment, you'd want to use a sandboxed environment
        const func = new Function('require', 'console', code + '; return typeof hashMessage !== "undefined" ? hashMessage("Hello Bitcoin") : null')
        const mockConsole = {
          log: (val: unknown) => output = val
        }
        const mockRequire = (module: string) => {
          if (module === 'crypto') {
            // For client-side, we'll use a mock crypto implementation
            return {
              createHash: () => ({
                update: () => ({
                  digest: () => 'mock-hash'
                })
              })
            }
          }
          throw new Error(`Module ${module} not available`)
        }
        
        output = func(mockRequire, mockConsole)
      } catch (execError) {
        console.error('Code execution error:', execError)
      }

      const result = await onValidate(code, output)
      setValidationResult(result)
    } catch (error) {
      setValidationResult({
        success: false,
        message: `Validation error: ${error}`,
        errors: [error?.toString() || 'Unknown validation error']
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleReset = () => {
    setCode(initialCode)
    onCodeChange(initialCode)
    setValidationResult(null)
  }

  return (
    <div className={clsx('border rounded-lg overflow-hidden bg-white', className)}>
      {/* Editor Header */}
      <div className="bg-gray-100 px-4 py-2 border-b flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          Code Editor ({language})
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="text-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleValidate}
            disabled={isValidating}
            className={clsx(
              'text-sm px-3 py-1 rounded transition-colors',
              isValidating 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            )}
          >
            {isValidating ? 'Validating...' : 'Test Code'}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="h-64">
        <Editor
          value={code}
          onChange={handleCodeChange}
          language={language}
          theme="vs"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>

      {/* Validation Result */}
      {validationResult && (
        <div className={clsx(
          'p-4 border-t',
          validationResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        )}>
          <div className="flex items-start gap-2">
            <div className={clsx(
              'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5',
              validationResult.success ? 'bg-green-500' : 'bg-red-500'
            )}>
              {validationResult.success ? '✓' : '✗'}
            </div>
            <div className="flex-1">
              <p className={clsx(
                'font-medium',
                validationResult.success ? 'text-green-800' : 'text-red-800'
              )}>
                {validationResult.message}
              </p>
              
              {validationResult.passedTests !== undefined && validationResult.totalTests && (
                <p className="text-sm text-gray-600 mt-1">
                  Tests passed: {validationResult.passedTests}/{validationResult.totalTests}
                </p>
              )}

              {validationResult.errors && validationResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-700">Errors:</p>
                  <ul className="text-sm text-red-600 list-disc list-inside">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}