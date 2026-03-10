## Version control system

Commit guidelines based on [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) and [Angular commit conventions](https://github.com/angular/angular/blob/22b96b9/CONTRIBUTING.md#-commit-message-guidelines).

## Rules

* Commit format:
  ```
  <type>[(optional scope)]: <subject>

  [optional body]

  [optional footer]
  ```
* Type:
    * required
    * only in lower case
    * one of: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test
    * see [Commit Types](#commit-types) for descriptions
* Scope:
    * optional
    * only in lower case
    * must consist of a noun describing a section of the codebase, can be:
      * a class or component
      * a file name
      * a directory name
      * a namespace
      * a tool name
      * a name of dependency
      * another part of codebase
* Subject:
    * use the imperative, present tense: "change" not "changed" nor "changes"
    * must start from lower case
    * no dot at the end
* Max header length
    * recommended: no more than 50 characters
    * error on 72+ characters
* Body:
    * use the imperative, present tense: "change" not "changed" nor "changes"
    * max line length: 72 characters
* Footer:
    * max line length: 72 characters
    * issue-key is optional; if present, put it only in the footer

### Commit Types

| Type     | Description                                                                                  |
|----------|----------------------------------------------------------------------------------------------|
| build    | Changes that affect the build system or dependencies and can impact production behavior.     |
| chore    | Technical/maintenance changes not covered by other types and not affecting production.       |
| ci       | Changes to CI configuration or scripts.                                                      |
| docs     | Documentation-only changes.                                                                  |
| feat     | New feature or capability.                                                                   |
| fix      | Bug fix in existing behavior.                                                                |
| perf     | Performance improvements.                                                                    |
| refactor | Code changes that do not fix bugs or add features.                                           |
| revert   | Revert of a previous commit.                                                                 |
| style    | Formatting or style changes that do not change meaning or behavior.                          |
| test     | Adding or correcting tests.                                                                  |

#### Type boundaries

- `perf` vs `refactor`: use `perf` if the intent/result is performance improvement, even if code structure also changes.
- `build` vs `ci`: `build` is product build system/dependencies; `ci` is pipeline config/scripts.
- `build` vs `chore`: `build` affects production build/behavior via build system or dependencies, `chore` does not.

### Atomic commits

* Each commit should represent one coherent change.
* Do not mix unrelated changes in one commit, even in the same file/section. Examples:
  * style change and bug fix = two commits (`style`, `fix` types)
  * two independent bug fixes = two commits
* Strive for atomicity even if it is not always achievable.
