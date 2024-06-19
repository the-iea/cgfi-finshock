// @ts-ignore
import { getEquities, runModel } from '@/lib/model'
import { defineStore } from 'pinia'

interface State {
	extAssets: number[]
	extLiabilities: number[]
	shock: number[]
	liabilityMatrix: number[][]
	modelType: 'Distress' | 'Merton' | 'Black'
	selectedNode: number
	equityOuts: number[][]
	effectiveValues: number[][]
	modelI: number
	animating: boolean
	lang: string
	loadingCount: number
	updating: boolean
}

function mulberry32(a: number) {
	return function () {
		let t = (a += 0x6d2b79f5)
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

const getRand = mulberry32(12345)

export const useStore = defineStore('main', {
	state: (): State => {
		// const extAssets = [20, 10, 10]
		// const extLiabilities = [0, 0, 0]
		// const shock = [5, 0, 0]
		// const liabilityMatrix = [
		// 	[0, 10, 0],
		// 	[0, 0, 10],
		// 	[0, 0, 0],
		// ]

		// const extAssets = []
		// const extLiabilities = []
		// const shock = []
		// const liabilityMatrix = []
		// const nodes = 8
		// for (let i = 0; i < nodes; i++) {
		// 	extAssets.push(getRand() * 100)
		// 	extLiabilities.push(0)
		// 	shock.push(getRand() < 3 / nodes ? 200 : 2)
		// 	const lRow = []
		// 	for (let j = 0; j < nodes; j++) {
		// 		if (i != j && getRand() < 0.1) lRow.push(getRand() * 10)
		// 		else lRow.push(0)
		// 	}
		// 	liabilityMatrix.push(lRow)
		// }

		// const extAssets = [100, 100, 100, 100, 100, 100]
		// const extLiabilities = [0, 0, 0, 0, 0, 0]
		// const shock = [0, 0, 0, 0, 0, 100]
		// const liabilityMatrix = [
		// 	[0, 50, 70, 0, 0, 0],
		// 	[0, 0, 50, 70, 0, 0],
		// 	[0, 0, 0, 50, 70, 0],
		// 	[0, 0, 0, 0, 50, 70],
		// 	[70, 0, 0, 0, 0, 50],
		// 	[50, 70, 0, 0, 0, 0],
		// ]

		// Contrived example of emergent disaster
		const extAssets = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
		const extLiabilities = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
		const shock = [0, 0, 0, 0, 0, 0, 0, 0, 0, 90]
		const liabilityMatrix = [
			[0, 51.01, 0, 0, 0, 20, 50, 0, 0, 0],
			[0, 0, 50.002, 0, 0, 0, 0, 0, 0, 0],
			[0, 50, 0, 50.003, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 50.004, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 50.005, 0, 50.01, 0, 0],
			[0, 0, 0, 0, 0, 0, 30.006, 49.95, 49.97, 0],
			[0, 0, 0, 0, 0, 0, 0, 50.007, 50.013, 50.014],
			[0, 0, 0, 0, 0, 0, 0, 0, 50.008, 50.015],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 50.009],
			[50.016, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		]

		const s: State = {
			extAssets,
			extLiabilities,
			shock,
			liabilityMatrix,
			equityOuts: [],
			effectiveValues: [],
			modelType: 'Distress',
			selectedNode: 0,
			modelI: 0,
			animating: false,
			loadingCount: 0,
			lang: 'en',
			updating: false,
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
		nNodes: (state) => state.extAssets.length,
	},
	actions: {
		/* You can define actions here and just call then like normal methods */
		setLoading() {
			this.loadingCount++
		},
		setLoadingDone() {
			this.loadingCount--
		},
		prevModelI() {
			this.modelI = Math.max(0, this.modelI - 1)
		},
		nextModelI() {
			this.modelI = Math.min(this.equityOuts.length - 1, this.modelI + 1)
		},
		rerunModel() {
			this.setLoading()
			const results = runModel(
				this.extAssets,
				this.extLiabilities,
				this.liabilityMatrix,
				this.shock,
				this.modelType,
			)
			this.equityOuts = results.eqVals
			this.effectiveValues = results.effectiveAssetVals
			if (this.modelI >= this.equityOuts.length)
				this.modelI = this.equityOuts.length - 1
			this.setLoadingDone()
		},
		addNode() {
			this.updating = true
			this.extLiabilities.push(0)
			this.shock.push(0)
			this.liabilityMatrix.push(this.extAssets.map(() => 0))
			this.liabilityMatrix.forEach((row, i) =>
				row.push(i == row.length - 1 ? 50 : 0),
			)
			this.updating = false
			this.extAssets.push(100)
		},
		removeNode() {
			this.updating = true
			this.extLiabilities.pop()
			this.shock.pop()
			this.liabilityMatrix.pop()
			this.liabilityMatrix.forEach((row) => row.pop())
			this.updating = false
			this.extAssets.pop()
		},
	},
})
