import primeVueAuraTheme from '@primeuix/themes/aura'

import 'primeicons/primeicons.css'
import primeVueConfig from 'primevue/config'
import primeVueConfirmationService from 'primevue/confirmationservice'
import primeVueToastService from 'primevue/toastservice'
import * as vue from 'vue'

import * as locApi from '../../libopencor/locApi'

import App from './App.vue'
import './assets/app.css'

const app = vue.createApp(App, {
  // omex: 'https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/lorenz.omex'
  // omex: 'https://raw.githubusercontent.com/opencor/webapp/refs/heads/main/tests/models/ui/lorenz.omex'
  // omex: 'https://models.physiomeproject.org/workspace/b7c/rawfile/e0ae8d2d56aaaa091e23e1ee7e84cacbda1dfb6b/lorenz.omex'
})

app.use(primeVueConfig, {
  theme: {
    preset: primeVueAuraTheme
  }
})
app.use(primeVueConfirmationService)
app.use(primeVueToastService)

const locApiInitialised = vue.ref(false)

app.provide('locApiInitialised', locApiInitialised)

void locApi.initialiseLocApi().then(() => {
  locApiInitialised.value = true
})

app.mount('#app')
