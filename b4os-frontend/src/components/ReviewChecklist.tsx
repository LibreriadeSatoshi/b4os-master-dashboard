"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import {
  CRITERIA_BY_CATEGORY,
  CATEGORY_NAMES,
  SCORE_LABELS,
  type CriterionEvaluation,
  type ReviewCriterion,
  calculateWeightedScore,
  getEvaluationProgress,
  isReviewComplete
} from "@/data/reviewCriteria";

interface ReviewChecklistProps {
  evaluations: CriterionEvaluation[];
  onEvaluationChange: (evaluation: CriterionEvaluation) => void;
  onComplete: () => void;
  disabled?: boolean;
}

export default function ReviewChecklist({
  evaluations,
  onEvaluationChange,
  onComplete,
  disabled = false
}: ReviewChecklistProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(CRITERIA_BY_CATEGORY))
  );

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getEvaluationForCriterion = (criterionId: string): CriterionEvaluation | undefined => {
    return evaluations.find(e => e.criterionId === criterionId);
  };

  const handleScoreClick = (criterionId: string, score: number) => {
    if (disabled) return;
    onEvaluationChange({ criterionId, score });
  };

  const progress = getEvaluationProgress(evaluations);
  const canComplete = isReviewComplete(evaluations);
  const currentScore = calculateWeightedScore(evaluations);

  const getCategoryProgress = (category: string): { evaluated: number; total: number } => {
    const criteria = CRITERIA_BY_CATEGORY[category] || [];
    const evaluated = criteria.filter(c =>
      evaluations.some(e => e.criterionId === c.id)
    ).length;
    return { evaluated, total: criteria.length };
  };

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            Progreso de Evaluación
          </span>
          <span className="text-sm text-gray-500">
            {progress.completed}/{progress.total} criterios
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress Bar */}
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-600">
            {progress.percentage}%
          </span>
        </div>
      </div>

      {/* Criteria Categories */}
      <div className="space-y-3">
        {Object.entries(CRITERIA_BY_CATEGORY).map(([category, criteria]) => {
          const isExpanded = expandedCategories.has(category);
          const categoryProgress = getCategoryProgress(category);
          const allEvaluated = categoryProgress.evaluated === categoryProgress.total;

          return (
            <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  <span className="font-medium text-gray-900">
                    {CATEGORY_NAMES[category] || category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    allEvaluated
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {categoryProgress.evaluated}/{categoryProgress.total}
                  </span>
                  {allEvaluated && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                </div>
              </button>

              {/* Criteria List */}
              {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {criteria.map((criterion) => (
                    <CriterionRow
                      key={criterion.id}
                      criterion={criterion}
                      evaluation={getEvaluationForCriterion(criterion.id)}
                      onScoreClick={(score) => handleScoreClick(criterion.id, score)}
                      disabled={disabled}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Score Summary & Complete Button */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm text-gray-500">Score Parcial</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {currentScore > 0 ? currentScore.toFixed(1) : '—'}
              </span>
              <span className="text-gray-400">/10</span>
            </div>
          </div>
          {progress.completed > 0 && (
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <div
                  key={num}
                  className={`w-2.5 h-2.5 rounded-full ${
                    num <= Math.round(currentScore)
                      ? num <= 6
                        ? 'bg-red-400'
                        : num <= 8
                        ? 'bg-yellow-400'
                        : 'bg-green-400'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onComplete}
          disabled={!canComplete || disabled}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            canComplete && !disabled
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {canComplete ? 'Completar Revisión' : `Evalúa ${progress.total - progress.completed} criterios más`}
        </button>
      </div>
    </div>
  );
}

// Individual Criterion Row Component
function CriterionRow({
  criterion,
  evaluation,
  onScoreClick,
  disabled
}: {
  criterion: ReviewCriterion;
  evaluation?: CriterionEvaluation;
  onScoreClick: (score: number) => void;
  disabled: boolean;
}) {
  const [isHovering, setIsHovering] = useState<number | null>(null);

  return (
    <div className="p-3 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {evaluation ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          ) : (
            <Circle className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <p className={`font-medium ${evaluation ? 'text-gray-900' : 'text-gray-600'}`}>
              {criterion.name}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {criterion.description}
            </p>
          </div>
        </div>

        {/* Score Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {[1, 2, 3, 4, 5].map((score) => {
            const isSelected = evaluation?.score === score;
            const isHovered = isHovering === score;
            const showLabel = isHovered || isSelected;

            return (
              <button
                key={score}
                onClick={() => onScoreClick(score)}
                onMouseEnter={() => setIsHovering(score)}
                onMouseLeave={() => setIsHovering(null)}
                disabled={disabled}
                className={`relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  isSelected
                    ? score <= 2
                      ? 'bg-red-500 text-white'
                      : score <= 3
                      ? 'bg-yellow-500 text-white'
                      : 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                title={SCORE_LABELS[score]}
              >
                {score}
                {showLabel && !disabled && (
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
                    {SCORE_LABELS[score]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
