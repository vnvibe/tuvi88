import type { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateAstro, formatAstroData } from '../src/astrology/calculator';
import { analyzeAllParts } from '../src/ai/deepseek';
import { UserInfo } from '../src/astrology/types';

export const config = {
  maxDuration: 120,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fullName, gender, birthDate, birthHour, birthHourName, birthPlace } = req.body;

  if (!fullName || !gender || !birthDate || birthHour === undefined || !birthHourName || !birthPlace) {
    return res.status(400).json({ error: 'Thiếu thông tin. Vui lòng điền đầy đủ.' });
  }

  const dateMatch = birthDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!dateMatch) {
    return res.status(400).json({ error: 'Ngày sinh không đúng định dạng DD/MM/YYYY.' });
  }

  const userInfo: UserInfo = {
    fullName,
    gender,
    birthDate,
    birthHour: Number(birthHour),
    birthHourName,
    birthPlace,
  };

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Step 1: Calculate astro
    send('progress', { step: 1, total: 3, message: 'Đang tính toán lá số 12 cung...' });

    const astroResult = calculateAstro(userInfo);
    const astroData = formatAstroData(astroResult, userInfo);

    send('astro', {
      soul: astroResult.soul,
      body: astroResult.body,
      fiveElementsClass: astroResult.fiveElementsClass,
      zodiac: astroResult.zodiac,
      sign: astroResult.sign,
      lunarDate: astroResult.lunarDate,
      chineseDate: astroResult.chineseDate,
      earthlyBranchOfSoulPalace: astroResult.earthlyBranchOfSoulPalace,
      earthlyBranchOfBodyPalace: astroResult.earthlyBranchOfBodyPalace,
      palaces: astroResult.palaces,
    });

    // Step 2: AI analysis
    send('progress', { step: 2, total: 3, message: 'AI đang phân tích lá số...' });

    const analysisParts = await analyzeAllParts(astroData, userInfo, async (partIndex, totalParts) => {
      send('progress', {
        step: 2,
        total: 3,
        message: `Đang phân tích phần ${partIndex + 1}/${totalParts}...`,
        sub: partIndex,
        subTotal: totalParts,
      });
    });

    for (let i = 0; i < analysisParts.length; i++) {
      send('analysis', { index: i, part: analysisParts[i] });
    }

    // Step 3: Done (no PDF on Vercel — serverless has no writable FS)
    send('progress', { step: 3, total: 3, message: 'Hoàn thành!' });
    send('complete', { pdfUrl: null });

    res.end();
  } catch (error: any) {
    send('error', { message: error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.' });
    res.end();
  }
}
