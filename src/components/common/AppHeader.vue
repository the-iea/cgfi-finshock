<script setup lang="ts">
import { useLabels } from '@/lib/labels'

const $l = useLabels()
// console.log('testing', $l.title)
</script>

<template>
	<header>
		<h1>{{ $l.title }}</h1>
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
}
</style>
