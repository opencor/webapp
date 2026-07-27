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

## Deployment

OpenCOR's Web app requires **cross-origin isolation** to use features like `SharedArrayBuffer` (needed by libOpenCOR). This is done by sending the following HTTP headers on the HTML page that loads the Web app:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without these headers, the Web app will fail to initialise libOpenCOR and will not function.

### Server configuration

The exact steps depend on your Web server. Here are the steps for Apache:

1. **Enable `mod_headers`**. Ensure the `headers` module is enabled (e.g., `a2enmod headers` or add it to your modules list).
2. **Set headers on the HTML path**. In your virtual host config, add:

   ```apache
   <Location "/app">
       Header set Cross-Origin-Opener-Policy "same-origin"
       Header set Cross-Origin-Embedder-Policy "require-corp"
   </Location>
   ```

   Adjust the `Location` path to match the URL prefix where the Web app is served (here, we use `/app` assuming the Web app is served from `https://your-domain.com/app`).
3. **Reload Apache**. Apply the changes with `sudo apachectl reload` or the equivalent for your distribution.
4. **Verify**. Check the response headers on your deployed HTML page (the trailing slash is important):

   ```bash
   curl -I https://your-domain.com/app/
   ```

   You should see:

   ```http
   cross-origin-opener-policy: same-origin
   cross-origin-embedder-policy: require-corp
   ```

### Serving libOpenCOR downloads

If you serve libOpenCOR (`.js` and `.wasm` files) from the same origin as the HTML page, then they are covered by the document's cross-origin isolation policy and require no additional headers.

On the other hand, if you serve it from a different path on a different origin, then you need to set the following headers on `.js` and `.wasm` files:

```apache
<IfModule mod_headers.c>
    <FilesMatch "\.(js|wasm)$">
        Header set Access-Control-Allow-Origin "*"
        Header set Cross-Origin-Embedder-Policy "require-corp"
    </FilesMatch>
</IfModule>
```

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
