import primeVueAuraTheme from '@primeuix/themes/aura'

import primeVueConfig from 'primevue/config'
import primeVueConfirmationService from 'primevue/confirmationservice'
import primeVueToastService from 'primevue/toastservice'
import * as vue from 'vue'

import App from './App.vue'
import './assets/app.css'

import 'primeicons/primeicons.css'

const app = vue.createApp(App, {
  // omex: 'https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/lorenz.omex'
  // omex: 'https://models.physiomeproject.org/workspace/b7c/rawfile/e0ae8d2d56aaaa091e23e1ee7e84cacbda1dfb6b/lorenz.omex'
})

app.use(primeVueConfig, {
  theme: {
    preset: primeVueAuraTheme
  }
})
app.use(primeVueConfirmationService)
app.use(primeVueToastService)

app.mount('#app')
