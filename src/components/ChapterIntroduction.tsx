'use client'

import { ChapterStory } from '@/types/challenge'
import { useState } from 'react'

interface ChapterIntroductionProps {
  story: ChapterStory
  chapterNumber: number
  onStart: () => void
}

export default function ChapterIntroduction({ story, chapterNumber, onStart }: ChapterIntroductionProps) {
  const [currentStep, setCurrentStep] = useState<'intro' | 'context' | 'ready'>('intro')

  const renderIntroStep = () => (
    <div className="text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white text-2xl font-bold mb-4 shadow-lg">
          {chapterNumber}
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          {story.chapterTitle}
        </h1>
      </div>

      <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200 mb-8 max-w-2xl mx-auto">
        <div className="prose prose-lg max-w-none">
          {story.introduction.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4 text-gray-700 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <button
        onClick={() => setCurrentStep('context')}
        className="bg-orange-500 text-white px-8 py-3 rounded-lg hover:bg-orange-600 transition-colors font-semibold shadow-md"
      >
        Continuar →
      </button>
    </div>
  )

  const renderContextStep = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Contexto de la Misión
        </h2>
        <p className="text-gray-600">
          Comprende el desafío que te espera
        </p>
      </div>

      <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200 mb-8">
        <div className="prose prose-lg max-w-none">
          {story.context.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-4 text-gray-700 leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {story.characters && story.characters.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">👥</span>
            Conoce a tu equipo
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {story.characters.map((character, index) => (
              <div key={index} className="bg-white rounded-md p-4 border border-blue-100">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-bold">
                      {character.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{character.name}</h4>
                    <p className="text-blue-600 text-sm font-medium">{character.role}</p>
                    <p className="text-gray-600 text-sm mt-1">{character.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">🎯</span>
          Tu Objetivo
        </h3>
        <div className="prose max-w-none">
          {story.objective.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-3 text-gray-700">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={() => setCurrentStep('ready')}
          className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors font-semibold shadow-md"
        >
          Entiendo la Misión →
        </button>
      </div>
    </div>
  )

  const renderReadyStep = () => (
    <div className="text-center max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white text-3xl mb-4 shadow-lg">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          ¡Listo para Comenzar!
        </h2>
      </div>

      <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200 mb-8">
        <p className="text-lg text-gray-700 mb-4">
          Has revisado toda la información necesaria para este capítulo.
        </p>
        <p className="text-gray-600">
          Ahora puedes proceder a resolver los challenges y avanzar en tu aventura 
          por el ecosistema Bitcoin.
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={onStart}
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-colors font-bold text-lg shadow-lg"
        >
          🚀 Comenzar Challenges
        </button>
        <button
          onClick={() => setCurrentStep('context')}
          className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
        >
          ← Revisar información nuevamente
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 py-12 px-4">
      <div className="container mx-auto">
        {currentStep === 'intro' && renderIntroStep()}
        {currentStep === 'context' && renderContextStep()}
        {currentStep === 'ready' && renderReadyStep()}
      </div>
    </div>
  )
}