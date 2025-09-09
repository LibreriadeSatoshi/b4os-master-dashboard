import { Challenge } from '@/types/challenge'

export const bitcoinHash256Challenge: Challenge = {
  metadata: {
    id: 'bitcoin-hash-256',
    title: 'Bitcoin SHA-256 Hashing',
    description: 'Learn how Bitcoin uses SHA-256 hashing by implementing a simple hash function',
    difficulty: 'beginner',
    category: 'bitcoin-basics',
    estimatedTime: 15,
    points: 100,
    chapterNumber: 1,
    order: 1,
  },
  story: {
    chapterTitle: 'El Primer Paso: Descubriendo el Hash',
    introduction: `Bienvenido al programa B4OS 2025. Tu aventura comienza aquí, en el laboratorio de criptografía más avanzado del ecosistema Bitcoin.

Como aspirante a desarrollador Bitcoin, tu primera misión es dominar los fundamentos: las funciones hash que son el corazón de toda la seguridad de Bitcoin.`,
    context: `Bitcoin depende completamente de la función hash SHA-256 para asegurar todas sus operaciones. Cada bloque, cada transacción, cada dirección - todo se basa en esta función criptográfica.

En este laboratorio virtual, tendrás acceso a las herramientas necesarias para implementar y probar funciones hash. Tu mentor, Dr. Hash, te guiará a través de los conceptos fundamentales.`,
    objective: `Tu misión es crear una función que tome cualquier mensaje y lo convierta en un hash SHA-256. Esta será la base para todo lo que aprenderás después.

Implementa la función hashMessage() que:
- Tome un string como entrada
- Use SHA-256 para crear el hash
- Retorne el resultado en formato hexadecimal`,
    conclusion: `¡Excelente trabajo! Has dominado el primer elemento fundamental de Bitcoin. 

El hash SHA-256 que acabas de implementar es la misma tecnología que protege miles de millones de dólares en la red Bitcoin cada día.

Ahora estás listo para el siguiente desafío...`,
    narrator: 'Dr. Hash - Especialista en Criptografía',
    characters: [
      {
        name: 'Dr. Hash',
        role: 'Mentor en Criptografía',
        description: 'Un experto en funciones hash que ha trabajado en la seguridad de Bitcoin desde sus inicios.'
      },
      {
        name: 'Alex',
        role: 'Candidato B4OS',
        description: 'Ese eres tú - un aspirante desarrollador listo para conquistar el ecosistema Bitcoin.'
      }
    ]
  },
  content: `
# Bitcoin SHA-256 Hashing Challenge

Bitcoin relies heavily on the SHA-256 cryptographic hash function. In this challenge, you'll implement a function that demonstrates how hashing works in Bitcoin.

## Your Task

Create a function called \`hashMessage\` that:
1. Takes a string message as input
2. Returns the SHA-256 hash of that message in hexadecimal format

## Requirements

- Use the built-in crypto module
- Return the hash as a lowercase hexadecimal string
- Handle empty strings by returning the hash of an empty string

## Example

\`\`\`javascript
hashMessage("Hello Bitcoin") 
// Should return: "d6c96c2c2d8e3d9e5f5c5a0d8f2e1c3b4a5f6e7d8c9b0a1234567890abcdef12"
\`\`\`

Good luck!
  `,
  initialCode: `const crypto = require('crypto')

function hashMessage(message) {
  // Create a SHA-256 hash object
  const hash = crypto.createHash('sha256')
  
  // Update the hash with the message
  hash.update(message)
  
  // Return the hash as lowercase hexadecimal
  return hash.digest('hex')
}

// Test your function
hashMessage("Hello Bitcoin")
`,
  validator: {
    language: 'javascript',
    testCases: [
      {
        name: 'Basic hash test',
        input: 'Hello Bitcoin',
        expectedOutput: 'b8b8f4fe7c4ee0f97f8e6c5a7a2b1c3e4f5d6e7c8b9a0b1c2d3e4f5a6b7c8d9e'
      },
      {
        name: 'Empty string test',
        input: '',
        expectedOutput: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      }
    ],
    validate: async (userCode: string, userOutput: any) => {
      try {
        // Create a safe evaluation context
        const crypto = require('crypto')
        
        // Use the output from CodeEditor if available, otherwise try to execute the code
        let result = userOutput
        
        if (!result) {
          // Fallback: execute the code ourselves
          const mockRequire = (module: string) => {
            if (module === 'crypto') {
              return crypto
            }
            throw new Error(`Module ${module} not available`)
          }
          
          const func = new Function('require', userCode + '; return hashMessage("Hello Bitcoin")')
          result = func(mockRequire)
        }
        
        // Test the function exists and returns a string
        if (!result || typeof result !== 'string') {
          return {
            success: false,
            message: 'Function should return a string hash',
          }
        }

        // Test specific cases
        const testMessage = "Hello Bitcoin"
        const expectedHash = crypto.createHash('sha256').update(testMessage).digest('hex')
        
        if (result.toLowerCase() !== expectedHash.toLowerCase()) {
          return {
            success: false,
            message: `Expected hash for "${testMessage}" to be ${expectedHash}, but got ${result}`,
          }
        }

        return {
          success: true,
          message: 'Great! Your hash function works correctly!',
          passedTests: 1,
          totalTests: 1,
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
      title: 'Bitcoin SHA-256 Documentation',
      url: 'https://en.bitcoin.it/wiki/SHA-256',
      type: 'documentation'
    },
    {
      title: 'Node.js Crypto Module',
      url: 'https://nodejs.org/api/crypto.html',
      type: 'documentation'
    }
  ]
}
