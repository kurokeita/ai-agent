# Product Guidelines

## Prose Style
- **Technical & Precise**: Documentation and CLI output must prioritize technical accuracy and clarity. Use unambiguous language and provide specific details when necessary.
- **Minimalist**: Avoid conversational filler. Focus on delivering high-signal information efficiently.

## UX Principles
- **Interactive First**: The primary interface for users should be guided and interactive. Use clear, step-by-step prompts to simplify complex tasks like installation and configuration.
- **Visual Feedback**: Leverage colors (via `picocolors`) and symbols to provide immediate, intuitive feedback on the status of operations (e.g., success, warnings, errors).
- **Consistency**: Maintain a uniform look and feel across all CLI commands. Use consistent terminology and formatting for all outputs.

## Development Tone
- **Developer-Centric**: Focus on providing a seamless and intuitive experience for developers. Prioritize ease of use, clear abstractions, and comprehensive documentation.
- **Performance-Driven**: Ensure the CLI remains responsive and efficient, even when managing large numbers of items.

## Engineering Standards
- **Strict Linting & Formatting**: Adhere to the project's established Biome configuration for all code and documentation. Consistent formatting is mandatory.
- **Test-Driven Development (TDD)**: Prioritize reliability by writing tests alongside feature implementation. Maintain high test coverage for all core functionalities.
- **Type Safety & Documentation**: Utilize TypeScript's type system to its full potential. Ensure all public APIs and complex logic are thoroughly documented with types and inline comments.
- **Modular Architecture**: Maintain a clean separation of concerns by organizing logic into modular commands and reusable utility functions.
