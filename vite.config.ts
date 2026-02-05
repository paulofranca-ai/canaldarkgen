
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    base: './', 
    define: {
      // Mapeia a chave da OpenAI. 
      // IMPORTANTE: Adicione OPENAI_API_KEY=sk-... no seu arquivo .env
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY || ''),
      // Mantemos compatibilidade caso algo ainda leia a antiga
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env': JSON.stringify(env)
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
    },
    server: {
      port: 3000,
      open: true
    }
  };
});
