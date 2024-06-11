<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLabels } from '@/lib/labels'
import { useStore } from '@/store/store'
import Chart from '@/components/Chart.vue'

const $l = useLabels()
const store = useStore()

const route = useRoute()

onMounted(async () => {
	console.log(import.meta.env)
	console.log(route)
})
</script>

<template>
	<div class="main">
		<h1>{{ $l.mainTitle }}</h1>
		<p>Information from the store: {{ store.value }}</p>
		<Chart></Chart>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/styles/scssVars.scss';

.main {
	display: flex;
	flex-direction: column;
}
</style>
