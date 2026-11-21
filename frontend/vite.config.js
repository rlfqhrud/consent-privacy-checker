import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 개발 서버에서 /api 요청을 백엔드(FastAPI, 8000번 포트)로 넘긴다
  server: { proxy: { '/api': 'http://localhost:8000' } },
  test: {
    include: ['tests/**/*.test.{js,jsx}']
  }
});
