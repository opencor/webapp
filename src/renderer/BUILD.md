# Prerequisites

- [Node.js](https://nodejs.org/) (version 22+);
- [npm](https://npmjs.com/) (it comes with Node.js); and
- [pnpm](https://pnpm.io/) (for package management).

## Installation

1. **Install Node.js and npm from [here](https://nodejs.org/en/download/package-manager);** and
2. **Install pnpm globally:**

```bash
npm install -g pnpm
```

# Getting Started

1. **Install the package's dependencies:**

   ```bash
   pnpm install
   ```

2. **Start the development server:**

   ```bash
   pnpm dev
   ```

3. **Test the package:**

   Open your browser and navigate to the local development URL (typically http://localhost:5173).

# Available Scripts

| Script         | Description                                                           |
| -------------- | --------------------------------------------------------------------- |
| `build`        | Build the package                                                     |
| `build:lib`    | Build the package as a library for npm publishing                     |
| `clean`        | Clean the package's environment                                       |
| `dev`          | (Build and) start the server with hot reload                          |
| `format`       | Format the code using [Prettier](https://prettier.io/)                |
| `format:check` | Check code formatting without making changes                          |
| `lint`         | Lint and automatically fix issues using [ESLint](https://eslint.org/) |
| `serve`        | (Build and) start the (production) server                             |
