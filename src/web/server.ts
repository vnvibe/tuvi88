import express from 'express';
import path from 'path';
import { calculateAstro, formatAstroData } from '../astrology/calculator';
import { analyzeAllParts } from '../ai/deepseek';
import { generatePDF } from '../pdf/generator';
import { UserInfo } from '../astrology/types';
import { logger } from '../utils/logger';
import fs from 'fs';

const app = express();
app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../../public')));

// Serve fonts for PDF download
app.use('/output', express.static(path.resolve(__dirname, '../../output')));

// SSE endpoint for real-time analysis
app.post('/api/tuvi', async (req, res) => {
  const { fullName, gender, birthDate, birthHour, birthHourName, birthPlace } = req.body;

  if (!fullName || !gender || !birthDate || birthHour === undefined || !birthHourName || !birthPlace) {
    res.status(400).json({ error: 'Thiếu thông tin. Vui lòng điền đầy đủ.' });
    return;
  }

  // Validate date
  const dateMatch = birthDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!dateMatch) {
    res.status(400).json({ error: 'Ngày sinh không đúng định dạng DD/MM/YYYY.' });
    return;
  }

  const userInfo: UserInfo = {
    fullName,
    gender,
    birthDate,
    birthHour: Number(birthHour),
    birthHourName,
    birthPlace,
  };

  // Set up SSE
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
    send('progress', { step: 1, total: 4, message: 'Đang tính toán lá số 12 cung...' });
    logger.info(`Web: Tính lá số cho ${fullName}`);

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
    send('progress', { step: 2, total: 4, message: 'AI đang phân tích lá số...' });

    const analysisParts = await analyzeAllParts(astroData, userInfo, async (partIndex, totalParts) => {
      send('progress', {
        step: 2,
        total: 4,
        message: `Đang phân tích phần ${partIndex + 1}/${totalParts}...`,
        sub: partIndex,
        subTotal: totalParts,
      });
    });

    // Send each part as it completes
    for (let i = 0; i < analysisParts.length; i++) {
      send('analysis', { index: i, part: analysisParts[i] });
    }

    // Step 3: Generate PDF
    send('progress', { step: 3, total: 4, message: 'Đang tạo báo cáo PDF...' });
    const pdfPath = await generatePDF(userInfo, astroResult, analysisParts);
    const pdfFileName = path.basename(pdfPath);

    // Move PDF to output for serving
    const servePath = path.resolve(__dirname, '../../output', pdfFileName);
    if (pdfPath !== servePath) {
      fs.copyFileSync(pdfPath, servePath);
    }

    // Step 4: Done
    send('progress', { step: 4, total: 4, message: 'Hoàn thành!' });
    send('complete', { pdfUrl: `/output/${pdfFileName}` });

    res.end();

    // Cleanup after 5 minutes
    setTimeout(() => {
      try { fs.unlinkSync(servePath); } catch {}
      try { if (pdfPath !== servePath) fs.unlinkSync(pdfPath); } catch {}
    }, 5 * 60 * 1000);

    logger.success(`Web: Hoàn thành lá số cho ${fullName}`);
  } catch (error: any) {
    logger.error(`Web: Lỗi - ${error.message}`);
    send('error', { message: error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.' });
    res.end();
  }
});

// SPA fallback
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.resolve(__dirname, '../../public/index.html'));
});

export function startWebServer(port = 3000) {
  app.listen(port, () => {
    logger.success(`Web server đang chạy tại http://localhost:${port}`);
  });
}
