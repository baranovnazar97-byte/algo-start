import { resolve } from 'node:path';
import { config } from 'dotenv';

// Загружаем настройки независимо от текущей рабочей директории.
// backend/.env имеет приоритет над корневым .env, а переменные ОС — над файлами.
const backendDirectory = resolve(__dirname, '..', '..');

config({
  path: [
    resolve(backendDirectory, '.env'),
    resolve(backendDirectory, '..', '.env'),
  ],
  quiet: true,
});
