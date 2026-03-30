import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import { ConversationState, UserInfo, BIRTH_HOUR_NAMES, BIRTH_HOURS } from '../astrology/types';
import { genderKeyboard, birthHourKeyboard, confirmKeyboard } from './keyboards';
import { calculateAstro, formatAstroData } from '../astrology/calculator';
import { analyzeAllParts } from '../ai/deepseek';
import { generatePDF } from '../pdf/generator';
import { logger } from '../utils/logger';

// In-memory session store
const sessions = new Map<number, ConversationState>();

function getSession(chatId: number): ConversationState {
  if (!sessions.has(chatId)) {
    sessions.set(chatId, { step: 'idle', data: {} });
  }
  return sessions.get(chatId)!;
}

function resetSession(chatId: number): void {
  sessions.set(chatId, { step: 'idle', data: {} });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function setupHandlers(bot: TelegramBot): void {
  // /start command
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    resetSession(chatId);
    await bot.sendMessage(
      chatId,
      `<b>🌟 Chào mừng đến với Bot Tử Vi Đẩu Số AI! 🌟</b>\n\n` +
        `Bot sẽ phân tích lá số tử vi đẩu số chi tiết cho bạn dựa trên:\n` +
        `• Thư viện tính toán <b>iztro</b> (chính xác theo thuật toán cổ điển)\n` +
        `• AI <b>Deepseek</b> phân tích chuyên sâu 6 phần\n` +
        `• Xuất file <b>PDF</b> chuyên nghiệp\n\n` +
        `Gõ /tuvi để bắt đầu xem tử vi!`,
      { parse_mode: 'HTML' },
    );
  });

  // /tuvi command
  bot.onText(/\/tuvi/, async (msg) => {
    const chatId = msg.chat.id;
    resetSession(chatId);
    const session = getSession(chatId);
    session.step = 'ask_name';

    await bot.sendMessage(
      chatId,
      `<b>📋 NHẬP THÔNG TIN XEM TỬ VI</b>\n\n` +
        `<b>Bước 1/5:</b> Vui lòng nhập <b>Họ và Tên đầy đủ</b> của bạn:`,
      { parse_mode: 'HTML' },
    );
    logger.bot(`User ${chatId} bắt đầu xem tử vi`);
  });

  // Handle callback queries (inline keyboard)
  bot.on('callback_query', async (query) => {
    if (!query.message || !query.data) return;
    const chatId = query.message.chat.id;
    const session = getSession(chatId);
    const data = query.data;

    await bot.answerCallbackQuery(query.id);

    // Gender selection
    if (data.startsWith('gender_') && session.step === 'ask_gender') {
      session.data.gender = data === 'gender_male' ? 'male' : 'female';
      session.step = 'ask_birthdate';

      await bot.sendMessage(
        chatId,
        `<b>Bước 3/5:</b> Nhập <b>ngày sinh dương lịch</b> (định dạng <b>DD/MM/YYYY</b>):\n\n` +
          `Ví dụ: 15/08/1990`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    // Birth hour selection
    if (data.startsWith('hour_') && session.step === 'ask_birthhour') {
      const hourIndex = parseInt(data.replace('hour_', ''), 10);
      session.data.birthHour = hourIndex;
      session.data.birthHourName = BIRTH_HOUR_NAMES[hourIndex];
      session.step = 'ask_birthplace';

      await bot.sendMessage(
        chatId,
        `<b>Bước 5/5:</b> Nhập <b>nơi sinh</b> (tỉnh/thành phố):`,
        { parse_mode: 'HTML' },
      );
      return;
    }

    // Confirmation
    if (data === 'confirm_yes' && session.step === 'confirm') {
      session.step = 'processing';
      await processAstrology(bot, chatId, session.data as UserInfo);
      return;
    }

    if (data === 'confirm_no' && session.step === 'confirm') {
      resetSession(chatId);
      const newSession = getSession(chatId);
      newSession.step = 'ask_name';
      await bot.sendMessage(
        chatId,
        `<b>🔄 Nhập lại thông tin</b>\n\n<b>Bước 1/5:</b> Vui lòng nhập <b>Họ và Tên đầy đủ</b>:`,
        { parse_mode: 'HTML' },
      );
      return;
    }
  });

  // Handle text messages (conversation flow)
  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;
    const chatId = msg.chat.id;
    const session = getSession(chatId);
    const text = msg.text.trim();

    switch (session.step) {
      case 'ask_name': {
        if (text.length < 2) {
          await bot.sendMessage(chatId, '⚠️ Tên quá ngắn. Vui lòng nhập họ tên đầy đủ:', {
            parse_mode: 'HTML',
          });
          return;
        }
        session.data.fullName = text;
        session.step = 'ask_gender';

        await bot.sendMessage(chatId, `<b>Bước 2/5:</b> Chọn <b>giới tính</b>:`, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: genderKeyboard() },
        });
        break;
      }

      case 'ask_birthdate': {
        const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const match = text.match(dateRegex);
        if (!match) {
          await bot.sendMessage(
            chatId,
            '⚠️ Sai định dạng. Vui lòng nhập lại theo định dạng <b>DD/MM/YYYY</b>:\n\nVí dụ: 15/08/1990',
            { parse_mode: 'HTML' },
          );
          return;
        }

        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);

        if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2024) {
          await bot.sendMessage(chatId, '⚠️ Ngày sinh không hợp lệ. Vui lòng nhập lại:', {
            parse_mode: 'HTML',
          });
          return;
        }

        session.data.birthDate = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
        session.step = 'ask_birthhour';

        await bot.sendMessage(chatId, `<b>Bước 4/5:</b> Chọn <b>giờ sinh</b> (canh giờ):`, {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: birthHourKeyboard() },
        });
        break;
      }

      case 'ask_birthplace': {
        if (text.length < 2) {
          await bot.sendMessage(chatId, '⚠️ Vui lòng nhập nơi sinh (tỉnh/thành phố):', {
            parse_mode: 'HTML',
          });
          return;
        }
        session.data.birthPlace = text;
        session.step = 'confirm';

        const d = session.data;
        await bot.sendMessage(
          chatId,
          `<b>📋 XÁC NHẬN THÔNG TIN</b>\n\n` +
            `• <b>Họ tên:</b> ${escapeHtml(d.fullName || '')}\n` +
            `• <b>Giới tính:</b> ${d.gender === 'male' ? 'Nam 👨' : 'Nữ 👩'}\n` +
            `• <b>Ngày sinh:</b> ${d.birthDate}\n` +
            `• <b>Giờ sinh:</b> ${BIRTH_HOURS[d.birthHour || 0]}\n` +
            `• <b>Nơi sinh:</b> ${escapeHtml(d.birthPlace || '')}\n\n` +
            `Thông tin đã chính xác chưa?`,
          {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: confirmKeyboard() },
          },
        );
        break;
      }

      case 'processing': {
        await bot.sendMessage(chatId, '⏳ Đang xử lý lá số của bạn, vui lòng đợi...', {
          parse_mode: 'HTML',
        });
        break;
      }

      default:
        break;
    }
  });
}

async function processAstrology(bot: TelegramBot, chatId: number, userInfo: UserInfo): Promise<void> {
  let statusMsg: TelegramBot.Message | null = null;

  try {
    // Status message
    statusMsg = await bot.sendMessage(
      chatId,
      `<b>🔄 ĐANG XỬ LÝ LÁ SỐ TỬ VI</b>\n\n` +
        `⏳ Bước 1/4: Tính toán lá số 12 cung...\n` +
        `⬜ Bước 2/4: Phân tích AI chuyên sâu\n` +
        `⬜ Bước 3/4: Tạo báo cáo PDF\n` +
        `⬜ Bước 4/4: Gửi kết quả`,
      { parse_mode: 'HTML' },
    );

    // Step 1: Calculate astro
    logger.info('Bước 1: Tính toán lá số...');
    const astroResult = calculateAstro(userInfo);
    const astroData = formatAstroData(astroResult, userInfo);
    logger.success('Tính toán lá số thành công');

    // Update status
    await bot.editMessageText(
      `<b>🔄 ĐANG XỬ LÝ LÁ SỐ TỬ VI</b>\n\n` +
        `✅ Bước 1/4: Tính toán lá số 12 cung\n` +
        `⏳ Bước 2/4: Phân tích AI chuyên sâu (0/6)...\n` +
        `⬜ Bước 3/4: Tạo báo cáo PDF\n` +
        `⬜ Bước 4/4: Gửi kết quả`,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'HTML',
      },
    );

    // Step 2: AI analysis
    logger.info('Bước 2: Phân tích AI...');
    const analysisParts = await analyzeAllParts(astroData, userInfo, async (partIndex, totalParts) => {
      try {
        await bot.editMessageText(
          `<b>🔄 ĐANG XỬ LÝ LÁ SỐ TỬ VI</b>\n\n` +
            `✅ Bước 1/4: Tính toán lá số 12 cung\n` +
            `⏳ Bước 2/4: Phân tích AI chuyên sâu (${partIndex}/${totalParts})...\n` +
            `⬜ Bước 3/4: Tạo báo cáo PDF\n` +
            `⬜ Bước 4/4: Gửi kết quả`,
          {
            chat_id: chatId,
            message_id: statusMsg!.message_id,
            parse_mode: 'HTML',
          },
        );
      } catch { /* ignore rate limit errors */ }
    });

    // Update status
    await bot.editMessageText(
      `<b>🔄 ĐANG XỬ LÝ LÁ SỐ TỬ VI</b>\n\n` +
        `✅ Bước 1/4: Tính toán lá số 12 cung\n` +
        `✅ Bước 2/4: Phân tích AI chuyên sâu\n` +
        `⏳ Bước 3/4: Tạo báo cáo PDF...\n` +
        `⬜ Bước 4/4: Gửi kết quả`,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'HTML',
      },
    );

    // Step 3: Generate PDF
    logger.info('Bước 3: Tạo PDF...');
    const pdfPath = await generatePDF(userInfo, astroResult, analysisParts);

    // Update status
    await bot.editMessageText(
      `<b>🔄 ĐANG XỬ LÝ LÁ SỐ TỬ VI</b>\n\n` +
        `✅ Bước 1/4: Tính toán lá số 12 cung\n` +
        `✅ Bước 2/4: Phân tích AI chuyên sâu\n` +
        `✅ Bước 3/4: Tạo báo cáo PDF\n` +
        `⏳ Bước 4/4: Đang gửi kết quả...`,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'HTML',
      },
    );

    // Step 4: Send PDF
    logger.info('Bước 4: Gửi PDF...');
    await bot.sendDocument(chatId, pdfPath, {
      caption:
        `<b>🌟 Lá Số Tử Vi Đẩu Số</b>\n` +
        `👤 ${escapeHtml(userInfo.fullName)}\n` +
        `📅 ${userInfo.birthDate} | ⏰ ${userInfo.birthHourName}\n\n` +
        `Bản phân tích chi tiết 6 phần bên trong PDF.`,
      parse_mode: 'HTML',
    });

    // Final status
    await bot.editMessageText(
      `<b>✅ HOÀN THÀNH LÁ SỐ TỬ VI</b>\n\n` +
        `✅ Bước 1/4: Tính toán lá số 12 cung\n` +
        `✅ Bước 2/4: Phân tích AI chuyên sâu\n` +
        `✅ Bước 3/4: Tạo báo cáo PDF\n` +
        `✅ Bước 4/4: Gửi kết quả\n\n` +
        `🎉 Chúc bạn may mắn! Gõ /tuvi để xem lá số khác.`,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'HTML',
      },
    );

    logger.success(`Hoàn thành lá số cho ${userInfo.fullName}`);

    // Cleanup PDF
    try {
      fs.unlinkSync(pdfPath);
      logger.info('Đã xóa file PDF tạm');
    } catch {}

    // Reset session
    resetSession(chatId);
  } catch (error: any) {
    logger.error(`Lỗi xử lý: ${error.message}`);
    console.error(error);

    const errorMsg =
      `<b>❌ Đã xảy ra lỗi</b>\n\n` +
      `Lỗi: ${escapeHtml(error.message || 'Không xác định')}\n\n` +
      `Vui lòng gõ /tuvi để thử lại.`;

    try {
      if (statusMsg) {
        await bot.editMessageText(errorMsg, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'HTML',
        });
      } else {
        await bot.sendMessage(chatId, errorMsg, { parse_mode: 'HTML' });
      }
    } catch {
      await bot.sendMessage(chatId, '❌ Đã xảy ra lỗi. Vui lòng gõ /tuvi để thử lại.');
    }

    resetSession(chatId);
  }
}
