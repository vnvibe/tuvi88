import TelegramBot from 'node-telegram-bot-api';
import { config } from './utils/config';
import { setupHandlers } from './bot/handler';
import { startWebServer } from './web/server';
import { logger } from './utils/logger';

function main() {
  if (!config.deepseekApiKey || config.deepseekApiKey === 'YOUR_DEEPSEEK_API_KEY') {
    logger.error('Chưa cấu hình DEEPSEEK_API_KEY trong file .env');
    process.exit(1);
  }

  const mode = process.argv[2] || 'all'; // 'web', 'bot', or 'all'

  // Start web server
  if (mode === 'web' || mode === 'all') {
    const port = parseInt(process.env.PORT || '3000', 10);
    startWebServer(port);
  }

  // Start Telegram bot
  if (mode === 'bot' || mode === 'all') {
    if (!config.telegramToken || config.telegramToken === 'YOUR_TELEGRAM_BOT_TOKEN') {
      if (mode === 'bot') {
        logger.error('Chưa cấu hình TELEGRAM_BOT_TOKEN trong file .env');
        process.exit(1);
      }
      logger.warn('Bỏ qua Telegram Bot (chưa có token)');
    } else {
      logger.info('Khởi tạo Telegram Bot...');
      const bot = new TelegramBot(config.telegramToken, { polling: true });
      setupHandlers(bot);
      logger.success('Telegram Bot đã sẵn sàng!');

      process.on('SIGINT', () => {
        bot.stopPolling();
        process.exit(0);
      });
      process.on('SIGTERM', () => {
        bot.stopPolling();
        process.exit(0);
      });
    }
  }

  process.on('unhandledRejection', (reason: any) => {
    logger.error(`Unhandled rejection: ${reason?.message || reason}`);
  });
}

main();
