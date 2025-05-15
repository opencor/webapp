import primeVueAuraTheme from '@primeuix/themes/aura'

import primeVueConfig from 'primevue/config'
import primeVueConfirmationService from 'primevue/confirmationservice'
import primeVueToastService from 'primevue/toastservice'
import * as vue from 'vue'

import App from './App.vue'
import './assets/app.css'

import 'primeicons/primeicons.css'

const app = vue.createApp(App, {
  omex: 'https://raw.githubusercontent.com/opencor/webapp/main/tests/models/lorenz.omex'
})

app.use(primeVueConfig, {
  theme: {
    preset: primeVueAuraTheme
  }
})
app.use(primeVueConfirmationService)
app.use(primeVueToastService)

app.mount('#app')
