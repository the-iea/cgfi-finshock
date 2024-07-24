import { getEquities } from '@/lib/model'
import worker from '@/lib/worker'
import Papa from 'papaparse'
import { defineStore } from 'pinia'

export type Scenario = 'emergent' | 'simple'

export interface State {
	nodeIds: string[] | null
	nodeGroups: string[] | null
	extAssets: number[]
	extLiabilities: number[]
	shock: number[]
	liabilityMatrix: number[][]
	valueFunc: 'Distress' | 'Merton' | 'Black'
	R: number
	alpha: number
	beta: number
	volatility: number
	maturity: number
	selectedNode: number
	selectedLiability: { to: number; from: number } | null
	equityOuts: number[][]
	effectiveValues: number[][]
	modelI: number
	animating: boolean
	lang: string
	loadingCount: number
	updating: boolean
	tutorialOn: boolean
	selectedScenario: Scenario
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
export const transpose = (matrix: any[][]) =>
	matrix[0].map((_, col) => matrix.map((row) => row[col]))

const randomiseInputs = (nodes: number) => {
	const extAssets = []
	const extLiabilities = []
	const shock = []
	const liabilityMatrix = []
	for (let i = 0; i < nodes; i++) {
		extAssets.push(30 + getRand() * 50)
		extLiabilities.push(0)
		shock.push(getRand() < 3 / nodes ? getRand() * 50 : 0)
		const lRow = []
		for (let j = 0; j < nodes; j++) {
			if (i != j && getRand() < 10 / nodes) lRow.push(getRand() * 10)
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

		const randInputs = randomiseInputs(50)
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
		// shock = [50, 0, 0, 0, 0, 0]
		// liabilityMatrix = [
		// 	[0, 50, 70, 0, 0, 0],
		// 	[0, 0, 50, 70, 0, 0],
		// 	[0, 0, 0, 50, 70, 0],
		// 	[0, 0, 0, 0, 50, 70],
		// 	[70, 0, 0, 0, 0, 50],
		// 	[50, 70, 0, 0, 0, 0],
		// ]

		const s: State = {
			nodeIds: null,
			nodeGroups: null,
			extAssets,
			extLiabilities,
			shock,
			liabilityMatrix,
			equityOuts: [],
			effectiveValues: [],
			valueFunc: 'Distress',
			R: 1,
			alpha: 1,
			beta: 1,
			volatility: 0.5,
			maturity: 5,
			selectedNode: 0,
			selectedLiability: { to: 1, from: 0 },
			modelI: 0,
			animating: false,
			loadingCount: 0,
			lang: 'en',
			updating: false,
			tutorialOn: false,
			selectedScenario: 'emergent',
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
				R: this.R,
				alpha: this.alpha,
				beta: this.beta,
				volatility: this.volatility,
				maturity: this.maturity,
			})
			this.equityOuts = results[0]
			this.effectiveValues = results[1]
			if (this.modelI >= this.equityOuts.length)
				this.modelI = this.equityOuts.length - 1
			this.setLoadingDone()
		},
		addNode() {
			this.updating = true
			if (this.nodeIds !== null) {
				this.nodeIds.push('')
			}
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
			if (this.nodeIds !== null) {
				this.nodeIds.pop()
			}
			this.extLiabilities.pop()
			this.shock.pop()
			this.liabilityMatrix.pop()
			this.liabilityMatrix.forEach((row) => row.pop())
			this.updating = false
			this.extAssets.pop()
		},
		importData() {
			const reader = new FileReader()
			const input = document.createElement('input')
			input.type = 'file'
			input.onchange = (event) => {
				// @ts-ignore
				const file = event.target.files[0]
				// You can now use the `file` object as needed
				Papa.parse(file, {
					delimiter: ',',
					header: false,
					skipEmptyLines: true,
					dynamicTyping: true,
					// transformHeader: (header, i) => {
					// 	if (i > 3) {
					// 		return `_${i - 4}`
					// 	}
					// 	return header.trim()
					// },
					complete: (results) => {
						this.updating = true
						this.nodeIds = []
						this.nodeGroups = []
						this.extAssets = []
						this.extLiabilities = []
						this.shock = []
						this.liabilityMatrix = []
						for (let line of results.data as any[][]) {
							this.nodeIds.push(line[0])
							this.nodeGroups.push(line[1])
							this.extAssets.push(line[2])
							this.extLiabilities.push(line[3])
							this.shock.push(0)
							const lRow = []
							for (let i = 4; i < line.length; i++) {
								lRow.push(line[i])
							}
							this.liabilityMatrix.push(lRow)
						}
						this.liabilityMatrix = transpose(this.liabilityMatrix)
						console.log(
							this.extAssets,
							this.extLiabilities,
							this.liabilityMatrix,
							this.nodeIds,
						)
						this.updating = false
					},
				})
			}
			input.click()
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
		selectScenario(scenario: Scenario) {
			this.selectedScenario = scenario
			if (scenario == 'emergent') {
				this.extAssets = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
				this.extLiabilities = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
				this.shock = [0, 0, 0, 0, 0, 0, 0, 0, 0, 90]
				this.liabilityMatrix = [
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
			} else if (scenario == 'simple') {
				this.extAssets = [100, 100, 100, 100, 100, 100]
				this.extLiabilities = [0, 0, 0, 0, 0, 0]
				this.shock = [50, 0, 0, 0, 0, 0]
				this.liabilityMatrix = [
					[0, 50, 70, 0, 0, 0],
					[0, 0, 50, 70, 0, 0],
					[0, 0, 0, 50, 70, 0],
					[0, 0, 0, 0, 50, 70],
					[70, 0, 0, 0, 0, 50],
					[50, 70, 0, 0, 0, 0],
				]
			}
		},
	},
})
