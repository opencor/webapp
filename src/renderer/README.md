# OpenCOR

[OpenCOR](https://opencor.ws/) is a frontend to [libOpenCOR](https://opencor.ws/libopencor/), a library that can be used to organise, edit, simulate, and analyse [CellML](https://cellml.org/) files.

There are two versions of OpenCOR:

1. **OpenCOR:** a desktop application that can be run on [Intel](https://en.wikipedia.org/wiki/List_of_Intel_processors)-based and [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family)-based [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows), [Linux](https://en.wikipedia.org/wiki/Linux), and [macOS](https://en.wikipedia.org/wiki/MacOS) machines; and
2. **OpenCOR's Web app:** a [Web app](https://en.wikipedia.org/wiki/Web_application) that can be run on a Web browser.

This package is a [Vue 3](https://vuejs.org/) component for OpenCOR's Web app, built with the [Composition API](https://vuejs.org/guide/extras/composition-api-faq).

## Usage

The component comes with one prop:

| Prop   | Description                                                                                                                                                                                                                                                                                              |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `omex` | The URL to the [OMEX file](https://combinearchive.org/) to load.<br>- If the `omex` prop is not provided, the component will give access to all of OpenCOR's features.<br>- If the `omex` prop is provided, the component will go straight into OpenCOR's simulation mode using the specified OMEX file. |

- **main.ts:**

```typescript
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')
```

### No `omex` prop provided

- **App.vue:**

```vue
<template>
  <OpenCOR />
</template>

<script setup lang="ts">
import OpenCOR from '@opencor/opencor'
import '@opencor/opencor/style.css'
</script>
```

### With `omex` prop provided

- **App.vue:**

```vue
<template>
  <OpenCOR omex="https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/ui/lorenz.omex" />
</template>

<script setup lang="ts">
import OpenCOR from '@opencor/opencor'
import '@opencor/opencor/style.css'
</script>
```

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/opencor/webapp)
