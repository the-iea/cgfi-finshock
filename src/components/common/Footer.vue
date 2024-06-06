<script setup lang="ts">
import { computed } from 'vue'
import { langNames } from '@/lib/labels'

const lang = computed({
	get() {
		return 'en'
	},
	set(value: string) {
		console.warn('Trying to set language - not supported yet')
	},
})
</script>

<template>
	<div class="footer">
		<div class="lang-select">
			<label v-for="(langName, langVal) in langNames">
				<input type="radio" v-model="lang" :value="langVal" />{{ langName }}
			</label>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/styles/scssVars.scss';

.footer {
	padding-top: $gap;
	height: $footerHeight + $gap;
	background-color: $bgContrast;
	display: flex;
	align-items: center;
	justify-content: space-between;
	font-size: 0.75rem;

	.lang-select {
		margin: 0.5rem;
		align-self: center;
		display: flex;

		label {
			margin: 0 1rem;
			font-size: 1rem;
		}
	}
}
</style>
