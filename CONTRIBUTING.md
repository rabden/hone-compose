Thanks for your interest in contributing to Hone! We welcome issues, feature requests, and pull requests.

Getting started
- Fork the repository and clone your fork.
- Create a feature branch: `git checkout -b feat/your-feature`.
- Install dependencies: `npm install`.
- Build a single bundle: `npm run build:content` (also `build:background`, `build:bridge`, `build:pages`). Or build everything: `npm run build` — this also copies the Harper WASM binary and `manifest.json` into `dist/`.
- After changing code, run `npx tsc -b`, `npm run lint`, and `npm test` before opening a PR.

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
