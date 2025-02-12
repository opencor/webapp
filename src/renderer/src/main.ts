import primeVueAuraTheme from '@primevue/themes/aura'

import primeVueConfig from 'primevue/config'
import primeVueConfirmationService from 'primevue/confirmationservice'
import * as vue from 'vue'

import App from './App.vue'
import './assets/app.css'

import 'primeicons/primeicons.css'

const app = vue.createApp(App)

app.use(primeVueConfig, {
  theme: {
    preset: primeVueAuraTheme
  }
})
app.use(primeVueConfirmationService)

app.mount('#app')
