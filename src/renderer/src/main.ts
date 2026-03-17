import { createApp } from 'vue';

import App from './App.vue';
// import App from './AppWithinContainers.vue';
// import App from './AppWithMultipleInstances.vue';
// import App from './AppWithOmex.vue';
// import App from './AppWithRawOmex.vue';
// import App from './AppWithSimulationData.vue';

createApp(App).mount('#app');

// Note: we are using the "opencor" class as the Tailwind CSS `important` selector to help protect our styles from being
//       overridden by the styles of a host application when OpenCOR is used as a library. Layered CSS (e.g.,
//       `@layer base`) always loses to unlayered CSS, regardless of specificity, so using an `important` selector alone
//       is not sufficient if our styles remain in a Tailwind CSS layer. Our actual solution relies on 1) using the
//       "opencor" class as the Tailwind CSS `important` selector and on 2) unwrapping/stripping Tailwind CSS layers in
//       the library build, so that OpenCOR's styles are emitted as unlayered CSS with higher effective specificity than
//       the host application's styles.
