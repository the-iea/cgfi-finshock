import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'

const ENV_PREFIX = 'X_'

export default defineConfig(({ command, mode }) => {
	process.env = { ...process.env, ...loadEnv(mode, process.cwd(), ENV_PREFIX) }
	return {
		build: {
			outDir: './dist',
		},
		envPrefix: ENV_PREFIX,
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src'),
			},
		},
		// First option should be the final deploy point of the client
		base: command === 'build' ? process.env.X_PUBLIC_PATH : '/',
		plugins: [vue()],
		css: {
			preprocessorOptions: {
				scss: {},
			},
		},
		define: {
			// To get around badly-written libraries which rely on using npm for development (*cough, cough* vue-shepherd, *cough, cough*)
			'process.env': {},
		},
	}
})
