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
- There are no automated tests currently. If you add tests, include instructions here on how to run them.

License & CLA
- By contributing, you agree that your contributions will be licensed under the project MIT license.
