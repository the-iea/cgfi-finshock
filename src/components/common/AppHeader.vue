<script setup lang="ts">
import { useLabels } from '@/lib/labels'

const $l = useLabels()
// console.log('testing', $l.title)
</script>

<template>
	<header>
		<div id="header-title">{{ $l.title }}</div>
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
	padding-bottom: $gap;

	#header-title {
		font-size: 2rem;
		font-weight: 900;
		color: $primary;
		margin-left: 1rem;
	}
	#header-menu {
		margin-left: auto;
		margin-right: 1rem;
		display: flex;

		a {
			margin: 0 1rem;
			font-size: 1.2rem;
			text-decoration: none;

			&.router-link-active {
				color: $primary;
				cursor: default;
			}
		}
	}
}
</style>
