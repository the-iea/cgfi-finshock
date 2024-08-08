import App from '@/App.vue'
import '@/assets/styles/main.scss'
import { createI18n } from '@/lib/labels'
import router from '@/router'
import { useStore } from '@/store/store'
import { library } from '@fortawesome/fontawesome-svg-core'
import {
	faBackwardFast,
	faBackwardStep,
	faClose,
	faForwardFast,
	faForwardStep,
	faPause,
	faPlay,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

library.add(
	faPlay,
	faPause,
	faForwardStep,
	faBackwardStep,
	faForwardFast,
	faBackwardFast,
	faClose,
)

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

app.component('fa-icon', FontAwesomeIcon)

const store = useStore()
// TODO use language store here (if required)
const i18n = createI18n(() => store.lang as Language)
app.use(i18n)

app.mount('#app')
