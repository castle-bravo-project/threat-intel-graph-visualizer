# Contributing to Threat Intel Graph Visualizer

Thank you for your interest in contributing to the Threat Intel Graph Visualizer! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Issues
- Use the [GitHub Issues](https://github.com/castle-bravo-project/threat-intel-graph-visualizer/issues) page
- Search existing issues before creating a new one
- Provide detailed information including:
  - Steps to reproduce
  - Expected vs actual behavior
  - Browser and OS information
  - Screenshots if applicable

### Suggesting Features
- Open a [GitHub Discussion](https://github.com/castle-bravo-project/threat-intel-graph-visualizer/discussions) for feature requests
- Describe the use case and expected benefits
- Consider the progressive enhancement architecture

### Code Contributions

#### Development Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/threat-intel-graph-visualizer.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature-name`
5. Make your changes
6. Test thoroughly
7. Commit and push
8. Open a Pull Request

#### Code Standards
- **TypeScript**: Use strict typing
- **React**: Functional components with hooks
- **Styling**: Tailwind CSS classes
- **Formatting**: Prettier configuration
- **Linting**: ESLint rules

#### Commit Messages
Use conventional commits format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

#### Pull Request Process
1. Ensure your code follows the project standards
2. Update documentation if needed
3. Add tests for new functionality
4. Ensure all tests pass
5. Update the README if needed
6. Request review from maintainers

## 🏗️ Architecture Guidelines

### Progressive Enhancement
- Maintain compatibility with demo mode (no API key)
- Provide meaningful fallbacks for AI features
- Ensure core visualization works without external dependencies

### Performance
- Optimize for large datasets
- Use React.memo and useMemo appropriately
- Minimize bundle size

### Security
- Never store sensitive data on servers
- Validate all user inputs
- Follow secure coding practices

## 📝 Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for complex functions
- Update type definitions as needed
- Include examples in documentation

## 🧪 Testing

- Test in multiple browsers
- Verify both demo and full AI modes
- Test with various data sizes
- Ensure responsive design works

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🔗 Related Projects

- **[Enhanced RIR Parser](https://github.com/castle-bravo-project/enhanced-rir-parser)**: Generate accurate JSON GeoIP data for enhanced geographic visualization

## 🙋‍♀️ Questions?

Feel free to ask questions in [GitHub Discussions](https://github.com/castle-bravo-project/threat-intel-graph-visualizer/discussions) or open an issue for clarification.

---

**Castle Bravo Project**
*Open Code. Open Defense. Open Future.*
