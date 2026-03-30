import TelegramBot from 'node-telegram-bot-api';
import { config } from './utils/config';
import { setupHandlers } from './bot/handler';
import { logger } from './utils/logger';

function main() {
  if (!config.telegramToken || config.telegramToken === 'YOUR_TELEGRAM_BOT_TOKEN') {
    logger.error('Chưa cấu hình TELEGRAM_BOT_TOKEN trong file .env');
    process.exit(1);
  }

  if (!config.deepseekApiKey || config.deepseekApiKey === 'YOUR_DEEPSEEK_API_KEY') {
    logger.error('Chưa cấu hình DEEPSEEK_API_KEY trong file .env');
    process.exit(1);
  }

  logger.info('Khởi tạo Bot Tử Vi Đẩu Số...');

  const bot = new TelegramBot(config.telegramToken, { polling: true });

  setupHandlers(bot);

  logger.success('Bot đã sẵn sàng! Đang chờ lệnh...');
  logger.info('Gõ /tuvi trong Telegram để bắt đầu xem tử vi');

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.warn('Đang tắt bot...');
    bot.stopPolling();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.warn('Đang tắt bot...');
    bot.stopPolling();
    process.exit(0);
  });

  process.on('unhandledRejection', (reason: any) => {
    logger.error(`Unhandled rejection: ${reason?.message || reason}`);
  });
}

main();
