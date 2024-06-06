import { defineStore } from 'pinia'

interface State {
	value: string
	lang: Language
	loadingCount: number
}

export const useStore = defineStore('main', {
	state: (): State => {
		return {
			value: 'Starting value of store variable',
			lang: 'en',
			loadingCount: 0,
		}
	},
	getters: {
		isLoading: (state) => state.loadingCount > 0,
	},
	actions: {
		/* You can define actions here and just call then like normal methods */
		setLoading() {
			this.loadingCount++
		},
		setLoadingDone() {
			this.loadingCount--
		},
	},
})
