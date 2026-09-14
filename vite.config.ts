import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import {fileURLToPath} from 'node:url';
export default defineConfig({ plugins:[tailwindcss()], esbuild:{jsx:'automatic'}, resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}}, server: { host: '127.0.0.1', proxy: { '/api': 'http://127.0.0.1:3001' } }, build: { outDir: 'dist' } });
