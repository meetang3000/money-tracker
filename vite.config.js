import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
<<<<<<< HEAD
  base: './',
=======
  base: './',          // ⭐ จุดสำคัญที่สุด
>>>>>>> 19df201993dbbf79d236812245c8362cc5423f78
  build: {
    outDir: 'build'
  }
})
