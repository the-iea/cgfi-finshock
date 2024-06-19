<script setup lang="ts">
import { onMounted, ref, Ref, computed, watch } from 'vue'
import { useStore } from '@/store/store'
import * as d3 from 'd3'

const store = useStore()
store.rerunModel()

const chartRef = ref(null) as unknown as Ref<HTMLElement>

const width = ref(0)
const height = ref(0)
const margin = ref({
	top: 20,
	right: 20,
	bottom: 20,
	left: 20,
})

const totalSteps = store.equityOuts.length
const stepLength = computed(() => {
	// return 10000 // store.equityOuts.length
	const maxStepLength = 500 // maximum step length for the first iteration
	const minStepLength = 50 // minimum step length for the final iteration

	// Exponential decay formula
	const stepLength =
		maxStepLength * Math.exp(-2.5 * ((store.modelI - 1) / totalSteps))

	// Ensure step length is not below the minimum step length
	return Math.max(stepLength, minStepLength)
})

const maxEquity = Math.max(...store.equityOuts[store.modelI])
const maxEquityBarHeight = computed(
	() => Math.min(width.value, height.value) * 0.25,
)
const eScale = d3
	.scaleLinear()
	.domain([0, maxEquity])
	.range([0, maxEquityBarHeight.value])

const allColors = [
	...d3.schemeSet3,
	...d3.schemeTableau10,
	...d3.schemeSet1,
	...d3.schemeDark2,
]
const color = (index: number) => allColors[index % allColors.length]

const startAnimation = () => {
	if (store.animating) {
		store.animating = false
		return
	}

	store.animating = true

	const runFunc = () => {
		if (!store.animating) return

		store.modelI++
		if (store.modelI >= store.equityOuts.length - 1) {
			setTimeout(() => {
				store.modelI = 0
				draw()
				store.animating = false
			}, stepLength.value * 5)
		} else {
			draw()
			setTimeout(runFunc, stepLength.value)
		}
	}
	runFunc()
}

function setSizes(resizing: boolean) {
	if (!resizing) {
		return
	}
	if (chartRef) {
		let rect = chartRef.value.getBoundingClientRect()
		width.value = rect.width - margin.value.left - margin.value.right
		height.value = rect.height - margin.value.top - margin.value.bottom
	}
}

const innerRadius = computed(
	() => Math.min(width.value, height.value) * 0.25 - 5,
)
const chord = d3
	.chordDirected()
	.sortSubgroups(() => 0)
	.sortChords(d3.descending)
const gap = 4
const arc = d3
	.arc()
	.innerRadius(() => innerRadius.value)
	.outerRadius(
		(_, i) =>
			Math.max(0, eScale(store.equityOuts[store.modelI][i])) +
			innerRadius.value +
			gap,
	)
const ribbon = d3
	.ribbonArrow()
	.radius(() => innerRadius.value - 0.5)
	.padAngle(() => 3 / (innerRadius.value * store.nNodes))

const shockArc = d3
	.arc()
	.innerRadius((_, i) =>
		store.shock[i] >= 0
			? Math.max(0, eScale(0.1 + store.equityOuts[0][i] - store.shock[i])) +
				innerRadius.value +
				gap
			: Math.max(0, eScale(store.equityOuts[store.modelI][i])) +
				innerRadius.value +
				gap,
	)
	.outerRadius((_, i) =>
		store.shock[i] >= 0
			? Math.max(0, eScale(store.equityOuts[store.modelI][i])) +
				innerRadius.value +
				gap
			: Math.max(0, eScale(0.1 + store.equityOuts[0][i] - store.shock[i])) +
				innerRadius.value +
				gap,
	)
	.startAngle((d) => d.startAngle)
	.endAngle((d) => d.endAngle)

const fillFunc = (d: any) => {
	if (store.equityOuts[store.modelI][d.index] < 0) {
		return '#df2828'
	} else {
		return color(d.index)
	}
}
const shockFillFunc = (_: any, i: number) => {
	if (store.modelI < 3) {
		if (store.shock[i] > 0) return '#df2828'
		if (store.shock[i] < 0) return '#28df28'
	}
	return 'none'
}

let chords: d3.Chords
function draw() {
	const graphContainer = d3.select(chartRef.value).select('#graph')
	graphContainer.attr(
		'transform',
		`translate(${width.value / 2}, ${height.value / 2})`,
	)

	eScale.range([0, maxEquityBarHeight.value])
	chord.padAngle(12 / (innerRadius.value * store.nNodes))

	chords = chord(store.liabilityMatrix)
	chords.forEach((chord) => {
		// Now go through and reduce the target angle spans, such that the
		// end of the arrow represents the *effective* value of the liability
		const t = chord.target
		let tspan = t.endAngle - t.startAngle
		if (tspan < 0) {
			tspan += 2 * Math.PI
		}
		const tdiff =
			(1.0 - store.effectiveValues[store.modelI][chord.source.index]) * tspan
		t.startAngle += tdiff / 2
		t.endAngle -= tdiff / 2
		if (t.endAngle < 0) {
			t.endAngle += 2 * Math.PI
		}
		if (t.startAngle > 2 * Math.PI) {
			t.startAngle -= 2 * Math.PI
		}
	})

	graphContainer
		.datum(chords)
		.selectAll('path.chord')
		.data(
			(chords) => chords,
			(d: any) => d.source.index + '-' + d.target.index,
		)
		.join(
			(enter) =>
				enter
					.append('path')
					.classed('chord', true)
					.attr('fill', (d) => color(d.source.index))
					// @ts-ignore
					.attr('d', ribbon)
					.on('click', (e, d) => {
						store.selectedNode = d.source.index
					})
					.call((enter) =>
						enter
							.append('title')
							.text(
								(d) =>
									`${d.source.index} owes ${d.target.index} ${d.source.value}`,
							),
					),
			(update) =>
				update
					.attr('fill', (d) => color(d.source.index))
					.call((update) =>
						update
							.transition()
							.duration(stepLength.value / 3)
							// @ts-ignore
							.attr('d', ribbon),
					),
		)

	const g = graphContainer.select('#bars')
	g.selectAll('path.bar')
		.data(chords.groups)
		.join(
			(enter) =>
				enter
					.append('path')
					.attr(
						'd',
						arc as unknown as d3.ValueFn<SVGPathElement, d3.ChordGroup, string>,
					)
					.classed('bar', true)
					.classed('highlight', (d) => d.index == store.selectedNode)
					.attr('fill', fillFunc)
					.on('click', (e, d) => (store.selectedNode = d.index))
					.append('title')
					.text(
						(d) =>
							`${d.index} has ${store.equityOuts[store.modelI][d.index]} equity`,
					),
			(update) =>
				update
					.transition()
					.duration(stepLength.value / 3)
					.attr('fill', fillFunc)
					// @ts-ignore
					.attr('d', arc)
					.select('title')
					.text(
						(d) =>
							`${d.index} has ${store.equityOuts[store.modelI][d.index]} equity`,
					),
		)
	g.selectAll('path.shockbar')
		.data(chords.groups)
		.join(
			(enter) =>
				enter
					.append('path')
					.attr(
						'd',
						shockArc as unknown as d3.ValueFn<
							SVGPathElement,
							d3.ChordGroup,
							string
						>,
					)
					.classed('shockbar', true)
					.attr('fill', shockFillFunc)
					.on('click', (e, d) => (store.selectedNode = d.index)),
			(update) =>
				update
					.transition()
					.duration(stepLength.value / 3)
					// @ts-ignore
					.attr('d', shockArc)
					.transition()
					.delay(stepLength.value / 3)
					.attr('fill', shockFillFunc),
		)
}

function drawHighlight() {
	const graphContainer = d3.select(chartRef.value).select('#graph')
	const g = graphContainer.select('#bars')

	g.selectAll('path.bar')
		.data(chords.groups)

		.join(
			(enter) => enter,
			(update) =>
				update.classed('highlight', (d) => d.index == store.selectedNode),
		)
}

watch(
	() => [store.equities, ...store.shock],
	() => {
		if (!store.updating) {
			console.log('Rerunning model')
			store.rerunModel()
			draw()
		}
	},
)
watch(
	() => store.selectedNode,
	() => {
		drawHighlight()
	},
)
onMounted(() => {
	setSizes(true)
	draw()
	window.addEventListener('resize', () => {
		setSizes(true)
		draw()
	})
})
</script>

<template>
	<div class="chart" ref="chartRef">
		<svg class="chart-svg">
			<g id="graph">
				<g id="bars"></g>
			</g>
			<!-- <g id="legend">
				<text x="10" :y="height - 20" fill="white">
					Step {{ store.modelI + 1 }} / {{ store.equityOuts.length }}
				</text>
			</g> -->
		</svg>
		<div class="buttons">
			<p class="label">
				Step {{ store.modelI + 1 }} / {{ store.equityOuts.length }}
			</p>
			<button
				@click="
					() => {
						store.modelI = 0
						draw()
					}
				"
			>
				⏮
			</button>
			<button
				@click="
					() => {
						store.prevModelI()
						draw()
					}
				"
			>
				⏴⏴
			</button>
			<button @click="startAnimation">
				{{ store.animating ? '⏸' : '⏵' }}
			</button>
			<button
				@click="
					() => {
						store.nextModelI()
						draw()
					}
				"
			>
				⏵⏵
			</button>
			<button
				@click="
					() => {
						store.modelI = store.equityOuts.length - 1
						draw()
					}
				"
			>
				⏭
			</button>
		</div>
		<div class="info"></div>
	</div>
</template>

<style lang="scss">
@import '@/assets/styles/scssVars.scss';

.chart {
	display: flex;
	flex-direction: column;
	height: 100%;

	.chart-svg {
		flex: 1 1 100%;
		background-color: $bgContrast;
		height: 100%;

		.shockbar,
		.bar,
		.chord {
			fill-opacity: 0.75;
			stroke: none;
			// }

			// .shockbar,
			// .bar {
			cursor: pointer;

			&.highlight {
				fill-opacity: 0.85;
			}
		}
		.bar.highlight {
			stroke-width: 1px;
			stroke: white;
		}
	}

	.spacer {
		flex-basis: 0 0 32px;
		background-color: green;
	}

	.buttons {
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;

		.label {
			position: absolute;
			left: 1rem;
		}

		button {
			flex: 0 1 10%;
			height: 3rem;
			font-size: 1.5rem;
			color: white;
			border: none;
			cursor: pointer;

			&:hover {
				background-color: $bg;
			}
		}
	}
}
</style>
