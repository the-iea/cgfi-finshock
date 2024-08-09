<script setup lang="ts">
import { useLabels, getTutorial } from '@/lib/labels'
import { useStore } from '@/store/store'
import { useShepherd } from 'vue-shepherd'

const $l = useLabels()
// console.log('testing', $l.title)
const store = useStore()

const tour = useShepherd({
	useModalOverlay: true,
})
const startTutorial = () => {
	tour.addSteps(getTutorial(tour, store, false))

	tour.start()
}
</script>

<template>
	<header>
		<h1>{{ $l.title }}</h1>
		<button @click="startTutorial">{{ $l.tutorial }}</button>
		<!-- <div id="header-menu">
			<router-link :to="{ name: 'Main' }">{{ $l.main }}</router-link>
		</div> -->
	</header>
</template>

<style scoped lang="scss">
@import '@/assets/styles/scssVars.scss';

header {
	width: 100%;
	display: flex;
	align-items: center;
	background-color: $bgContrast;
	margin-bottom: $gap;
	justify-content: space-between;

	button {
		margin-top: 0.125rem;
		margin-bottom: 0.125rem;
		// height: 0.5rem;
		padding: 0.5rem 1rem;
	}
}
</style>
