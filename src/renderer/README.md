# OpenCOR

[OpenCOR](https://opencor.ws/) is a frontend to [libOpenCOR](https://opencor.ws/libopencor/), a library that can be used to organise, edit, simulate, and analyse [CellML](https://cellml.org/) files.

There are two versions of OpenCOR:

1. **OpenCOR:** a desktop application that can be run on [Intel](https://en.wikipedia.org/wiki/List_of_Intel_processors)-based and [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family)-based [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows), [Linux](https://en.wikipedia.org/wiki/Linux), and [macOS](https://en.wikipedia.org/wiki/MacOS) machines; and
2. **OpenCOR's Web app:** a [Web app](https://en.wikipedia.org/wiki/Web_application) that can be run on a Web browser.

Key characteristics:
- Built as a [Vue 3](https://vuejs.org/) component using the [Composition API](https://vuejs.org/guide/extras/composition-api-faq).
- Uses [PrimeVue](https://www.primefaces.org/primevue/) as its UI framework.
- Uses [Tailwind CSS](https://tailwindcss.com/) for styling.
- Can be used as a standalone Web app or embedded in a Vue 3 application.
- Uses [CSS containment](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment) to prevent CSS leakage when OpenCOR is embedded in an application that doesn't use [PrimeVue](https://www.primefaces.org/primevue/) as its UI framework.

## Usage

OpenCOR accepts the following props:

| Name    | Type                                | Default    | Description                                                                             |
| ------- | ----------------------------------- | ---------- | --------------------------------------------------------------------------------------- |
| `omex`  | `string` \| `Uint8Array`            | `null`     | The [OMEX file](https://combinearchive.org/) to use, as a URL string or raw OMEX bytes. |
| `theme` | `'light'` \| `'dark'` \| `'system'` | `'system'` | The theme to use.                                                                       |

- **main.ts:**

```typescript
import { createApp } from 'vue';

import App from './App.vue';

createApp(App).mount('#app');
```

### No `omex` prop provided

When no `omex` prop is provided, the component gives access to all of OpenCOR's features.

- **App.vue:**

```vue
<template>
  <OpenCOR />
</template>

<script setup lang="ts">
import OpenCOR from '@opencor/opencor';
import '@opencor/opencor/style.css';
</script>
```

### `omex` prop provided

When an `omex` prop is provided, the component goes straight into OpenCOR's simulation mode, using the specified OMEX file.

- **App.vue:**

```vue
<template>
  <OpenCOR omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/ui/lorenz.omex" />
</template>

<script setup lang="ts">
import OpenCOR from '@opencor/opencor';
import '@opencor/opencor/style.css';
</script>
```

- **Exposed methods:**

  OpenCOR always exposes the following methods, which only have an effect when an `omex` prop is provided:

  - `trackSimulationData(modelParameters: string[])`: adds the given parameter names to the list of tracked simulation data.
  - `untrackSimulationData(modelParameters: string[])`: removes the given parameter names from the list of tracked simulation data.
  - `untrackAllSimulationData()`: clears the list of tracked simulation data.

  A parameter name is a string that identifies a parameter in the model and consists of the component in which the parameter is located and the name of the parameter itself, separated by a slash. For instance, `main/x` identifies the `x` parameter in the `main` component.

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/opencor/webapp)
