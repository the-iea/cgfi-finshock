import { TimeLocaleDefinition } from 'd3'
import { App, computed, ComputedRef, inject, InjectionKey } from 'vue'

const langNames: Record<Language, string> = {
	en: 'English',
}

const labelsEn = {
	title: 'Network Reevaluation Model',
	main: 'Main page',
	mainTitle: 'Main content goes here',
	selNode: 'Node:',
	owes: 'Owes',
	owed: 'Owed by',
	shock: 'Shock',
	extAsset: 'Ext. assets',
	extLiability: 'Ext. liabilities',
	valueFunc: 'Valuation function',
	equityIs: 'Equity is',
	valueIs: 'Valuation is',
	recoveryRate: 'Recovery rate',
	alphabeta: 'α, β',
	volatility: 'Volatility',
	maturity: 'Time to Maturity',
	e404Title: 'Page not found',
	e404: 'The page you are looking for does not exist, please navigate to another page using the menus at the top of the page.',
	errorTitle: 'Error',
	error:
		'A problem has occurred.  If this keeps happening, please contact the system administrator.',
}

type Labels = typeof labelsEn

const labels: Record<Language, Labels> = {
	en: labelsEn,
}

// Locale definitions from here: https://github.com/d3/d3-time-format/tree/main/locale
const enLocale: TimeLocaleDefinition = {
	dateTime: '%a %e %b %X %Y',
	date: '%d/%m/%Y',
	time: '%H:%M:%S',
	periods: ['AM', 'PM'],
	days: [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
	],
	shortDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
	months: [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	],
	shortMonths: [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec',
	],
}

const locales: Record<Language, TimeLocaleDefinition> = {
	en: enLocale,
}

const LabelsKey: InjectionKey<ComputedRef<Labels>> = Symbol('labels')
function useLabels() {
	return inject(
		LabelsKey,
		computed(() => labels.en),
	)
}

function createI18n(langFunc: () => Language) {
	return (app: App) =>
		app.provide(
			LabelsKey,
			computed(() => labels[langFunc()]),
		)
}

export { createI18n, labels, langNames, locales, useLabels }
