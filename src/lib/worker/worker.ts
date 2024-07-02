import { runModel } from '@/lib/model'
import registerPromiseWorker from 'promise-worker/register'

registerPromiseWorker((message: any) => {
	const {
		extAssets,
		extLiabilities,
		liabilityMatrix,
		shock,
		valueFunc,
		R,
		alpha,
		beta,
		volatility,
		maturity,
	} = message.message

	// Execute runModel() function
	const results = runModel(
		extAssets,
		extLiabilities,
		liabilityMatrix,
		shock,
		valueFunc,
		R,
		alpha,
		beta,
		volatility,
		maturity,
	)

	return results
})
