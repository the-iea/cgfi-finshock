import { getEquities } from '@/lib/model'
import { defineStore } from 'pinia'

interface State {
	loadingCount: number
	extAssets: number[]
	extLiabilities: number[]
	shock: number[]
	liabilityMatrix: number[][]
	lang: string
}

function mulberry32(a: number) {
	return function () {
		let t = (a += 0x6d2b79f5)
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

const getRand = mulberry32(123)

export const useStore = defineStore('main', {
	state: (): State => {
		// const extAssets = []
		// const extLiabilities = []
		// const shock = []
		// const liabilityMatrix = []
		// const nodes = 5
		// for (let i = 0; i < nodes; i++) {
		// 	extAssets.push(260)
		// 	extLiabilities.push(0)
		// 	shock.push(getRand() < 0.3 ? 260 : 20)
		// 	const lRow = []
		// 	for (let j = 0; j < nodes; j++) {
		// 		if (getRand() < 0.1) lRow.push(getRand() * 10)
		// 		else lRow.push(0)
		// 	}
		// 	liabilityMatrix.push(lRow)
		// }

		const extAssets = [100, 100, 100, 100, 100, 700]
		const extLiabilities = [0, 0, 0, 0, 0, 0]
		const shock = [0, 0, 0, 0, 0, 500]
		const liabilityMatrix = [
			[0, 50, 0, 0, 0, 0],
			[0, 0, 50, 0, 0, 0],
			[0, 0, 0, 50, 0, 0],
			[0, 0, 0, 0, 50, 0],
			[50, 0, 0, 0, 0, 0],
			[100, 100, 100, 100, 100, 0],
		]
		const s = {
			extAssets,
			extLiabilities,
			shock,
			liabilityMatrix,
			loadingCount: 0,
			lang: 'en',
		}
		return s
	},
	getters: {
		isLoading: (state) => state.loadingCount > 0,
		equities: (state) => {
			return getEquities(
				state.extAssets,
				state.extLiabilities,
				state.liabilityMatrix,
			)
		},
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
