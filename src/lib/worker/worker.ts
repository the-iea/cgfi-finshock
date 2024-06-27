import { runModel } from '@/lib/model'
import registerPromiseWorker from 'promise-worker/register'

registerPromiseWorker((message: any) => {
	const { extAssets, extLiabilities, liabilityMatrix, shock, valueFunc } =
		message.message

	// Execute runModel() function
	const results = runModel(
		extAssets,
		extLiabilities,
		liabilityMatrix,
		shock,
		valueFunc,
	)

	return results
})
