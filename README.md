# 🧡 B4OS Challenges 

> **Interactive coding challenges for the B4OS (Bitcoin 4 Open Source) training program**

B4OS Challenges is an immersive, story-driven coding platform that evaluates technical skills for the [B4OS program](https://b4os.dev/) - a free training initiative for senior developers to contribute to Bitcoin Core, Lightning Network, and open-source Bitcoin ecosystem projects. Inspired by [Saving Satoshi](https://savingsatoshi.com), it provides a gamified assessment experience for developers interested in joining this elite Bitcoin development program.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![GitHub Auth](https://img.shields.io/badge/Auth-GitHub_OAuth-181717?style=flat-square&logo=github)](https://github.com/settings/developers)

## 🎯 About B4OS Program

**[B4OS (Bitcoin 4 Open Source)](https://b4os.dev/)** is a **free technical training program** for senior developers (2+ years experience) focused on contributing to Bitcoin Core, Lightning Network, and open-source Bitcoin ecosystem projects.

### 🌟 Program Highlights:
- **🆓 Completely Free** - No cost, funded by Bitcoin ecosystem
- **🎓 Elite Training** - Learn from respected Bitcoin ecosystem leaders  
- **🌎 LATAM Focus** - Targeting developers in Latin America, Caribbean, and Spain
- **💼 Career Opportunities** - Micro-grants, mentorship, and full-time job paths
- **🏠 Hacker Residencies** - Optional in-person programs in Brazil, Spain, Mexico

### 🛤️ Learning Paths:
1. **Bitcoin Core Protocol Development** (C++, Rust)
2. **Lightning Network Protocol Development** (Go, Rust, C++)  
3. **Application Development** (JavaScript, Python, various frameworks)

**B4OS Challenges** serves as the **technical assessment platform** to evaluate candidates' skills across these domains through hands-on coding challenges.

## ✨ Features

### 🎮 **Immersive Experience**
- **🎬 Cinematic Onboarding** - 3-step story introduction to the B4OS 2025 universe
- **📖 Rich Storytelling** - Guided by mentors like Dr. Hash and Lightning Lily
- **🏆 Achievement System** - Unlock badges with rarity levels (Common → Legendary)
- **📊 Visual Progress** - Real-time progress tracking through chapters

### 💻 **Advanced Code Editor**  
- **Monaco Editor** - Full IDE experience with syntax highlighting
- **🧪 Live Testing** - Instant validation against comprehensive test suites
- **📱 Mobile Responsive** - Code anywhere, anytime
- **🔄 Session Persistence** - Never lose your progress

### 🔐 **Professional Authentication**
- **GitHub OAuth** - One-click login for verified developers
- **Profile Integration** - Showcase your achievements on your developer profile
- **Protected Routes** - Secure access to challenge content
- **Social Features** - Connect with the Bitcoin developer community

## 🚀 Quick Start

### Prerequisites

- Node.js 16.13.0 or higher
- npm or yarn package manager

### Installation

1. Clone or download this repository
2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
# or
yarn build
yarn start
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Home page
│   └── challenges/        # Challenge pages
├── components/            # React components
│   ├── CodeEditor.tsx     # Monaco code editor
│   └── ChallengeCard.tsx  # Challenge display card
├── lib/                   # Utility libraries
│   └── challenges.ts      # Challenge definitions
└── types/                 # TypeScript type definitions
    └── challenge.ts       # Challenge interfaces
```

## 🔧 Adding New Challenges

### 1. Define Your Challenge

Create a new challenge object in `src/lib/challenges.ts`:

```typescript
export const myNewChallenge: Challenge = {
  metadata: {
    id: 'unique-challenge-id',
    title: 'Challenge Title',
    description: 'Brief description of the challenge',
    difficulty: 'beginner' | 'intermediate' | 'advanced',
    category: 'bitcoin-basics' | 'transactions' | 'lightning-network' | 'scripting' | 'cryptography',
    estimatedTime: 20, // minutes
    points: 150,
    prerequisites: ['other-challenge-id'] // optional
  },
  content: `
# Challenge Title

Your challenge description in Markdown format.

## Your Task
- Detailed instructions
- Requirements
- Examples

## Expected Output
What the solution should return or accomplish.
  `,
  initialCode: `// Starting code template
function myFunction(param) {
  // Your code here
}`,
  validator: {
    language: 'javascript',
    testCases: [
      {
        name: 'Test case description',
        input: 'test input',
        expectedOutput: 'expected result'
      }
    ],
    validate: async (userCode: string, userOutput: any) => {
      // Your validation logic
      return {
        success: true, // or false
        message: 'Success/failure message',
        passedTests: 1,
        totalTests: 1,
        errors: [] // optional error details
      }
    }
  },
  resources: [ // optional
    {
      title: 'Helpful Resource',
      url: 'https://example.com',
      type: 'documentation'
    }
  ]
}
```

### 2. Add to Challenge List

Add your challenge to the `allChallenges` array in the same file:

```typescript
export const allChallenges: Challenge[] = [
  bitcoinBasicsChallenge,
  lightningNetworkChallenge,
  myNewChallenge, // Add here
]
```

### 3. Test Your Challenge

1. Start the development server
2. Navigate to your challenge page: `http://localhost:3000/challenges/unique-challenge-id`
3. Test the code editor and validation system
4. Verify all test cases work correctly

## 🎨 Customization

### Branding

- Update colors in `src/app/page.tsx` (gradient backgrounds, accent colors)
- Modify the Bitcoin logo in headers
- Change text content and messaging

### Challenge Categories

Add new categories in `src/types/challenge.ts`:

```typescript
category: 'bitcoin-basics' | 'transactions' | 'lightning-network' | 'scripting' | 'cryptography' | 'your-new-category'
```

Update the category filters in `src/app/challenges/page.tsx`.

### Styling

The project uses Tailwind CSS. Customize styles by:
- Modifying component classes
- Updating `tailwind.config.js` for theme changes
- Adding custom CSS in global styles

## 🔒 Security Considerations

This template includes basic code execution for validation. For production use:

1. **Implement proper code sandboxing**
2. **Use server-side validation**
3. **Sanitize all user inputs**
4. **Consider using Docker containers for code execution**
5. **Implement rate limiting**

## 📊 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Deploy automatically with each push

### Netlify

1. Build the project: `npm run build`
2. Deploy the `out` or `.next` directory
3. Configure redirects for client-side routing

### Self-hosted

1. Build: `npm run build`
2. Start: `npm start`
3. Configure reverse proxy (nginx/Apache)
4. Set up process manager (PM2)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add your challenges or improvements
4. Test thoroughly
5. Submit a pull request

## 📋 Challenge Ideas for Bitcoin/Lightning

### Beginner Level
- Hash functions and digital signatures
- Address generation from public keys
- Basic transaction parsing
- Simple script operations

### Intermediate Level
- Multi-signature transaction creation
- Lightning invoice decoding
- Payment channel state management
- Transaction fee calculation

### Advanced Level
- Lightning routing algorithms
- Advanced Bitcoin scripts
- Atomic swap implementations
- Layer 2 protocol development

## 📝 License

This project is open source and available under the MIT License.

## 🆘 Support

For questions about the platform or challenge development:

1. Check existing documentation
2. Review sample challenges
3. Test in development environment
4. Reach out to the B4OS team

---

**Good luck with your Bitcoin and Lightning Network development journey!** 🧡⚡

Built with ❤️ for the Bitcoin developer community.
