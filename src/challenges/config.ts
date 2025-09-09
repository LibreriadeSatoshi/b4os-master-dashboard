export const challengeCategories = [
  'bitcoin-basics',
  'transactions', 
  'lightning-network',
  'scripting',
  'cryptography'
] as const

export const challengeDifficulties = [
  'beginner',
  'intermediate', 
  'advanced'
] as const

export const categoryInfo = {
  'bitcoin-basics': {
    name: 'Bitcoin Basics',
    description: 'Fundamental concepts and operations',
    color: 'orange',
    icon: '₿'
  },
  'transactions': {
    name: 'Transactions',
    description: 'Creating and managing Bitcoin transactions',
    color: 'blue',
    icon: '↔️'
  },
  'lightning-network': {
    name: 'Lightning Network',
    description: 'Layer 2 payment channels and routing',
    color: 'purple',
    icon: '⚡'
  },
  'scripting': {
    name: 'Scripting',
    description: 'Bitcoin script and smart contracts',
    color: 'green',
    icon: '📜'
  },
  'cryptography': {
    name: 'Cryptography',
    description: 'Cryptographic primitives and security',
    color: 'red',
    icon: '🔐'
  }
} as const

export const difficultyInfo = {
  'beginner': {
    name: 'Beginner',
    description: 'Perfect for newcomers to Bitcoin development',
    color: 'green',
    estimatedTime: '15-30 min'
  },
  'intermediate': {
    name: 'Intermediate', 
    description: 'Requires some Bitcoin knowledge',
    color: 'yellow',
    estimatedTime: '30-60 min'
  },
  'advanced': {
    name: 'Advanced',
    description: 'For experienced Bitcoin developers',
    color: 'red',
    estimatedTime: '60+ min'
  }
} as const
