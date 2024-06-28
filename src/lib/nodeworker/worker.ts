import { IntVal } from '@/lib/model'
import registerPromiseWorker from 'promise-worker/register'

let state = 0

registerPromiseWorker((message: any) => {
	console.log('Worker received message:', message)
	console.log('State is:', state++)
	const { Lrow, Lcol, Ae, Le, X, OEi, k, R, a, b, effVals } = message
	let OIntValI = IntVal(Lrow, Le, OEi, k, R, a, b)
	// The definition of the new value for equity is:
	//
	// External assets - external liabilities
	// Plus assets from other nodes (liabilities in the L-matrix), multiplied by the effective value of that node
	// Minus the liabilities to other nodes.
	let Ei =
		Ae -
		X +
		Lcol.reduce((s: number, v: number, i: number) => s + v * effVals[i], 0) -
		Lrow.reduce((s: number, v: number) => s + v, 0) -
		Le
	return { OIntValI, Ei }
})
