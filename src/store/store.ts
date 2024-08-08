import { getEquities } from '@/lib/model'
import worker from '@/lib/worker'
import Papa from 'papaparse'
import { defineStore } from 'pinia'

export type Scenario = {
	name: string
	extAssets: number[]
	extLiabilities: number[]
	shock: number[]
	liabilityMatrix: number[][]
	nodeGroups?: string[]
}

export interface State {
	nodeIds: string[] | null
	nodeGroups: string[] | null
	extAssets: number[]
	extLiabilities: number[]
	shock: number[]
	liabilityMatrix: number[][]
	valueFunc: 'Distress' | 'Merton' | 'Black'
	R: number
	alpha: number
	beta: number
	volatility: number
	maturity: number
	selectedNode: number
	selectedLiability: { to: number; from: number } | null
	equityOuts: number[][]
	effectiveValues: number[][]
	modelI: number
	animating: boolean
	lang: string
	loadingCount: number
	updating: boolean
	choosingScenario: boolean
}

function mulberry32(a: number) {
	return function () {
		let t = (a += 0x6d2b79f5)
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

const getRand = mulberry32(123)
export const transpose = (matrix: any[][]) =>
	matrix[0].map((_, col) => matrix.map((row) => row[col]))

const randomiseInputs = (nodes: number) => {
	const extAssets = []
	const extLiabilities = []
	const shock = []
	const liabilityMatrix = []
	for (let i = 0; i < nodes; i++) {
		extAssets.push(Math.round(30 + getRand() * 50))
		extLiabilities.push(0)
		shock.push(Math.round(getRand() < 3 / nodes ? getRand() * 50 : 0))
		const lRow = []
		for (let j = 0; j < nodes; j++) {
			if (i != j && getRand() < 5 / nodes) lRow.push(Math.round(getRand() * 10))
			else lRow.push(0)
		}
		liabilityMatrix.push(lRow)
	}
	return { extAssets, extLiabilities, shock, liabilityMatrix }
}

export const scenarios: any = {
	simple: {
		name: 'Simple',
		extAssets: [100, 100, 100, 100, 100, 100],
		extLiabilities: [0, 0, 0, 0, 0, 0],
		shock: [50, 0, 0, 0, 0, 0],
		liabilityMatrix: [
			[0, 50, 70, 0, 0, 0],
			[0, 0, 50, 70, 0, 0],
			[0, 0, 0, 50, 70, 0],
			[0, 0, 0, 0, 50, 70],
			[70, 0, 0, 0, 0, 50],
			[50, 70, 0, 0, 0, 0],
		],
	},
	emergent: {
		name: 'Cyclical',
		extAssets: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100],
		extLiabilities: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		shock: [0, 0, 0, 0, 0, 0, 0, 0, 0, 90],
		liabilityMatrix: [
			[0, 51, 0, 0, 0, 20, 50, 0, 0, 0],
			[0, 0, 50, 0, 0, 0, 0, 0, 0, 0],
			[0, 50, 0, 50, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 50, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 50, 0, 50, 0, 0],
			[0, 0, 0, 0, 0, 0, 30, 50, 50, 0],
			[0, 0, 0, 0, 0, 0, 0, 50, 50, 50],
			[0, 0, 0, 0, 0, 0, 0, 0, 50, 50],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 50],
			[50, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		],
	},
	fragileMD: {
		name: 'Fragile - Minimum Density',
		nodeGroups: [
			'Group1',
			'Group1',
			'Group1',
			'Group2',
			'Group2',
			'Group2',
			'Group3',
			'Group3',
			'Group4',
			'Group4',
			'Group4',
			'Group5',
			'Group5',
			'Group5',
			'Group6',
			'Group6',
			'Group6',
			'Group6',
		],
		extAssets: [
			173, 77, 90, 162, 0, 147, 126, 79, 126, 147, 89, 80, 84, 70, 45, 48, 64,
			176,
		],
		extLiabilities: [
			142, 36, 74, 131, 7, 80, 101, 78, 56, 73, 33, 64, 47, 46, 10, 37, 24, 148,
		],
		shock: [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		liabilityMatrix: [
			[0, 0, 91, 0, 0, 0, 59, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 6, 0, 53, 0, 0, 12, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 77, 13, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 116, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 38, 0, 16, 0, 0, 0, 0, 0, 0, 0, 0, 61, 54, 13, 0],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 131, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 66, 0],
			[0, 0, 0, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 150],
			[96, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 0, 40, 0, 0, 0, 0, 103, 0, 0, 0, 0],
			[0, 71, 0, 0, 0, 0, 0, 0, 22, 50, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 103, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 61, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 54, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 26, 0, 0, 0, 0, 0, 53, 0, 0, 0, 0, 0, 0, 0],
			[54, 0, 0, 0, 0, 0, 49, 0, 46, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		],
	},
	fragileME: {
		name: 'Fragile - Maximum Entropy',
		nodeGroups: [
			'Group1',
			'Group1',
			'Group1',
			'Group2',
			'Group2',
			'Group2',
			'Group3',
			'Group3',
			'Group4',
			'Group4',
			'Group4',
			'Group5',
			'Group5',
			'Group5',
			'Group6',
			'Group6',
			'Group6',
			'Group6',
		],
		extAssets: [
			173, 77, 90, 162, 0, 147, 126, 79, 126, 147, 89, 80, 84, 70, 45, 48, 64,
			176,
		],
		extLiabilities: [
			142, 36, 74, 131, 7, 80, 101, 78, 56, 73, 33, 64, 47, 46, 10, 37, 24, 148,
		],
		liabilityMatrix: [
			[0, 5, 7, 11, 2, 8, 15, 10, 8, 13, 7, 11, 11, 8, 4, 4, 6, 12],
			[5, 0, 3, 5, 0, 3, 7, 4, 4, 5, 3, 5, 5, 3, 2, 1, 2, 5],
			[7, 3, 0, 6, 1, 4, 9, 6, 5, 7, 4, 6, 6, 4, 2, 2, 3, 7],
			[11, 5, 6, 0, 1, 7, 14, 10, 8, 12, 7, 11, 11, 7, 4, 4, 5, 11],
			[2, 0, 1, 1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 0, 0, 1, 2],
			[8, 3, 4, 7, 1, 0, 10, 7, 5, 8, 5, 7, 7, 5, 3, 2, 4, 8],
			[15, 7, 9, 14, 2, 10, 0, 13, 11, 16, 9, 14, 14, 10, 6, 5, 7, 15],
			[10, 4, 6, 10, 1, 7, 13, 0, 7, 11, 6, 10, 10, 7, 4, 3, 5, 10],
			[8, 4, 5, 8, 1, 5, 11, 7, 0, 9, 5, 8, 8, 5, 3, 3, 4, 8],
			[13, 5, 7, 12, 2, 8, 16, 11, 9, 0, 8, 12, 12, 8, 5, 4, 6, 13],
			[7, 3, 4, 7, 1, 5, 9, 6, 5, 8, 0, 7, 7, 5, 2, 2, 3, 7],
			[11, 5, 6, 11, 1, 7, 14, 10, 8, 12, 7, 0, 11, 7, 4, 4, 6, 11],
			[11, 5, 6, 11, 1, 7, 14, 10, 8, 12, 7, 11, 0, 7, 4, 4, 6, 11],
			[8, 3, 4, 7, 1, 5, 10, 7, 5, 8, 5, 7, 7, 0, 3, 2, 4, 8],
			[4, 2, 2, 4, 0, 3, 6, 4, 3, 5, 2, 4, 4, 3, 0, 1, 2, 4],
			[4, 1, 2, 4, 0, 2, 5, 3, 3, 4, 2, 4, 4, 2, 1, 0, 2, 4],
			[6, 2, 3, 5, 1, 4, 7, 5, 4, 6, 3, 6, 6, 4, 2, 2, 0, 6],
			[12, 5, 7, 11, 2, 8, 15, 10, 8, 13, 7, 11, 11, 8, 4, 4, 6, 0],
		],
		shock: [5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	},
	stableMD: {
		name: 'Stable - Minimum Density',
		nodeGroups: [
			'Group1',
			'Group1',
			'Group1',
			'Group2',
			'Group2',
			'Group2',
			'Group3',
			'Group3',
			'Group4',
			'Group4',
			'Group4',
			'Group5',
			'Group5',
			'Group5',
			'Group6',
			'Group6',
			'Group6',
			'Group6',
		],
		extAssets: [
			572, 609, 523, 691, 554, 575, 572, 876, 862, 602, 828, 527, 846, 503, 645,
			682, 613, 530,
		],
		extLiabilities: [
			53, 62, 4, 96, 44, 11, 66, 104, 57, 63, 189, 27, 200, 1, 109, 1, 92, 0,
		],
		liabilityMatrix: [
			[0, 0, 186, 0, 0, 0, 0, 0, 0, 0, 17, 0, 30, 0, 0, 0, 0, 63],
			[0, 0, 0, 18, 152, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[261, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 117, 83, 0, 10],
			[0, 85, 0, 0, 0, 82, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 107, 0, 0, 0, 0, 0, 35, 0, 0, 0, 0, 0, 0, 0, 10],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 82, 0, 0, 0, 0, 0, 0, 0, 0],
			[35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 43, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 78, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 43, 78, 0, 0, 0, 0, 21, 0, 0, 17, 79],
			[0, 0, 17, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 51, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 21, 0, 0, 0, 0, 0],
			[0, 0, 117, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 134, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 0, 17, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 85, 0, 45, 0, 0, 35, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
		],
		shock: [50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	},
	stableME: {
		name: 'Stable - Maximum Entropy',
		nodeGroups: [
			'Group1',
			'Group1',
			'Group1',
			'Group2',
			'Group2',
			'Group2',
			'Group3',
			'Group3',
			'Group4',
			'Group4',
			'Group4',
			'Group5',
			'Group5',
			'Group5',
			'Group6',
			'Group6',
			'Group6',
			'Group6',
		],
		extAssets: [
			572, 609, 523, 691, 554, 575, 572, 876, 862, 602, 828, 527, 846, 503, 645,
			682, 613, 530,
		],
		extLiabilities: [
			53, 62, 4, 96, 44, 11, 66, 104, 57, 63, 189, 27, 200, 1, 109, 1, 92, 0,
		],
		liabilityMatrix: [
			[
				0, 24.4818170418117, 83.2553972301724, 24.4818170418117,
				21.6992729416189, 11.3390548042895, 4.74512308007747, 5.84888291531181,
				10.7672939185092, 35.5089897852789, 2.28808860345086, 0.401548298796798,
				6.96007659983768, 2.83099093937595, 16.4322475796706, 18.9677009905442,
				2.28808860345086, 23.7036096259913,
			],
			[
				24.4818178752622, 0, 44.6201205569841, 13.1208505898976,
				11.6295664529368, 6.07708339882, 2.54311397140331, 3.13466597346697,
				5.77065233846785, 19.0307830817923, 1.22628433384063, 0.215206870639633,
				3.73020209262844, 1.51724886569763, 8.80674277488636, 10.1656004660823,
				1.22628433384063, 12.7037760233533,
			],
			[
				83.2554183397318, 44.6201303514658, 0, 44.6201303514658,
				39.5487142777626, 20.6663624095268, 8.64837810057978, 10.6600714173281,
				19.6242810472729, 64.7180619870672, 4.17023015764377, 0.731854886592868,
				12.6853135374122, 5.15971443308465, 29.9491262319393, 34.5701991490366,
				4.17023015764377, 43.2017831644461,
			],
			[
				24.4818178752622, 13.1208505898976, 44.6201205569841, 0,
				11.6295664529368, 6.07708339882, 2.54311397140331, 3.13466597346697,
				5.77065233846785, 19.0307830817923, 1.22628433384063, 0.215206870639633,
				3.73020209262844, 1.51724886569763, 8.80674277488636, 10.1656004660823,
				1.22628433384063, 12.7037760233533,
			],
			[
				21.6992737314154, 11.6295664803095, 39.5487056895846, 11.6295664803095,
				0, 5.38637681366312, 2.25406979485083, 2.77838742863719,
				5.11477396569373, 16.8677903544194, 1.08690782555988, 0.190746978785811,
				3.30623635441845, 1.34480203321502, 7.80578971415036, 9.01020293025778,
				1.08690782555988, 11.2598955991696,
			],
			[
				11.3390552947558, 6.07708345479572, 20.6663580634489, 6.07708345479572,
				5.38637685059876, 0, 1.17787453895514, 1.45185913010354,
				2.67274866131639, 8.81434143356622, 0.567968683508667,
				0.0996757111104858, 1.72768901412615, 0.702732487910344,
				4.07895131807315, 4.70832298388169, 0.567968683508667, 5.88391023554469,
			],
			[
				4.74512330080018, 2.54311400312115, 8.64837631005338, 2.54311400312115,
				2.25406981765824, 1.1778745427963, 0, 0.607568303412368,
				1.11848135671942, 3.68859096550727, 0.237681302735003,
				0.041711899891073, 0.722996509352771, 0.294076730021315,
				1.70694351858131, 1.97032050005461, 0.237681302735003, 2.46227563343946,
			],
			[
				5.84888318444954, 3.13466601099389, 10.6600692049737, 3.13466601099389,
				2.77838745535934, 1.45185913411159, 0.607568303108303, 0,
				1.3786505396674, 4.54659158568754, 0.292968187905758,
				0.0514144763789802, 0.891172232606904, 0.362481716938636,
				2.10399448228285, 2.42863540317325, 0.292968187905758, 3.0350238834627,
			],
			[
				10.7672943875892, 5.77065239341373, 19.6242769264381, 5.77065239341373,
				5.11477400235585, 2.6727486621467, 1.1184813534194, 1.37865053628973, 0,
				8.36988678341007, 0.539329411427922, 0.0946496596868399,
				1.64057196492405, 0.667297881204715, 3.87327413904144, 4.47091034671583,
				0.539329411427922, 5.58721974709476,
			],
			[
				35.5089905367037, 19.0307828366356, 64.718046947221, 19.0307828366356,
				16.8677900974246, 8.81434123883042, 3.68859087198615, 4.54659147268793,
				8.36988659589349, 0, 1.778630942666, 0.312140984460883,
				5.41037072826919, 2.20065257769608, 12.7735018472061, 14.7444202301159,
				1.778630942666, 18.4258483129013,
			],
			[
				2.28808871230147, 1.22628435043112, 4.17022929866367, 1.22628435043112,
				1.08690783770646, 0.567968685961227, 0.237681302986239,
				0.292968188362053, 0.539329413589268, 1.77863098964176, 0,
				0.0201133924788253, 0.348627432253336, 0.141803195377206,
				0.823084659727061, 0.950084499391387, 0.114609436138648,
				1.18730425455914,
			],
			[
				0.401548318205631, 0.215206873715228, 0.73185473640395,
				0.215206873715228, 0.190746981062876, 0.099675711616877,
				0.0417118999669591, 0.0514144764982491, 0.0946496601382935,
				0.312140992942831, 0.020113392494157, 0, 0.0611824001180729,
				0.0248857635255879, 0.144447310577313, 0.166735157965145,
				0.020113392494157, 0.208366058559445,
			],
			[
				6.96007691648083, 3.73020213534132, 12.6853108981365, 3.73020213534132,
				3.30623638449473, 1.72768901799548, 0.722996508614235,
				0.891172232142575, 1.64057196808863, 5.41037085991793,
				0.348627431528706, 0.0611823999442668, 0, 0.431347413027257,
				2.50371959342151, 2.89003706777999, 0.348627431528706, 3.61162960621597,
			],
			[
				2.83099107341105, 1.51724888588007, 5.15971336911983, 1.51724888588007,
				1.34480204793828, 0.702732490785253, 0.294076730265383,
				0.362481717420885, 0.66729788372736, 2.2006526353182, 0.141803195345005,
				0.0248857635009673, 0.431347413825872, 0, 1.01838067371309,
				1.17551418452557, 0.141803195345005, 1.46901985399814,
			],
			[
				16.4322482403171, 8.80674282914132, 29.9491198423675, 8.80674282914132,
				7.80578974386622, 4.07895130563098, 1.70694350780806, 2.10399447005661,
				3.87327412602341, 12.7735020904484, 0.823084653662196,
				0.144447309402852, 2.503719580177, 1.01838066644044, 0,
				6.82317265905891, 0.823084653662196, 8.52680149279541,
			],
			[
				18.9677017201654, 10.1656005110433, 34.5701917134956, 10.1656005110433,
				9.01020294890111, 4.70832296133779, 1.97032048419512, 2.42863538484014,
				4.47091032391977, 14.7444204852676, 0.950084490739708,
				0.166735156319722, 2.89003704746968, 1.17551417408801, 6.82317264720186,
				0, 0.950084490739708, 9.84246494923223,
			],
			[
				2.28808871230147, 1.22628435043112, 4.17022929866367, 1.22628435043112,
				1.08690783770646, 0.567968685961227, 0.237681302986239,
				0.292968188362053, 0.539329413589268, 1.77863098964176,
				0.114609436138648, 0.0201133924788253, 0.348627432253336,
				0.141803195377206, 0.823084659727061, 0.950084499391387, 0,
				1.18730425455914,
			],
			[
				23.7036104492036, 12.703776032065, 43.2017737109291, 12.703776032065,
				11.2598955803885, 5.88391018538321, 2.46227560441836, 3.03502384920994,
				5.58721969772693, 18.4258485629008, 1.18730423931022, 0.208366055724504,
				3.61162956733751, 1.46901983546463, 8.52680144611237, 9.84246491244998,
				1.18730423931022, 0,
			],
		],
		shock: [50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	},
}

export const useStore = defineStore('main', {
	state: (): State => {
		let extAssets: number[]
		let extLiabilities: number[]
		let shock: number[]
		let liabilityMatrix: number[][]

		const randInputs = randomiseInputs(50)
		extAssets = randInputs.extAssets
		extLiabilities = randInputs.extLiabilities
		shock = randInputs.shock
		liabilityMatrix = randInputs.liabilityMatrix

		const selectedScenario = 'emergent'
		extAssets = scenarios[selectedScenario].extAssets
		extLiabilities = scenarios[selectedScenario].extLiabilities
		shock = scenarios[selectedScenario].shock
		liabilityMatrix = scenarios[selectedScenario].liabilityMatrix

		const s: State = {
			nodeIds: null,
			nodeGroups: null,
			extAssets,
			extLiabilities,
			shock,
			liabilityMatrix,
			equityOuts: [],
			effectiveValues: [],
			valueFunc: 'Distress',
			R: 1,
			alpha: 1,
			beta: 1,
			volatility: 0.5,
			maturity: 5,
			selectedNode: 0,
			selectedLiability: { to: 1, from: 0 },
			modelI: 0,
			animating: false,
			loadingCount: 0,
			lang: 'en',
			updating: false,
			choosingScenario: false,
		}
		return s
	},
	getters: {
		isLoading: (state) => state.loadingCount > 0,
		equities: (state) => {
			return getEquities(
				state.extAssets,
				state.extLiabilities,
				state.liabilityMatrix,
			)
		},
		nNodes: (state) => state.extAssets.length,
	},
	actions: {
		/* You can define actions here and just call then like normal methods */
		setLoading() {
			this.loadingCount++
		},
		setLoadingDone() {
			this.loadingCount--
		},
		prevModelI() {
			this.modelI = Math.max(0, this.modelI - 1)
		},
		nextModelI() {
			this.modelI = Math.min(this.equityOuts.length - 1, this.modelI + 1)
		},
		async rerunModel() {
			this.setLoading()
			const results = await worker.send({
				extAssets: [...this.extAssets],
				extLiabilities: [...this.extLiabilities],
				liabilityMatrix: [...this.liabilityMatrix.map((r) => [...r])],
				shock: [...this.shock],
				valueFunc: this.valueFunc,
				R: this.R,
				alpha: this.alpha,
				beta: this.beta,
				volatility: this.volatility,
				maturity: this.maturity,
			})
			this.equityOuts = results[0]
			this.effectiveValues = results[1]
			if (this.modelI >= this.equityOuts.length)
				this.modelI = this.equityOuts.length - 1
			this.setLoadingDone()
		},
		addNode() {
			this.updating = true
			if (this.nodeIds !== null) {
				this.nodeIds.push('')
			}
			this.extLiabilities.push(0)
			this.shock.push(0)
			this.liabilityMatrix.push(this.extAssets.map(() => 0))
			this.liabilityMatrix.forEach((row, i) =>
				row.push(i == row.length - 1 ? 50 : 0),
			)
			this.updating = false
			this.extAssets.push(100)
		},
		removeNode() {
			if (this.extAssets.length <= 1) return
			this.updating = true
			if (this.nodeIds !== null) {
				this.nodeIds.pop()
			}
			if (this.selectedNode == this.extAssets.length - 1) {
				this.selectedNode--
				this.selectedLiability = null
			}
			this.extLiabilities.pop()
			this.shock.pop()
			this.liabilityMatrix.pop()
			this.liabilityMatrix.forEach((row) => row.pop())
			this.updating = false
			this.extAssets.pop()
		},
		importData() {
			const reader = new FileReader()
			const input = document.createElement('input')
			input.type = 'file'
			input.onchange = (event) => {
				// @ts-ignore
				const file = event.target.files[0]
				// You can now use the `file` object as needed
				Papa.parse(file, {
					delimiter: ',',
					header: false,
					skipEmptyLines: true,
					dynamicTyping: true,
					beforeFirstChunk: (chunk) =>
						[...chunk.split('\n').slice(1)].join('\n'),
					complete: (results) => {
						this.updating = true
						this.selectedLiability = null
						this.selectedNode = 0
						this.modelI = 0
						this.nodeIds = []
						this.nodeGroups = []
						this.extAssets = []
						this.extLiabilities = []
						this.shock = []
						this.liabilityMatrix = []
						let nodeId = 0
						for (let line of results.data as any[][]) {
							if (line[0].trim() !== '') {
								this.nodeIds.push(line[0])
							} else {
								this.nodeIds.push(`Bank ${nodeId++}`)
							}

							if (line[1].trim() !== '') this.nodeGroups.push(line[1])
							this.extAssets.push(line[2])
							this.extLiabilities.push(line[3])
							this.shock.push(0)
							const lRow = []
							for (let i = 4; i < line.length; i++) {
								lRow.push(line[i])
							}
							this.liabilityMatrix.push(lRow)
						}
						this.liabilityMatrix = transpose(this.liabilityMatrix)
						console.log(
							this.extAssets,
							this.extLiabilities,
							this.liabilityMatrix,
							this.nodeIds,
						)
						this.updating = false
					},
				})
			}
			input.click()
		},
		async timeModel() {
			const results = {} as Record<number, number>
			for (let nodes = 50; nodes < 1000; nodes += 50) {
				const randInputs = randomiseInputs(nodes)

				const t1 = performance.now()
				for (let i = 0; i < 100; i++) {
					await worker.send({
						extAssets: [...randInputs.extAssets],
						extLiabilities: [...randInputs.extLiabilities],
						liabilityMatrix: [...randInputs.liabilityMatrix.map((r) => [...r])],
						shock: [...randInputs.shock],
						valueFunc: 'Distress',
					})
				}
				const t2 = performance.now()
				results[nodes] = t2 - t1
				console.log(nodes, t2 - t1)
			}
		},
		selectScenario(scenario: string) {
			this.updating = true
			this.nodeGroups = scenarios[scenario].nodeGroups
				? scenarios[scenario].nodeGroups
				: null
			this.extAssets = scenarios[scenario].extAssets
			this.extLiabilities = scenarios[scenario].extLiabilities
			this.shock = scenarios[scenario].shock
			this.modelI = 0
			this.choosingScenario = false
			this.updating = false
			this.liabilityMatrix = scenarios[scenario].liabilityMatrix
		},
		chooseScenario() {
			this.choosingScenario = true
		},
		randomise() {
			this.updating = true
			const randInputs = randomiseInputs(this.extAssets.length)
			this.extAssets = randInputs.extAssets
			this.extLiabilities = randInputs.extLiabilities
			this.shock = randInputs.shock
			this.liabilityMatrix = randInputs.liabilityMatrix
			this.updating = false
		},
	},
})
