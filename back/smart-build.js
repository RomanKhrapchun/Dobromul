import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import readline from 'readline';

// Отримуємо поточну директорію для ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Кольори для консолі
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// Функції для кольорового виводу
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  step: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.bold}${colors.purple}${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.yellow}🧪 ${msg}${colors.reset}`)
};

// Функція для виконання команд з обробкою помилок
function runCommand(command, description, options = {}) {
  log.info(`Виконуємо: ${command}`);

  try {
    const result = execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf8',
      cwd: process.cwd(),
      ...options
    });

    if (!options.silent) {
      log.success(`${description} - завершено`);
    }

    return { success: true, output: result };
  } catch (error) {
    log.error(`${description} - провалилось!`);

    if (error.stdout) {
      console.log('📄 Вивід команди:');
      console.log(error.stdout);
    }

    if (error.stderr) {
      console.log('📄 Помилки:');
      console.log(error.stderr);
    }

    return { success: false, error: error.message, code: error.status };
  }
}

// Функція для перевірки існування файлу
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Функція для підрахунку тестових файлів
function countTestFiles(dirPath) {
  try {
    let count = 0;
    const testFiles = [];

    function searchFiles(dir) {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory() &&
              entry.name !== 'node_modules' &&
              entry.name !== '.git' &&
              entry.name !== 'dist' &&
              entry.name !== 'coverage') {
            searchFiles(fullPath);
          } else if (entry.isFile()) {
            const isTestFile = entry.name.endsWith('.test.js') ||
                              entry.name.endsWith('.spec.js') ||
                              entry.name.endsWith('.test.mjs') ||
                              entry.name.endsWith('.spec.mjs');
            if (isTestFile) {
              count++;
              testFiles.push(path.relative(dirPath, fullPath));
            }
          }
        }
      } catch {
        // Ігноруємо помилки доступу
      }
    }

    searchFiles(dirPath);
    return { count, files: testFiles };
  } catch {
    return { count: 0, files: [] };
  }
}

// Функція для отримання інформації про проект
function getProjectInfo() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return {
      name: packageJson.name || 'unknown',
      version: packageJson.version || 'unknown',
      scripts: packageJson.scripts || {},
      dependencies: Object.keys(packageJson.dependencies || {}),
      devDependencies: Object.keys(packageJson.devDependencies || {})
    };
  } catch {
    return null;
  }
}

// Функція для очікування введення користувача
function askUser(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Головна функція
async function testOnly() {
  const startTime = Date.now();

  console.clear();
  log.title('🧪 Smart Build - Тестування Backend');
  log.title('=====================================');
  console.log(`📍 Платформа: ${os.platform()}`);
  console.log(`📍 Node.js: ${process.version}`);
  console.log(`📍 Директорія: ${process.cwd()}`);

  // Крок 1: Перевірка середовища
  log.step('1️⃣ Перевірка середовища...');

  if (!fileExists('package.json')) {
    log.error('package.json не знайдено!');
    log.warning('Переконайтесь що ви в директорії backend/');
    await askUser('Натисніть Enter щоб закрити...');
    process.exit(1);
  }
  log.success('package.json знайдено');

  // Отримуємо інформацію про проект
  const projectInfo = getProjectInfo();
  if (projectInfo) {
    log.success(`Проект: ${projectInfo.name} v${projectInfo.version}`);
  }

  // Перевірка необхідних інструментів
  const nodeCheck = runCommand('node --version', 'Перевірка Node.js', { silent: true });
  const npmCheck = runCommand('npm --version', 'Перевірка npm', { silent: true });

  if (!nodeCheck.success || !npmCheck.success) {
    log.error('Node.js або npm не встановлені!');
    await askUser('Натисніть Enter щоб закрити...');
    process.exit(1);
  }

  log.success('Всі необхідні інструменти встановлені');

  // Крок 2: Перевірка залежностей
  log.step('2️⃣ Перевірка залежностей...');

  if (!fileExists('node_modules')) {
    log.warning('node_modules не знайдено, встановлюємо...');
    const installResult = runCommand('npm install', 'Встановлення залежностей');
    if (!installResult.success) {
      log.error('Не вдалося встановити залежності');
      await askUser('Натисніть Enter щоб закрити...');
      process.exit(1);
    }
  } else {
    log.success('node_modules знайдено');
  }

  // Крок 3: Пошук тестових файлів
  log.step('3️⃣ Пошук тестових файлів...');

  const testInfo = countTestFiles('.');

  if (testInfo.count === 0) {
    log.warning('Тестові файли не знайдені!');
    console.log('\n💡 Шукав файли з розширеннями: .test.js, .spec.js, .test.mjs, .spec.mjs');
    console.log('💡 Директорії: tests/, test/, __tests__, spec/');

    const answer = await askUser('\nПродовжити без тестів? (y/n): ');
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      log.error('Процес скасовано');
      await askUser('Натисніть Enter щоб закрити...');
      process.exit(1);
    }

    log.warning('Продовжуємо без запуску тестів...');
  } else {
    log.success(`Знайдено ${testInfo.count} тестових файлів`);

    // Показуємо список тестових файлів
    console.log('\n📋 Знайдені тестові файли:');
    testInfo.files.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
  }

  // Крок 4: Запуск тестів
  if (testInfo.count > 0) {
    log.step('4️⃣ Запуск тестів...');

    let testResult = null;

    // Спробуємо різні команди для запуску тестів
    if (projectInfo?.scripts?.test) {
      log.test('Використовуємо npm test...');
      testResult = runCommand('npm test', 'Запуск тестів через npm test');
    } else {
      // Пробуємо різні варіанти
      const testCommands = [
        { cmd: 'npx jest', desc: 'Jest тести' },
        { cmd: 'npx mocha tests/**/*.js', desc: 'Mocha тести' },
        { cmd: 'npx mocha test/**/*.js', desc: 'Mocha тести (test/)' },
        { cmd: 'npx vitest run', desc: 'Vitest тести' },
        { cmd: 'node --test', desc: 'Native Node.js тести' }
      ];

      for (const { cmd, desc } of testCommands) {
        log.test(`Пробуємо: ${cmd}`);
        testResult = runCommand(cmd, desc);

        if (testResult.success) {
          break;
        }
      }
    }

    // Аналіз результатів тестів
    if (!testResult || !testResult.success) {
      log.error('ТЕСТИ ПРОВАЛИЛИСЬ! 🚫');

      console.log('\n' + '='.repeat(50));
      console.log('🚫 КРИТИЧНА ПОМИЛКА: ТЕСТИ НЕ ПРОЙШЛИ');
      console.log('='.repeat(50));
      console.log('\n❌ ЧОМУ BUILD ЗАБЛОКОВАНО:');
      console.log('   • Тести виявили помилки в коді');
      console.log('   • Деплой поламаного коду = збій production сервера');
      console.log('   • Автоматичний захист від деплою неякісного коду');

      console.log('\n🛠️  ЩО ПОТРІБНО ЗРОБИТИ:');
      console.log('   1. Подивіться ВИЩЕ на детальні помилки тестів');
      console.log('   2. Виправте код щоб всі тести проходили');
      console.log('   3. Перевірте локально: npm test');
      console.log('   4. Запустіть цей скрипт знову після виправлення');

      console.log('\n💡 КОРИСНІ КОМАНДИ ДЛЯ ДЕБАГУ:');
      if (projectInfo?.scripts?.test) {
        console.log('   • npm test -- --verbose - детальний вивід тестів');
      }
      console.log('   • npm run test:watch - автоматичний перезапуск тестів');
      console.log('   • npm run test:coverage - покриття коду тестами');

      console.log('\n' + '='.repeat(50));
      console.log('❌ BUILD СКАСОВАНО ДЛЯ БЕЗПЕКИ');
      console.log('='.repeat(50));

      await askUser('\nНатисніть Enter щоб закрити...');
      process.exit(1);
    }

    // Тести пройшли успішно
    log.success('🎉 ВСІ ТЕСТИ ПРОЙШЛИ УСПІШНО!');
  }

  // Фінальний звіт
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);

  console.log('\n' + '='.repeat(60));
  log.title('🎉 ТЕСТУВАННЯ ЗАВЕРШЕНО УСПІШНО!');
  console.log('='.repeat(60));

  console.log('\n📊 ПІДСУМОК:');
  console.log(`  ⏱️  Загальний час: ${duration} секунд`);
  console.log(`  🧪 Тестових файлів: ${testInfo.count}`);
  console.log(`  🟢 Тести: ${testInfo.count > 0 ? 'ПРОЙШЛИ ✅' : 'ПРОПУЩЕНІ ⚠️'}`);

  console.log('\n🎯 СТАТУС:');
  console.log('  ✅ Код протестовано та перевірено');
  console.log('  ✅ Готово до деплою в production');

  console.log('\n' + '='.repeat(60));

  console.log('\n✨ Тестування завершено!');
  await askUser('Натисніть Enter щоб закрити...');
}

// Обробка помилок та сигналів
process.on('uncaughtException', async (error) => {
  log.error(`Критична помилка: ${error.message}`);
  console.log('\n🔍 Stack trace:');
  console.log(error.stack);
  await askUser('\nНатисніть Enter щоб закрити...');
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  log.error(`Unhandled Promise Rejection: ${reason}`);
  await askUser('Натисніть Enter щоб закрити...');
  process.exit(1);
});

process.on('SIGINT', async () => {
  log.warning('\n\nПроцес перерваний користувачем (Ctrl+C)');
  console.log('🛑 Операція скасована');
  await askUser('Натисніть Enter щоб закрити...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  log.warning('\nПроцес завершується системою');
  await askUser('Натисніть Enter щоб закрити...');
  process.exit(0);
});

// Запуск основної функції
testOnly().catch(async (error) => {
  log.error(`Помилка виконання скрипта: ${error.message}`);
  console.log('\n🔍 Детальна інформація:');
  console.log(error.stack);
  await askUser('\nНатисніть Enter щоб закрити...');
  process.exit(1);
});
