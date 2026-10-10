Thanks for your interest in contributing to Hone! We welcome issues, feature requests, and pull requests.

Getting started
- Fork the repository and clone your fork.
- Create a feature branch: `git checkout -b feat/your-feature`.
- Install dependencies: `npm install`.
- Run a development build (content script): `ENTRY=content npm run build:content` or to build everything: `npm run build`.

Code style
- The project uses TypeScript and ESLint. Run `npm run lint` and fix issues before opening a PR.

Pull request process
- Open a pull request against `main` on the upstream repository.
- Include a clear description of the change, why it’s needed, and how to test it.
- If your change affects public APIs or the manifest, update documentation accordingly.

Testing
- Run the test suite with `npm test`. Tests live in `tests/` and use Node's built-in test runner (`*.test.ts`).
- Add tests for new pure logic where practical, such as detection heuristics and text processing.

License & CLA
- By contributing, you agree that your contributions will be licensed under the project MIT license.
