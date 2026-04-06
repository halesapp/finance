import {defineConfig} from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  define: {
    __SUPABASE_URL__: JSON.stringify('https://tnkofoarfyudzojkioos.supabase.co'),
    __SUPABASE_PUBLISHABLE_KEY__: JSON.stringify('sb_publishable_bYzQW6M1F8vJdxwABlrpyQ_mtFvl_WB'),
  },
})
