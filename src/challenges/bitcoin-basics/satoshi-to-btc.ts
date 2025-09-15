import { Challenge } from '@/types/challenge'

export const satoshiToBtc: Challenge = {
  metadata: {
    id: 'satoshi-to-btc',
    title: 'Satoshi to BTC Converter',
    description: 'Learn Bitcoin unit conversions by implementing a satoshi to BTC converter',
    difficulty: 'beginner',
    category: 'bitcoin-basics',
    estimatedTime: 15,
    points: 50,
    chapterNumber: 1,
    order: 3,
    type: 'inline' // CodeEditor only - quick practice
  },
  story: {
    chapterTitle: 'El Maestro de las Unidades',
    introduction: `En el mundo Bitcoin, las unidades son fundamentales. 🪙

Dr. Hash te presenta tu primer desafío básico: convertir satoshis (la unidad más pequeña de Bitcoin) a BTC.`,
    context: `Bitcoin tiene 8 decimales de precisión:
• **1 BTC = 100,000,000 satoshis**
• **1 satoshi = 0.00000001 BTC**

Esta conversión es esencial en cualquier aplicación Bitcoin, desde wallets hasta exchanges.`,
    objective: `Implementa una función que convierta satoshis a BTC correctamente.

**Requisitos:**
1. Recibe un número de satoshis
2. Retorna el equivalente en BTC con la precisión correcta
3. Maneja números enteros y flotantes

**Ejemplos:**
- 100,000,000 satoshis = 1.0 BTC
- 50,000,000 satoshis = 0.5 BTC
- 1 satoshi = 0.00000001 BTC`,
    conclusion: `¡Excelente! Has dominado las conversiones básicas de Bitcoin.

Esta función es la base para cualquier cálculo financiero en Bitcoin. ¡Dr. Hash está orgulloso de tu progreso! 🎯`,
    narrator: 'Dr. Hash - Maestro de las Unidades Bitcoin',
    characters: [
      {
        name: 'Dr. Hash',
        role: 'Instructor de Fundamentos Bitcoin',
        description: 'Un experto que enseña los conceptos básicos de Bitcoin de forma práctica y divertida.'
      }
    ]
  },
  content: `
# 🪙 Satoshi to BTC Converter

¡Bienvenido a tu primer desafío de conversión Bitcoin! Las unidades son la base de todo.

## 🎯 Tu Desafío

Implementa la función \`satoshiToBtc\` que convierta satoshis a BTC.

### Información importante:

- **1 BTC = 100,000,000 satoshis**
- **1 satoshi = 0.00000001 BTC**

### Ejemplos:

\`\`\`javascript
satoshiToBtc(100000000) // debe retornar 1.0
satoshiToBtc(50000000)  // debe retornar 0.5
satoshiToBtc(1)         // debe retornar 0.00000001
satoshiToBtc(0)         // debe retornar 0
\`\`\`

## 💡 Consejos

- Usa división simple: satoshis / 100000000
- JavaScript maneja bien los números flotantes para este caso
- Recuerda que 1 BTC = 1e8 satoshis

¡Es más simple de lo que parece! 🚀
  `,
  initialCode: `function satoshiToBtc(satoshis) {
  // TODO: Convert satoshis to BTC
  // Remember: 1 BTC = 100,000,000 satoshis

  return 0 // Replace this with your implementation
}

// Test your function
console.log(satoshiToBtc(100000000)) // Should be 1.0
console.log(satoshiToBtc(50000000))  // Should be 0.5
console.log(satoshiToBtc(1))         // Should be 0.00000001
`,
  validator: {
    language: 'javascript',
    testCases: [
      {
        name: '1 BTC test',
        input: 100000000,
        expectedOutput: 1.0
      },
      {
        name: '0.5 BTC test',
        input: 50000000,
        expectedOutput: 0.5
      },
      {
        name: '1 satoshi test',
        input: 1,
        expectedOutput: 0.00000001
      },
      {
        name: 'Zero test',
        input: 0,
        expectedOutput: 0
      }
    ],
    validate: async (userCode: string, userOutput: unknown) => {
      try {
        // Execute user code in a safe context
        const func = new Function(userCode + '; return satoshiToBtc')
        const satoshiToBtc = func()

        if (typeof satoshiToBtc !== 'function') {
          return {
            success: false,
            message: 'Function satoshiToBtc not found or is not a function',
          }
        }

        // Test cases
        const testCases = [
          { input: 100000000, expected: 1.0, name: '1 BTC conversion' },
          { input: 50000000, expected: 0.5, name: '0.5 BTC conversion' },
          { input: 1, expected: 0.00000001, name: '1 satoshi conversion' },
          { input: 0, expected: 0, name: 'Zero satoshis' },
          { input: 25000000, expected: 0.25, name: '0.25 BTC conversion' },
          { input: 123456789, expected: 1.23456789, name: 'Decimal precision test' },
        ]

        let passedTests = 0
        const errors: string[] = []

        for (const testCase of testCases) {
          try {
            const result = satoshiToBtc(testCase.input)

            // Check if result is close enough (handle floating point precision)
            const tolerance = 1e-10
            const isCorrect = Math.abs(result - testCase.expected) < tolerance

            if (isCorrect) {
              passedTests++
            } else {
              errors.push(`${testCase.name}: Expected ${testCase.expected}, got ${result}`)
            }
          } catch (error) {
            errors.push(`${testCase.name}: Error executing function - ${error}`)
          }
        }

        const allPassed = passedTests === testCases.length

        return {
          success: allPassed,
          message: allPassed
            ? '🎉 Perfect! Your satoshi converter works flawlessly!'
            : `${passedTests}/${testCases.length} tests passed. Check the errors below.`,
          passedTests,
          totalTests: testCases.length,
          errors: errors.length > 0 ? errors : undefined,
        }
      } catch (error) {
        return {
          success: false,
          message: `Error running your code: ${error}`,
          errors: [error?.toString() || 'Unknown error'],
        }
      }
    },
  },
  resources: [
    {
      title: 'Bitcoin Units Explained',
      url: 'https://en.bitcoin.it/wiki/Units',
      type: 'documentation'
    },
    {
      title: 'Satoshi (unit)',
      url: 'https://en.bitcoin.it/wiki/Satoshi_(unit)',
      type: 'documentation'
    }
  ]
}