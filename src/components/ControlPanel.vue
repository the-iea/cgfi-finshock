<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLabels } from '@/lib/labels'
import { useStore } from '@/store/store'

const $l = useLabels()
const store = useStore()

const route = useRoute()

onMounted(async () => {
	console.log(import.meta.env)
	console.log(
		store.liabilityMatrix[store.selectedNode][0],
		store.liabilityMatrix,
	)
})
</script>

<template>
	<div class="controls">
		<div class="control">
			<label for="node">{{ $l.selNode }}</label>
			<select class="ui" id="node" v-model="store.selectedNode">
				<option v-for="i in store.nNodes" :key="i" :value="i - 1">
					{{ i - 1 }}
				</option>
			</select>
			<button class="addremove" @click="store.addNode">+</button>
			<button class="addremove" @click="store.removeNode">-</button>
		</div>
		<div class="control">
			<p>
				{{ $l.equityIs }}:
				{{ store.equityOuts[store.modelI][store.selectedNode].toFixed(3) }}
			</p>
		</div>
		<!-- <div class="spacer"></div> -->
		<div class="control">
			<label> </label>
			<label> Owes</label>
			<label> Owed by</label>
		</div>
		<div
			class="control"
			v-for="i in store.nNodes"
			:key="i"
			v-show="i - 1 != store.selectedNode"
		>
			<label :for="'owes' + i"> {{ i - 1 }}</label>
			<input
				class="ui"
				:id="'owes' + i"
				type="number"
				min="0"
				step="10"
				v-model="store.liabilityMatrix[store.selectedNode][i - 1]"
			/>
			<input
				class="ui"
				:id="'owed' + i"
				type="number"
				min="0"
				step="10"
				v-model="store.liabilityMatrix[i - 1][store.selectedNode]"
			/>
		</div>
		<div class="control">
			<label for="shock">{{ $l.shock }}</label>
			<input
				class="ui"
				id="shock"
				type="number"
				step="10"
				v-model="store.shock[store.selectedNode]"
			/>
		</div>
		<div class="control">
			<label for="extAsset">{{ $l.extAsset }}</label>
			<input
				class="ui"
				id="extAsset"
				type="number"
				min="0"
				step="10"
				v-model="store.extAssets[store.selectedNode]"
			/>
		</div>
		<div class="control">
			<label for="extLiability">{{ $l.extLiability }}</label>
			<input
				class="ui"
				id="extLiability"
				type="number"
				min="0"
				step="10"
				v-model="store.extLiabilities[store.selectedNode]"
			/>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/styles/scssVars.scss';

.controls {
	display: flex;
	flex-direction: column;
	overflow-y: scroll;

	.control {
		display: flex;
		flex-direction: row;

		label {
			flex: 1 0 30%;
		}

		.ui {
			flex: 1 1 100%;
		}
	}

	.spacer {
		flex: 1 1 100%;
	}

	button.addremove {
		flex: 0 0 1.75rem;
		height: 1.75rem;
		align-self: center;
		// border-radius: 0;
		margin: 0;
	}
}
</style>
