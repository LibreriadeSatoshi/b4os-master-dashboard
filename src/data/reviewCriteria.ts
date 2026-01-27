// Review criteria definitions for guided code review system

export interface ReviewCriterion {
  id: string
  category: 'code_quality' | 'functionality' | 'documentation'
  name: string
  description: string
  weight: number // Weight for final score calculation
}

export interface CriterionEvaluation {
  criterionId: string
  score: number // 1-5 scale
  notes?: string
}

// Criteria definitions - can be extended or modified
export const REVIEW_CRITERIA: ReviewCriterion[] = [
  // Code Quality
  {
    id: 'readability',
    category: 'code_quality',
    name: 'Legibilidad',
    description: 'Nombres claros, formato consistente, código fácil de leer',
    weight: 1
  },
  {
    id: 'organization',
    category: 'code_quality',
    name: 'Organización',
    description: 'Estructura lógica, modularidad, separación de responsabilidades',
    weight: 1
  },

  // Functionality
  {
    id: 'correctness',
    category: 'functionality',
    name: 'Correctitud',
    description: 'El código funciona correctamente y cumple los requisitos',
    weight: 2
  },
  {
    id: 'error_handling',
    category: 'functionality',
    name: 'Manejo de Errores',
    description: 'Manejo apropiado de casos de error y excepciones',
    weight: 1
  },

  // Documentation
  {
    id: 'comments',
    category: 'documentation',
    name: 'Comentarios',
    description: 'Código comentado donde es necesario, comentarios útiles',
    weight: 0.5
  },
  {
    id: 'readme',
    category: 'documentation',
    name: 'README',
    description: 'Documentación clara del proyecto y cómo ejecutarlo',
    weight: 0.5
  }
]

// Group criteria by category
export const CRITERIA_BY_CATEGORY = REVIEW_CRITERIA.reduce((acc, criterion) => {
  if (!acc[criterion.category]) {
    acc[criterion.category] = []
  }
  acc[criterion.category].push(criterion)
  return acc
}, {} as Record<string, ReviewCriterion[]>)

// Category display names
export const CATEGORY_NAMES: Record<string, string> = {
  code_quality: 'Calidad de Código',
  functionality: 'Funcionalidad',
  documentation: 'Documentación'
}

// Score labels
export const SCORE_LABELS: Record<number, string> = {
  1: 'Deficiente',
  2: 'Necesita Mejora',
  3: 'Aceptable',
  4: 'Bueno',
  5: 'Excelente'
}

// Calculate weighted score from evaluations
export function calculateWeightedScore(evaluations: CriterionEvaluation[]): number {
  if (evaluations.length === 0) return 0

  let totalWeight = 0
  let weightedSum = 0

  for (const evaluation of evaluations) {
    const criterion = REVIEW_CRITERIA.find(c => c.id === evaluation.criterionId)
    if (criterion) {
      weightedSum += evaluation.score * criterion.weight
      totalWeight += criterion.weight
    }
  }

  if (totalWeight === 0) return 0

  // Convert from 1-5 scale to 1-10 scale
  const avgScore = weightedSum / totalWeight
  return Math.round((avgScore * 2) * 10) / 10
}

// Check if all criteria are evaluated
export function isReviewComplete(evaluations: CriterionEvaluation[]): boolean {
  const evaluatedIds = new Set(evaluations.map(e => e.criterionId))
  return REVIEW_CRITERIA.every(c => evaluatedIds.has(c.id))
}

// Get evaluation progress
export function getEvaluationProgress(evaluations: CriterionEvaluation[]): {
  completed: number
  total: number
  progress: number
} {
  const completed = evaluations.length
  const total = REVIEW_CRITERIA.length
  return {
    completed,
    total,
    progress: Math.round((completed / total) * 100)
  }
}
