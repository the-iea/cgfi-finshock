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
	<div class="controls" :class="{ disabled: store.animating }">
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
				class="ui lmat"
				:id="'owes' + i"
				type="number"
				min="0"
				step="10"
				v-model="store.liabilityMatrix[store.selectedNode][i - 1]"
			/>
			<input
				class="ui lmat"
				:id="'owed' + i"
				type="number"
				min="0"
				step="10"
				v-model="store.liabilityMatrix[i - 1][store.selectedNode]"
			/>
		</div>
		<div class="spacer"></div>
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
		<div class="spacer" />
		<div class="control">
			<label for="valueFunc">{{ $l.valueFunc }}</label>
			<select class="ui" id="valueFunc" v-model="store.valueFunc">
				<option value="Distress">Distress</option>
				<option value="Merton">Merton</option>
				<option value="Black">Black</option>
			</select>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@import '@/assets/styles/scssVars.scss';

.controls {
	display: flex;
	flex-direction: column;
	overflow-y: scroll;

	&.disabled {
		pointer-events: none;
		opacity: 0.8;
	}

	.control {
		align-items: center;
		display: flex;
		flex-direction: row;

		label {
			flex: 1 0 20%;
		}

		.ui {
			flex: 1 1 70%;
			min-width: 0;

			&.lmat {
				flex: 1 1 35%;
			}
		}
	}

	.spacer {
		flex: 0 0 1rem;
	}

	button.addremove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		border-radius: 3px;
		background-color: $buttonColor;
		color: $textColor;
		font-size: 1.5rem;
		cursor: pointer;
		transition: background-color 0.3s ease;
		&:hover {
			background-color: #999;
		}
	}
}
</style>
