import 'primeicons/primeicons.css'
import Aura from '@primevue/themes/aura'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import { createApp } from 'vue'
import App from './App.vue'
import './assets/app.css'

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: Aura
  }
})
app.use(ConfirmationService)

app.mount('#app')
