// Required packages (need to be installed separately in Node.js environment)
// import jStat from 'jstat'
// import { normal } from 'jstat'

// Helper function for matrix sum along rows
function rowSum(matrix: number[][], i: number): number {
	let sum: number = 0
	for (let j = 0; j < matrix[i].length; j++) {
		sum += matrix[i][j]
	}
	return sum
}

// Helper function for matrix sum along rows
function colSum(matrix: number[][], j: number): number {
	let sum: number = 0
	for (let i = 0; i < matrix.length; i++) {
		sum += matrix[i][j]
	}
	return sum
}

const erfCof = [
	-1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2,
	-9.561514786808631e-3, -9.46595344482036e-4, 3.66839497852761e-4,
	4.2523324806907e-5, -2.0278578112534e-5, -1.624290004647e-6, 1.30365583558e-6,
	1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9, 5.059343495e-9,
	-9.91364156e-10, -2.27365122e-10, 9.6467911e-11, 2.394038e-12, -6.886027e-12,
	8.94487e-13, 3.13092e-13, -1.12708e-13, 3.81e-16, 7.106e-15, -1.523e-15,
	-9.4e-17, 1.21e-16, -2.8e-17,
]
function erf(x: number) {
	let j = erfCof.length - 1
	let isneg = false
	let d = 0
	let dd = 0
	let t, ty, tmp, res

	if (x < 0) {
		x = -x
		isneg = true
	}

	t = 2 / (2 + x)
	ty = 4 * t - 2

	for (; j > 0; j--) {
		tmp = d
		d = ty * d - dd + cof[j]
		dd = tmp
	}

	res = t * Math.exp(-x * x + 0.5 * (cof[0] + ty * d) - dd)
	return isneg ? res - 1 : 1 - res
}

function normalCDF(x: number): number {
	// Standard normal CDF with mean 0 and standard deviation 1
	return 0.5 * (1.0 + erf(x / Math.sqrt(2.0)))
}

const gammaCof = [
	76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
	0.1208650973866179e-2, -0.5395239384953e-5,
]
function gammaln(x: number) {
	let j = 0
	let ser = 1.000000000190015
	let xx, y, tmp
	tmp = (y = xx = x) + 5.5
	tmp -= (xx + 0.5) * Math.log(tmp)
	for (; j < 6; j++) ser += gammaCof[j] / ++y
	return Math.log((2.5066282746310005 * ser) / xx) - tmp
}

function betacf(x: number, a: number, b: number) {
	let fpmin = 1e-30
	let m = 1
	let qab = a + b
	let qap = a + 1
	let qam = a - 1
	let c = 1
	let d = 1 - (qab * x) / qap
	let m2, aa, del, h

	// These q's will be used in factors that occur in the coefficients
	if (Math.abs(d) < fpmin) d = fpmin
	d = 1 / d
	h = d

	for (; m <= 100; m++) {
		m2 = 2 * m
		aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
		// One step (the even one) of the recurrence
		d = 1 + aa * d
		if (Math.abs(d) < fpmin) d = fpmin
		c = 1 + aa / c
		if (Math.abs(c) < fpmin) c = fpmin
		d = 1 / d
		h *= d * c
		aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
		// Next step of the recurrence (the odd one)
		d = 1 + aa * d
		if (Math.abs(d) < fpmin) d = fpmin
		c = 1 + aa / c
		if (Math.abs(c) < fpmin) c = fpmin
		d = 1 / d
		del = d * c
		h *= del
		if (Math.abs(del - 1.0) < 3e-7) break
	}

	return h
}
function iBeta(x: number, a: number, b: number): number {
	// Factors in front of the continued fraction.
	let bt =
		x === 0 || x === 1
			? 0
			: Math.exp(
					gammaln(a + b) -
						gammaln(a) -
						gammaln(b) +
						a * Math.log(x) +
						b * Math.log(1 - x),
				)
	if (x < 0 || x > 1) throw new Error('Argument x must be between 0 and 1.')
	if (x < (a + 1) / (a + b + 2))
		// Use continued fraction directly.
		return (bt * betacf(x, a, b)) / a
	// else use continued fraction after making the symmetry transformation.
	return 1 - (bt * betacf(1 - x, b, a)) / b
}

function betaCDF(x: number, a: number, b: number): number {
	if (x > 1) return 1
	if (x < 0) return 0
	return iBeta(x, a, b)
}

function IntVal(
	L: number[][],
	EL: number[],
	OE: number[],
	k: number[],
	R: number,
	a: number,
	b: number,
) {
	let frac = new Array(OE.length)
	for (let i = 0; i < OE.length; i++) {
		frac[i] = 1 + OE[i] / (rowSum(L, i) + EL[i])
		if (!isFinite(frac[i]) || isNaN(frac[i])) {
			frac[i] = 0
		}
		if (k[i] === 0) {
			frac[i] = frac[i] >= 1 ? 1 : 0
		} else {
			frac[i] =
				(frac[i] >= 1 + k[i] ? 1 : 0) +
				(frac[i] >= 1 && frac[i] < 1 + k[i]
					? 1 - R * betaCDF((1 + k[i] - frac[i]) / k[i], a, b)
					: 0)
		}
	}
	return frac
}

function Merton(
	Ae: number[],
	OE2: number[],
	R: number,
	vol: number,
	maturity: number,
) {
	const ret = new Array(OE2.length)
	for (let i = 0; i < OE2.length; i++) {
		ret[i] = OE2[i] / Ae[i]
		if (ret[i] >= 1) {
			ret[i] = 1
		} else {
			ret[i] =
				1 -
				R *
					(1 -
						normalCDF(
							(Math.log(1 / (1 - ret[i])) - (vol * vol * maturity) / 2) /
								(vol * Math.sqrt(maturity)),
						))
		}
	}

	return ret
}

function BlackCox(
	ExtA: number[],
	OE2: number[],
	R: number,
	vol: number,
	maturity: number,
) {
	let Lev = OE2.map((val, i) => val / ExtA[i])
	let Val = Lev.map((lev) => {
		if (lev >= 1) return 1
		if (lev >= 0 && lev < 1) {
			let part1 = normalCDF(
				(Math.log(1 / (1 - lev)) - (Math.pow(vol, 2) * maturity) / 2) /
					(vol * Math.sqrt(maturity)),
			)
			let part2 =
				(1 / (1 - lev)) *
				normalCDF(
					(-Math.log(1 / (1 - lev)) - Math.pow(vol, 2) * maturity) /
						(vol * Math.sqrt(maturity)),
				)
			return part1 - part2
		}
		return 0
	})

	return Val.map((val) => 1 - R * (1 - val))
}

// Main function
function iterateModel(
	Ae: number[],
	X: number[],
	L: number[][],
	Le: number[],
	R: number,
	k: number[],
	a: number,
	b: number,
	EVol: number,
	Type: string,
	Time: number,
) {
	/*
	 * Ae: External assets
	 * X: Shock
	 * L: Liabilities matrix
	 * Le: External liabilities
	 */
	const eqVals = []
	const effectiveAssetVals = []
	let E = Ae.map((val, i) => val + colSum(L, i) - rowSum(L, i) - Le[i])

	// eqVals stores the successive steps in the model run.
	// So we push E(0) to eqVals
	eqVals.push([...E])
	effectiveAssetVals.push(new Array(L.length).fill(1))

	// Now calculate E(1) and push it to eqVals
	E = Ae.map((val, i) => val - X[i] + colSum(L, i) - rowSum(L, i) - Le[i])

	eqVals.push([...E])

	let iteration = 0
	const max_iterations = 5000
	let OE = new Array(E.length).fill(1e9)
	let OIntVal: number[]

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

		// 		let result = 0;
		// for (const { a, b } of array) {
		//    result += a + b;
		// }
		// return result;
		E = new Array(E.length)
		for (let i = 0; i < E.length; i++) {
			let effLSum = 0
			let intASum = 0
			for (let j = 0; j < L.length; j++) {
				effLSum += L[j][i] * OIntVal[j]
				intASum += L[i][j]
			}
			E[i] = Ae[i] - X[i] + effLSum - intASum - Le[i]
		}
		// E = Ae.map(
		// 	(val, i) =>
		// 		val -
		// 		X[i] +
		// 		LT[i].reduce((sum, val, j) => sum + val * OIntVal[j], 0) -
		// 		rowSum(L,i) -
		// 		Le[i],
		// )
		// console.log(E, E1)
		eqVals.push([...E])
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

export function getEquities(
	extAssets: number[],
	extLiabilities: number[],
	liabilityMatrix: number[][],
) {
	return extAssets.map(
		(val, i) =>
			val +
			colSum(liabilityMatrix, i) -
			rowSum(liabilityMatrix, i) -
			extLiabilities[i],
	)
}

export function runModel(
	extAssets: number[],
	extLiabilities: number[],
	liabilityMatrix: number[][],
	shock: number[],
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
		(val, i) => val / (rowSum(liabilityMatrix, i) + extLiabilities[i]),
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
