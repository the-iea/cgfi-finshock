import E404 from '@/components/errors/404.vue'
import Main from '@/components/Main.vue'
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
	{
		path: '/',
		name: 'Main',
		component: Main,
	},
	{
		// So that the server can handle 404s
		// This will happen in production, since the server is responsible for routing
		// all of the routes in CLIENT_ROUTES to the main index.html
		path: '/404',
		name: '404',
		component: E404,
	},
	{
		// So that the client can handle 404s
		// This will happen in development, since the client is running separately
		// It will also happen in production if a bug causes a redirect to a non-existent route
		path: '/:pathMatch(.*)*',
		name: 'NotFound',
		component: E404,
	},
]

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
})

export default router
