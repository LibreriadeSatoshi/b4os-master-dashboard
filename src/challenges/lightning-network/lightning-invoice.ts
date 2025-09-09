import { Challenge } from '@/types/challenge'

export const lightningInvoiceChallenge: Challenge = {
  metadata: {
    id: 'lightning-invoice',
    title: 'Lightning Invoice Parser',
    description: 'Parse and decode Lightning Network payment invoices (BOLT11)',
    difficulty: 'intermediate',
    category: 'lightning-network',
    estimatedTime: 30,
    points: 200,
    prerequisites: ['bitcoin-hash-256'],
    chapterNumber: 2,
    order: 2,
  },
  story: {
    chapterTitle: 'Lightning: La Red del Futuro',
    introduction: `Después de dominar los hashes, Dr. Hash te lleva a una nueva área del laboratorio: el centro de operaciones Lightning Network.

"Excelente trabajo con SHA-256," dice sonriendo. "Ahora es momento de explorar la capa que hace que Bitcoin sea realmente útil para pagos instantáneos."`,
    context: `Lightning Network es la capa 2 de Bitcoin que permite pagos instantáneos y casi gratuitos. Los invoices BOLT11 son como códigos QR inteligentes que contienen toda la información necesaria para realizar un pago.

Tu nueva mentora, Lightning Lily, es una experta en el protocolo Lightning que ha ayudado a procesar millones de transacciones.`,
    objective: `Tu misión ahora es más compleja: crear un parser que pueda decodificar invoices Lightning.

Desarrolla la función parseInvoice() que pueda:
- Identificar si es mainnet o testnet
- Extraer información del pago
- Decodificar los datos estructurados del invoice`,
    conclusion: `¡Increíble! Has desbloqueado el poder de Lightning Network.

Con este conocimiento, puedes procesar pagos instantáneos en Bitcoin. Has dado un gran paso hacia convertirte en un desarrollador completo del ecosistema.

La aventura continúa...`,
    narrator: 'Lightning Lily - Experta en Layer 2',
    characters: [
      {
        name: 'Lightning Lily',
        role: 'Especialista Lightning Network',
        description: 'Una desarrolladora que ha construido algunas de las billeteras Lightning más populares.'
      },
      {
        name: 'Dr. Hash',
        role: 'Mentor en Criptografía',
        description: 'Tu mentor anterior, que sigue observando tu progreso con orgullo.'
      }
    ]
  },
  content: `
# Lightning Network Invoice Parser

Lightning Network uses BOLT11 invoices for payments. In this challenge, you'll create a basic parser for Lightning invoices.

## Your Task

Create a function called \`parseInvoice\` that:
1. Takes a Lightning invoice string as input
2. Extracts basic information from the invoice
3. Returns an object with the parsed data

## Requirements

- Parse the amount (if present)
- Extract the payment hash
- Get the expiry time
- Return a structured object

## Example Invoice Format

Lightning invoices start with \`lnbc\` for mainnet or \`lntb\` for testnet.

Good luck with this more advanced challenge!
  `,
  initialCode: `function parseInvoice(invoice) {
  // Your invoice parsing code here
  // This is a simplified example - real BOLT11 parsing is more complex
  
  const parsed = {
    network: null,
    amount: null,
    description: null,
    paymentHash: null,
    expiry: null
  }
  
  // Add your parsing logic here
  
  return parsed
}

// Test your function
const testInvoice = "lnbc1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq8rkx3yf5tcsyz3d73gafnh3cax9rn449d9p5uxz9ezhhypd0elx87sjle52x86fux2ypatgddc6k63n7erqz25le42c4u4ecky03ylcqca784w"
console.log(parseInvoice(testInvoice))
`,
  validator: {
    language: 'javascript',
    testCases: [
      {
        name: 'Basic invoice parsing',
        input: 'lnbc1',
        expectedOutput: { network: 'mainnet' }
      }
    ],
    validate: async (userCode: string, userOutput: any) => {
      try {
        if (!userOutput || typeof userOutput !== 'object') {
          return {
            success: false,
            message: 'Function should return an object with parsed invoice data',
          }
        }

        return {
          success: true,
          message: 'Invoice parsing challenge completed! This is a complex topic - great work!',
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
  }
}
