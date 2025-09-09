'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { allChallenges } from '@/lib/challenges'

export default function StartPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const steps = [
    {
      title: "Bienvenido al Futuro Bitcoin",
      content: "El año es 2025. Bitcoin ha evolucionado más allá de lo que Satoshi podría haber imaginado. El ecosistema necesita desarrolladores que dominen tanto la capa base como Lightning Network.",
      character: "🏢",
      action: "Continuar"
    },
    {
      title: "El Programa B4OS",  
      content: "B4OS 2025 es el programa más selectivo para desarrolladores Bitcoin. Solo los mejores pasan las pruebas técnicas. Tu aventura comienza en nuestro laboratorio virtual de última generación.",
      character: "🔬",
      action: "Explorar Laboratorio"
    },
    {
      title: "Tu Mentor Te Espera",
      content: "Dr. Hash, nuestro especialista en criptografía, ya tiene preparados los primeros desafíos. Lightning Lily aguarda en el área de Layer 2. El tiempo es limitado... ¿estás listo?",
      character: "👨‍🔬",
      action: "Comenzar Aventura"
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const currentStepData = steps[currentStep]
  const progressPercentage = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-32 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      {/* Bitcoin Network Animation */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-orange-400 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 transform ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
        }`}>
          
          {/* Progress Bar */}
          <div className="mb-12">
            <div className="bg-white/10 h-2 rounded-full mb-4 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-white/60 text-sm">
              Paso {currentStep + 1} de {steps.length}
            </p>
          </div>

          {/* Character Avatar */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-6xl mb-6 transform transition-transform duration-500 hover:scale-110 shadow-2xl">
              {currentStepData.character}
            </div>
          </div>

          {/* Content */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight">
              {currentStepData.title}
            </h1>
            <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              {currentStepData.content}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-3xl font-bold text-orange-400 mb-2">{allChallenges.length}</div>
              <div className="text-white/70">Desafíos Técnicos</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-3xl font-bold text-blue-400 mb-2">10+</div>
              <div className="text-white/70">Conceptos Bitcoin</div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-3xl font-bold text-purple-400 mb-2">∞</div>
              <div className="text-white/70">Oportunidades</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                {currentStepData.action} →
              </button>
            ) : (
              <>
                <Link
                  href="/challenges"
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  🚀 {currentStepData.action}
                </Link>
                <Link
                  href="/"
                  className="bg-white/10 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/20 transition-all duration-300 backdrop-blur-sm border border-white/20"
                >
                  ← Volver a Inicio
                </Link>
              </>
            )}
          </div>

          {/* Skip Option */}
          {currentStep < steps.length - 1 && (
            <div className="mt-8">
              <Link
                href="/challenges"
                className="text-white/50 hover:text-white/80 text-sm transition-colors"
              >
                Saltar introducción
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="flex items-center justify-between text-white/40 text-sm">
          <div>B4OS Challenges 2025</div>
          <div>Powered by Bitcoin ⚡</div>
        </div>
      </div>
    </div>
  )
}