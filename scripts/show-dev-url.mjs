const frontendUrl = 'http://localhost:5173';
const healthUrl = `${frontendUrl}/api/health`;

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function isAvailable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

// Даже если от прошлого запуска порты ещё заняты, не принимаем старые
// процессы за только что запущенные. За это время NestJS успевает вывести
// маршруты, а concurrently — остановиться, если один из сервисов упал.
await wait(5_000);

while (!(await isAvailable(frontendUrl)) || !(await isAvailable(healthUrl))) {
  await wait(500);
}

// Даём NestJS закончить последние сообщения, чтобы ссылка осталась внизу.
await wait(700);

console.log('');
console.log('============================================================');
console.log('  САЙТ ГОТОВ: откройте ссылку в VS Code');
console.log(`  ${frontendUrl}`);
console.log('============================================================');
console.log('');

// Не завершаем вспомогательный процесс, иначе concurrently напечатает
// служебную строку после ссылки и снова сдвинет её вверх.
setInterval(() => {}, 60_000);
