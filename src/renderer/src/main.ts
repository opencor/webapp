import 'primeicons/primeicons.css'
import Aura from '@primevue/themes/aura'
import PrimeVue from 'primevue/config'
import { createApp } from 'vue'
import App from './App.vue'
import './assets/app.css'

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: Aura
  }
})

app.mount('#app')
