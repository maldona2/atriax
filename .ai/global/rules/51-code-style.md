# Code Style

## Prettier Configuration

- Single quotes for strings.
- Semicolons required.
- 80-character line width.
- 2 spaces for indentation.
- ES5 trailing commas.
- Run Prettier before committing code.

## Language

- Write all code (identifiers, comments, commit messages) in **English**. See `45-language.md` for the UI-Spanish rule.

## Naming Conventions

- Use camelCase for variables and functions.
- Use PascalCase for components, classes, and types/interfaces.
- Use UPPER_SNAKE_CASE for constants.
- Use kebab-case for file names (except React components use PascalCase).
- Prefix boolean variables with `is`, `has`, `should`, etc.
- Use descriptive names; avoid abbreviations unless widely understood.

## File Organization

- Group related files by feature/domain, not by type.
- Keep files focused; split large files into smaller modules.
- Use index files to re-export from directories.
- Place tests adjacent to the code they test.
