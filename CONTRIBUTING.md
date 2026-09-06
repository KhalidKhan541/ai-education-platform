# Contributing to AI Education Platform

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Install dependencies: `npm install`
5. Copy `.env.example` to `.env.local` and configure
6. Run migrations: `npx prisma migrate dev`
7. Start dev server: `npm run dev`

## Code Standards

### TypeScript

- Use strict TypeScript
- Avoid `any` types
- Define interfaces for all data structures
- Use proper error handling

### React

- Use functional components with hooks
- Keep components small and focused
- Use proper prop types
- Handle loading and error states

### Testing

- Write tests for all new features
- Maintain >70% code coverage
- Use descriptive test names
- Test edge cases and error scenarios

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
```

### Git

- Write clear commit messages
- Keep commits focused and atomic
- Reference issues in commits
- Use conventional commits format:

```
feat: add new feature
fix: resolve bug in X
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add/update tests
chore: maintenance tasks
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Update CHANGELOG if applicable
5. Request review from maintainers

## Code Review

All submissions require review. We use GitHub pull requests for this purpose.

### Review Checklist

- [ ] Code follows project style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No breaking changes (or clearly documented)
- [ ] Performance considerations addressed

## Reporting Issues

- Use the issue tracker
- Include reproduction steps
- Include environment details
- Attach screenshots if applicable

## Feature Requests

- Describe the problem you're solving
- Explain your proposed solution
- Consider alternatives
- Note any trade-offs

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
