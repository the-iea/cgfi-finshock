<script setup lang="ts">
import { onMounted, ref, Ref, computed, watch } from 'vue'
import { useStore } from '@/store/store'
// import { scaleLinear } from 'd3'
import * as d3 from 'd3'
import { runModel } from '@/lib/model'

const store = useStore()
const results = runModel(
	store.extAssets,
	store.extLiabilities,
	store.liabilityMatrix,
	store.shock,
)
const equityOuts = results.eqVals
const effectiveVals = results.effectiveAssetVals
console.log(
	'model run',
	equityOuts[0].map((val, i) => val - equityOuts[equityOuts.length - 1][i]),
	equityOuts,
	effectiveVals,
)

const gradTo = 'red'
const gradFrom = 'darkturquoise'

let resultI = 0
const equities = equityOuts[resultI].map((equity: number) => {
	return {
		value: equity,
	}
})
const maxVal = Math.max(...equities.map((e) => e.value))
let sim
const clicky = () => {
	console.log(resultI, equityOuts.length)
	resultI = (resultI + 1) % equityOuts.length
	equities.forEach((equity, i) => {
		equity.value = equityOuts[resultI][i]
	})
	sim.nodes(equities)
	// draw()
}

const chartRef = ref(null) as unknown as Ref<HTMLElement>

const width = ref(0)
const height = ref(0)
const margin = ref({
	top: 20,
	right: 20,
	bottom: 20,
	left: 20,
})

function setSizes(resizing: boolean) {
	if (!resizing) {
		return
	}
	// getBoundingClientRect since some browsers (eg FireFox) have 0 clientWidth/clientHeight
	if (chartRef) {
		let rect = chartRef.value.getBoundingClientRect()
		width.value = rect.width - margin.value.left - margin.value.right
		height.value = rect.height - margin.value.top - margin.value.bottom
	}
	draw()
}

const links: any[] = []
let maxLink = 0
store.liabilityMatrix.forEach((row, i) =>
	row.forEach((l, j) => {
		if (l == 0) {
			return
		}
		if (l > maxLink) {
			maxLink = l
		}
		links.push({
			source: i,
			target: j,
			value: l,
			from: i >= j,
		})
	}),
)
maxLink /= 3

function drag(simulation: any): any {
	function dragstarted(event: any) {
		if (!event.active) simulation.alphaTarget(0.3).restart()
		event.subject.fx = event.subject.x
		event.subject.fy = event.subject.y
	}

	function dragged(event: any) {
		event.subject.fx = event.x
		event.subject.fy = event.y
	}

	function dragended(event: any) {
		if (!event.active) simulation.alphaTarget(0)
		event.subject.fx = null
		event.subject.fy = null
	}

	return d3
		.drag()
		.on('start', dragstarted)
		.on('drag', dragged)
		.on('end', dragended)
}

function draw() {
	const transitionDuration = 5000
	const resizing = false
	// Draws the bars, transitioning if it's an update
	const graphContainer = d3.select(chartRef.value).select('#graph')
	const sizefunc = (d) => 5 + (Math.abs(d.value) * 10) / maxVal
	// const distfunc = (d) => {
	// 	// console.log(d, i, effectiveVals, effectiveVals[0])
	// 	return (30 * maxLink) / (d.value * effectiveVals[resultI][d.source.index])
	// }
	const strengthfunc = (d) => {
		return d.value / maxLink
	}

	function ticked() {
		// link
		// 	.attr('x1', (d) => d.source.x)
		// 	.attr('y1', (d) => d.source.y)
		// 	.attr('x2', (d) => d.target.x)
		// 	.attr('y2', (d) => d.target.y)

		link.attr('d', (d) => {
			const dx = d.target.x - d.source.x
			const dy = d.target.y - d.source.y
			const dr = 5 * Math.sqrt(dx * dx + dy * dy)

			return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`
		})

		node.attr('cx', (d) => d.x).attr('cy', (d) => d.y)
	}

	const simulation = d3
		.forceSimulation(equities)
		.force(
			'link',
			d3
				.forceLink(links)
				.strength(strengthfunc)
				.distance((d) => 300),
		)
		// .force('charge', d3.forceManyBody())
		.force('center', d3.forceCenter(width.value / 2, height.value / 2))
		.force('collide', d3.forceCollide().radius(sizefunc))
		.on('tick', ticked)

	const link = graphContainer
		.selectAll('path')
		.data(links)
		.join('path')
		// .attr('stroke', (d) => (d.from ? 'red' : 'blue'))
		.attr('stroke', (d) => (d.from ? 'url(#gradient1)' : 'url(#gradient2)'))
		.attr('stroke-width', (d) => 0.5 + (d.value / maxLink) * 2.5)
		.attr('fill', 'none')

	const node = graphContainer
		.selectAll('circle')
		.data(equities)
		.join('circle')
		.attr('r', sizefunc)
		.attr('fill', (d) => (d.value > 0 ? 'darkturquoise' : 'red'))
		.call(drag(simulation))
	return simulation
}

const dummy = false

watch(
	() => [dummy],
	() => {
		console.log('redrawing')
		draw()
	},
)

onMounted(() => {
	setSizes(true)
	window.addEventListener('resize', () => setSizes(true))
})
</script>

<template>
	<div class="chart">
		<svg class="chart-svg" ref="chartRef">
			<g id="graph" :transform="`translate(${margin.left}, ${margin.top})`"></g>
			<defs>
				<linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" :stop-color="gradTo" />
					<stop offset="100%" :stop-color="gradFrom" />
				</linearGradient>
				<linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" stop-color="purple" />
					<stop offset="100%" stop-color="orange" />
				</linearGradient>
			</defs>
		</svg>
		<button @click="clicky">Click me</button>
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
		// height: 100%;

		.bar {
			fill: $highlight;
			stroke: black;
			stroke: none;
			stroke-width: 0.1;

			&.selected {
				fill: $primary;
			}
		}
	}

	.spacer {
		flex-basis: 0 0 32px;
		background-color: green;
	}
}
</style>
