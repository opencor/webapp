import Aura from '@primevue/themes/aura'

import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import * as vue from 'vue'

import App from './App.vue'
import './assets/app.css'

import 'primeicons/primeicons.css'

const app = vue.createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: Aura
  }
})
app.use(ConfirmationService)

app.mount('#app')
