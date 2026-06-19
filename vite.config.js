import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('apexcharts') || id.includes('react-apexcharts')) return 'vendor-charts'
          if (id.includes('react-big-calendar') || (id.includes('date-fns') && !id.includes('date-fns-tz'))) return 'vendor-calendar'
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('@vapi-ai')) return 'vendor-vapi'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('@anthropic-ai')) return 'vendor-anthropic'
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react'
          return 'vendor'
        },
      },
    },
  },
})
