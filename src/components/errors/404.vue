<script setup lang="ts">
import { useLabels } from '@/lib/labels'

const $l = useLabels()
</script>

<template>
	<div class="e404">
		<h1>{{ $l.e404Title }}</h1>
		<p>{{ $l.e404 }}</p>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/styles/scssVars.scss';

.e404 {
	display: flex;
	flex-direction: column;
}
</style>
