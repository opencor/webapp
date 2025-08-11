# OpenCOR

[OpenCOR](https://opencor.ws/) is a frontend to [libOpenCOR](https://opencor.ws/libopencor/), a library that can be used to organise, edit, simulate, and analyse [CellML](https://cellml.org/) files.

There are two versions of OpenCOR:

1. **OpenCOR:** a desktop application that can be run on [Intel](https://en.wikipedia.org/wiki/List_of_Intel_processors)-based and [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family)-based [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows), [Linux](https://en.wikipedia.org/wiki/Linux), and [macOS](https://en.wikipedia.org/wiki/MacOS) machines; and
2. **OpenCOR's Web app:** a [Web app](https://en.wikipedia.org/wiki/Web_application) that can be run on a Web browser.

This package is a [Vue 3](https://vuejs.org/) component for OpenCOR's Web app.

## Prerequisites

To build the package, you need to install [Node.js](https://nodejs.org/) and [npm](https://npmjs.com/), which you can do from [here](https://nodejs.org/en/download/package-manager). Then, you need to install [pnpm](https://pnpm.io/):

```bash
npm -g install pnpm
```

## Scripts

Before doing anything, you need to install all of the package's dependencies:

```bash
pnpm install
```

Then, you can run a given script:

```bash
pnpm <script>
```

where `<script>` is one of the following:

- `build`: build the package;
- `build:lib`: build the package in preparation for publishing on npm;
- `clean`: clean the package's environment;
- `dev`: (build and) start the package in development mode;
- `format`: format the package's code;
- `format:check`: check that the package's code is properly formatted;
- `lint`: lint the package's code;
- `serve`: (build and) serve the package in production mode.
