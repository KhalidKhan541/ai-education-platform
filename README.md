# AI Education Platform

An AI-powered education platform built with Next.js 14, Prisma, PostgreSQL, and TypeScript.

## Features

- **Course Management** - Create, publish, and manage courses with modules and lessons
- **AI Tutor** - Interactive AI-powered tutoring with conversation history
- **Quizzes & Assessments** - Auto-graded quizzes with multiple question types
- **Assignment System** - Submit, grade, and track assignments with rubrics
- **Progress Tracking** - Monitor student progress across courses
- **Gamification** - Points, achievements, streaks, and leaderboards
- **Certificates** - Auto-generated certificates upon course completion
- **Real-time Collaboration** - Live sessions and discussions

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 16
- **AI**: OpenAI GPT-4 integration
- **Auth**: NextAuth.js with Google OAuth
- **State**: Zustand
- **Testing**: Jest, React Testing Library
- **CI/CD**: GitHub Actions
- **Containerization**: Docker

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/ai-education-platform.git
cd ai-education-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database
npm run db:seed

# Start development server
npm run dev
```

### Docker Setup

```bash
# Development
docker compose up -d

# Production
docker compose -f docker-compose.prod.yml up -d
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- course-service.test.ts
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript check |
| `npm test` | Run tests |
| `npm run test:coverage` | Run tests with coverage |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |

## Project Structure

```
src/
├── app/              # Next.js App Router pages
│   ├── api/          # API routes
│   └── (routes)/     # Page routes
├── components/       # React components
│   ├── ui/           # UI primitives
│   ├── courses/      # Course components
│   ├── lessons/      # Lesson components
│   └── ...
├── lib/              # Utilities and services
│   ├── ai/           # AI services
│   ├── courses/      # Course services
│   ├── lessons/      # Lesson services
│   └── ...
├── hooks/            # Custom React hooks
├── store/            # Zustand stores
└── types/            # TypeScript types
```

## API Documentation

### Health Check
```
GET /api/health
```

### Courses
```
GET    /api/courses           # List courses
POST   /api/courses           # Create course
GET    /api/courses/[id]      # Get course
PUT    /api/courses/[id]      # Update course
DELETE /api/courses/[id]      # Delete course
```

## Environment Variables

See `.env.example` for all required environment variables.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.
