import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  define: {
    __SUPABASE_URL__: JSON.stringify('https://vzsguticieojanyagdyt.supabase.co'),
    __SUPABASE_PUBLISHABLE_KEY__: JSON.stringify('sb_publishable_eL5NYr6BZ04n8YELuFPSLw_rPzxnVic'),
  },
})
