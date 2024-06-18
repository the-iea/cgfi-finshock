// Required packages (need to be installed separately in Node.js environment)
import * as math from 'mathjs'
// import jStat from 'jstat'
import { normal, beta } from 'jstat'

// Colour nodes by valuation function results
// Size nodes by equity

// Helper function for matrix sum along rows
function rowSums(matrix) {
	return matrix.map((row) => row.reduce((sum, val) => sum + val, 0))
}

// Helper function for element-wise operations
function elementWiseOperation(array, callback) {
	return array.map(callback)
}

// Valuation functions
function DeltaDiff(Rcsh, REL, RL, RAInt) {
	return REL + rowSums(RL) - (Rcsh + RAInt)
}

function IntVal(L, EL, OE, k, R, a, b) {
	let Frac = elementWiseOperation(
		OE,
		(val, i) => 1 + val / (rowSums(L)[i] + EL[i]),
	)
	Frac = Frac.map((val) => (isFinite(val) ? val : 0))
	Frac = Frac.map((val) => (isNaN(val) ? 0 : val))
	// console.log(
	// 	'running inval, L',
	// 	L,
	// 	'EL',
	// 	EL,
	// 	'OE',
	// 	OE,
	// 	'k',
	// 	k,
	// 	'R',
	// 	R,
	// 	'a',
	// 	a,
	// 	'b',
	// 	b,
	// 	'Frac',
	// 	Frac,
	// )
	return Frac.map((frac, i) => {
		if (k[i] === 0) {
			return frac >= 1 ? 1 : 0
		} else {
			return (
				(frac >= 1 + k[i] ? 1 : 0) +
				(frac >= 1 && frac < 1 + k[i]
					? 1 - R * beta.cdf((1 + k[i] - frac) / k[i], a, b)
					: 0)
			)
		}
	})
}

function Merton(Ae, OE2, R, vol, maturity) {
	let lev = OE2.map((val, i) => val / Ae[i])

	let vals = lev.map((lev) => {
		return lev >= 1
			? 1
			: normal.cdf(
					(Math.log(1 / (1 - lev)) - (Math.pow(vol, 2) * maturity) / 2) /
						(vol * Math.sqrt(maturity)),
					0,
					1,
				)
	})

	const ret = vals.map((val) => 1 - R * (1 - val))
	return ret
}

function BlackCox(ExtA, OE2, R, vol, maturity) {
	let Lev = OE2.map((val, i) => val / ExtA[i])
	let Val = Lev.map((lev) => {
		if (lev >= 1) return 1
		if (lev >= 0 && lev < 1) {
			let part1 = normal.cdf(
				(Math.log(1 / (1 - lev)) - (Math.pow(vol, 2) * maturity) / 2) /
					(vol * Math.sqrt(maturity)),
				0,
				1,
			)
			let part2 =
				(1 / (1 - lev)) *
				normal.cdf(
					(-Math.log(1 / (1 - lev)) - Math.pow(vol, 2) * maturity) /
						(vol * Math.sqrt(maturity)),
					0,
					1,
				)
			return part1 - part2
		}
		return 0
	})

	return Val.map((val) => 1 - R * (1 - val))
}

// Main function
function iterateModel(Ae, X, L, Le, R, k, a, b, EVol, Type, Time) {
	/*
	 * Ae: External assets
	 * X: Shock
	 * L: Liabilities matrix
	 * Le: External liabilities
	 */
	const eqVals = []
	const effectiveAssetVals = []
	let E = Ae.map(
		(val, i) => val + rowSums(math.transpose(L))[i] - rowSums(L)[i] - Le[i],
	)
	// console.log('E', E)
	let OIntVal = new Array(L.length).fill(1)

	// eqVals stores the successive steps in the model run.
	// So we push E(0) to eqVals
	eqVals.push([...E])
	effectiveAssetVals.push([...OIntVal])

	// Now calculate E(1) and push it to eqVals
	E = Ae.map(
		(val, i) =>
			val - X[i] + rowSums(math.transpose(L))[i] - rowSums(L)[i] - Le[i],
	)

	eqVals.push([...E])

	let iteration = 0
	const max_iterations = 5000
	let OE = new Array(E.length).fill(1e9)

	// Now we iterate until convergence or max_iterations
	// Each time step we re-assess the relative values of the nodes
	// This valuation provides the basis for reassesssing the equity values of each node
	while (
		!E.every((val, i) => Math.abs(val - OE[i]) < 1e-6) &&
		iteration < max_iterations
	) {
		OE = [...E]
		if (Type === 'Distress') {
			OIntVal = IntVal(L, Le, OE, k, R, a, b)
		} else if (Type === 'Merton') {
			OIntVal = Merton(Ae, OE, R, EVol, Time)
		} else if (Type === 'Black') {
			OIntVal = BlackCox(Ae, OE, R, EVol, Time)
		} else {
			throw new Error('Unknown Type specified.')
		}
		effectiveAssetVals.push([...OIntVal])

		// The definition of the new value for equity is:
		//
		// External assets - external liabilities
		// Plus assets from other nodes (liabilities in the L-matrix), multiplied by the effective value of that node
		// Minus the liabilities to other nodes.
		E = Ae.map(
			(val, i) =>
				val -
				X[i] +
				math
					.transpose(L)
					[i].reduce((sum, val, j) => sum + val * OIntVal[j], 0) -
				rowSums(L)[i] -
				Le[i],
		)
		eqVals.push([...E])
		// console.log(Le)
		iteration++
	}
	// Once more, so we can save the final effective asset values
	OE = [...E]
	if (Type === 'Distress') {
		OIntVal = IntVal(L, Le, OE, k, R, a, b)
	} else if (Type === 'Merton') {
		OIntVal = Merton(Ae, OE, R, EVol, Time)
	} else if (Type === 'Black') {
		OIntVal = BlackCox(Ae, OE, R, EVol, Time)
	} else {
		throw new Error('Unknown Type specified.')
	}
	effectiveAssetVals.push([...OIntVal])

	if (iteration >= max_iterations) {
		console.warn('Maximum iterations reached without convergence.')
	}

	return { eqVals, effectiveAssetVals }
}

export function getEquities(extAssets, extLiabilities, liabilityMatrix) {
	return extAssets.map(
		(val, i) =>
			val +
			rowSums(math.transpose(liabilityMatrix))[i] -
			rowSums(liabilityMatrix)[i] -
			extLiabilities[i],
	)
}

export function runModel(
	extAssets,
	extLiabilities,
	liabilityMatrix,
	shock,
	type = 'Distress',
	R = 1,
	a = 1,
	b = 1,
	eVol = 0.5,
	time = 5,
) {
	// Initial equity
	const E0 = getEquities(extAssets, extLiabilities, liabilityMatrix)
	const k0 = E0.map(
		(val, i) => val / (rowSums(liabilityMatrix)[i] + extLiabilities[i]),
	) // capital cushion (distress function)

	return iterateModel(
		extAssets,
		shock,
		liabilityMatrix,
		extLiabilities,
		R,
		k0,
		a,
		b,
		eVol,
		type,
		time,
	)
}

export function toy() {
	// Toy Example
	const extAssets = [20, 10, 10] // external assets
	const shock = [5, 0, 0] // Shock
	const liabilityMatrix = [
		[0, 10, 0],
		[0, 0, 10],
		[0, 0, 0],
	] // liabilities matrix
	const Le = [0, 0, 0] // external liabilities
	const results = runModel(extAssets, shock, liabilityMatrix, Le)

	console.log(
		'model run',
		results[0].map((val, i) => val - results[results.length - 1][i]),
		results,
	) // equity losses from change in initial and last equity
}
