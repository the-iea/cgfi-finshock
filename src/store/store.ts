import { getEquities } from '@/lib/model'
import worker from '@/lib/worker'
import { defineStore } from 'pinia'

interface State {
	extAssets: number[]
	extLiabilities: number[]
	shock: number[]
	liabilityMatrix: number[][]
	valueFunc: 'Distress' | 'Merton' | 'Black'
	selectedNode: number
	selectedLiability: { to: number; from: number } | null
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

const randomiseInputs = (nodes: number) => {
	const extAssets = []
	const extLiabilities = []
	const shock = []
	const liabilityMatrix = []
	for (let i = 0; i < nodes; i++) {
		extAssets.push(getRand() * 100)
		extLiabilities.push(0)
		shock.push(getRand() < 3 / nodes ? 200 : 2)
		const lRow = []
		for (let j = 0; j < nodes; j++) {
			if (i != j && getRand() < 0.1) lRow.push(getRand() * 10)
			else lRow.push(0)
		}
		liabilityMatrix.push(lRow)
	}
	return { extAssets, extLiabilities, shock, liabilityMatrix }
}

export const useStore = defineStore('main', {
	state: (): State => {
		let extAssets: number[]
		let extLiabilities: number[]
		let shock: number[]
		let liabilityMatrix: number[][]

		const randInputs = randomiseInputs(200)
		extAssets = randInputs.extAssets
		extLiabilities = randInputs.extLiabilities
		shock = randInputs.shock
		liabilityMatrix = randInputs.liabilityMatrix

		// Contrived example of emergent disaster
		extAssets = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
		extLiabilities = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
		shock = [0, 0, 0, 0, 0, 0, 0, 0, 0, 90]
		liabilityMatrix = [
			[0, 51, 0, 0, 0, 20, 50, 0, 0, 0],
			[0, 0, 50, 0, 0, 0, 0, 0, 0, 0],
			[0, 50, 0, 50, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 50, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 50, 0, 50, 0, 0],
			[0, 0, 0, 0, 0, 0, 30, 50, 50, 0],
			[0, 0, 0, 0, 0, 0, 0, 50, 50, 50],
			[0, 0, 0, 0, 0, 0, 0, 0, 50, 50],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 50],
			[50, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		]

		// extAssets = [100, 100, 100, 100, 100, 100]
		// extLiabilities = [0, 0, 0, 0, 0, 0]
		// shock = [0, 0, 0, 0, 0, 100]
		// liabilityMatrix = [
		// 	[0, 50, 70, 0, 0, 0],
		// 	[0, 0, 50, 70, 0, 0],
		// 	[0, 0, 0, 50, 70, 0],
		// 	[0, 0, 0, 0, 50, 70],
		// 	[70, 0, 0, 0, 0, 50],
		// 	[50, 70, 0, 0, 0, 0],
		// ]

		const s: State = {
			extAssets,
			extLiabilities,
			shock,
			liabilityMatrix,
			equityOuts: [],
			effectiveValues: [],
			valueFunc: 'Distress',
			selectedNode: 0,
			selectedLiability: { to: 1, from: 0 },
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
		async rerunModel() {
			this.setLoading()
			const results = await worker.send({
				extAssets: [...this.extAssets],
				extLiabilities: [...this.extLiabilities],
				liabilityMatrix: [...this.liabilityMatrix.map((r) => [...r])],
				shock: [...this.shock],
				valueFunc: this.valueFunc,
			})
			this.equityOuts = results[0]
			this.effectiveValues = results[1]
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
			if (this.extAssets.length <= 1) return
			this.updating = true
			this.extLiabilities.pop()
			this.shock.pop()
			this.liabilityMatrix.pop()
			this.liabilityMatrix.forEach((row) => row.pop())
			this.updating = false
			this.extAssets.pop()
		},
		async timeModel() {
			const results = {} as Record<number, number>
			for (let nodes = 50; nodes < 1000; nodes += 50) {
				const randInputs = randomiseInputs(nodes)

				const t1 = performance.now()
				for (let i = 0; i < 100; i++) {
					await worker.send({
						extAssets: [...randInputs.extAssets],
						extLiabilities: [...randInputs.extLiabilities],
						liabilityMatrix: [...randInputs.liabilityMatrix.map((r) => [...r])],
						shock: [...randInputs.shock],
						valueFunc: 'Distress',
					})
				}
				const t2 = performance.now()
				results[nodes] = t2 - t1
				console.log(nodes, t2 - t1)
			}
			console.log(results)
		},
	},
})
