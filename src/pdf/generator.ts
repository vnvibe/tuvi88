import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { AnalysisPart, UserInfo } from '../astrology/types';
import { AstroResult } from '../astrology/calculator';

// Color palette
const COLORS = {
  primary: '#6B1D5E',
  accent: '#D4A843',
  background: '#FDF8F0',
  dark: '#1a0a15',
  white: '#FFFFFF',
  lightPurple: '#F3E5F5',
  text: '#333333',
  gray: '#666666',
  lightGray: '#E0E0E0',
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(dest);
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function ensureFonts(): Promise<{ regular: string; bold: string }> {
  const regularPath = path.join(config.fontsDir, 'NotoSans-Regular.ttf');
  const boldPath = path.join(config.fontsDir, 'NotoSans-Bold.ttf');

  if (!fs.existsSync(config.fontsDir)) {
    fs.mkdirSync(config.fontsDir, { recursive: true });
  }

  if (!fs.existsSync(regularPath)) {
    logger.info('Đang tải font NotoSans-Regular...');
    await downloadFile(config.fontUrl, regularPath);
    logger.success('Tải font Regular thành công');
  }

  if (!fs.existsSync(boldPath)) {
    logger.info('Đang tải font NotoSans-Bold...');
    await downloadFile(config.fontBoldUrl, boldPath);
    logger.success('Tải font Bold thành công');
  }

  return { regular: regularPath, bold: boldPath };
}

function drawPageBorder(doc: PDFKit.PDFDocument) {
  doc
    .rect(15, 15, PAGE_WIDTH - 30, PAGE_HEIGHT - 30)
    .lineWidth(1)
    .strokeColor(COLORS.accent)
    .stroke();
  doc
    .rect(20, 20, PAGE_WIDTH - 40, PAGE_HEIGHT - 40)
    .lineWidth(0.5)
    .strokeColor(COLORS.primary)
    .stroke();
}

function addCoverPage(
  doc: PDFKit.PDFDocument,
  fonts: { regular: string; bold: string },
  userInfo: UserInfo,
  astroResult: AstroResult,
) {
  // Dark background
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(COLORS.dark);

  // Decorative borders
  doc.rect(20, 20, PAGE_WIDTH - 40, PAGE_HEIGHT - 40).lineWidth(2).strokeColor(COLORS.accent).stroke();
  doc.rect(30, 30, PAGE_WIDTH - 60, PAGE_HEIGHT - 60).lineWidth(0.5).strokeColor(COLORS.primary).stroke();

  // Corner decorations
  const cornerSize = 30;
  const corners = [
    [35, 35],
    [PAGE_WIDTH - 35 - cornerSize, 35],
    [35, PAGE_HEIGHT - 35 - cornerSize],
    [PAGE_WIDTH - 35 - cornerSize, PAGE_HEIGHT - 35 - cornerSize],
  ];
  corners.forEach(([x, y]) => {
    doc.rect(x, y, cornerSize, cornerSize).lineWidth(1).strokeColor(COLORS.accent).stroke();
  });

  // Top decorative line
  const lineY = 180;
  doc
    .moveTo(100, lineY)
    .lineTo(PAGE_WIDTH / 2 - 50, lineY)
    .strokeColor(COLORS.accent)
    .lineWidth(1)
    .stroke();
  doc
    .moveTo(PAGE_WIDTH / 2 + 50, lineY)
    .lineTo(PAGE_WIDTH - 100, lineY)
    .strokeColor(COLORS.accent)
    .lineWidth(1)
    .stroke();

  // Star symbol
  doc.font(fonts.bold).fontSize(30).fillColor(COLORS.accent).text('✦', 0, lineY - 18, { align: 'center' });

  // Title
  doc.font(fonts.bold).fontSize(36).fillColor(COLORS.accent).text('TỬ VI ĐẨU SỐ', 0, 220, { align: 'center' });

  doc
    .font(fonts.regular)
    .fontSize(16)
    .fillColor(COLORS.white)
    .text('Phân Tích Lá Số Chi Tiết', 0, 270, { align: 'center' });

  // Bottom decorative line
  const lineY2 = 310;
  doc.moveTo(150, lineY2).lineTo(PAGE_WIDTH - 150, lineY2).strokeColor(COLORS.accent).lineWidth(0.5).stroke();

  // User info box
  const boxY = 360;
  const boxHeight = 220;
  doc
    .roundedRect(MARGIN + 30, boxY, CONTENT_WIDTH - 60, boxHeight, 10)
    .lineWidth(1)
    .strokeColor(COLORS.accent)
    .stroke();

  const infoLines = [
    { label: 'Họ và Tên', value: userInfo.fullName },
    { label: 'Giới tính', value: userInfo.gender === 'male' ? 'Nam' : 'Nữ' },
    { label: 'Ngày sinh', value: userInfo.birthDate },
    { label: 'Giờ sinh', value: userInfo.birthHourName },
    { label: 'Nơi sinh', value: userInfo.birthPlace },
    { label: 'Mệnh chủ', value: astroResult.soul || 'N/A' },
    { label: 'Thân chủ', value: astroResult.body || 'N/A' },
    { label: 'Ngũ hành cục', value: astroResult.fiveElementsClass || 'N/A' },
  ];

  let infoY = boxY + 20;
  infoLines.forEach((line) => {
    doc
      .font(fonts.regular)
      .fontSize(11)
      .fillColor(COLORS.accent)
      .text(`${line.label}:`, MARGIN + 60, infoY, { continued: true })
      .font(fonts.bold)
      .fillColor(COLORS.white)
      .text(`  ${line.value}`, { continued: false });
    infoY += 24;
  });

  // Bottom decoration
  doc
    .font(fonts.regular)
    .fontSize(10)
    .fillColor(COLORS.gray)
    .text('Được tạo bởi Bot Tử Vi Đẩu Số AI', 0, PAGE_HEIGHT - 80, { align: 'center' });

  doc
    .font(fonts.regular)
    .fontSize(9)
    .fillColor(COLORS.gray)
    .text(`Ngày lập: ${new Date().toLocaleDateString('vi-VN')}`, 0, PAGE_HEIGHT - 65, { align: 'center' });
}

function addTableOfContents(doc: PDFKit.PDFDocument, fonts: { regular: string; bold: string }, parts: AnalysisPart[]) {
  doc.addPage();
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(COLORS.background);
  drawPageBorder(doc);

  // Header
  doc
    .roundedRect(MARGIN, 40, CONTENT_WIDTH, 50, 5)
    .fill(COLORS.primary);
  doc.font(fonts.bold).fontSize(22).fillColor(COLORS.white).text('MỤC LỤC', MARGIN, 52, {
    width: CONTENT_WIDTH,
    align: 'center',
  });

  // Decorative line
  doc.moveTo(MARGIN + 50, 110).lineTo(PAGE_WIDTH - MARGIN - 50, 110).strokeColor(COLORS.accent).lineWidth(1).stroke();

  let y = 140;
  parts.forEach((part, index) => {
    // Number circle
    doc.circle(MARGIN + 30, y + 18, 18).fill(COLORS.primary);
    doc
      .font(fonts.bold)
      .fontSize(14)
      .fillColor(COLORS.white)
      .text(`${index + 1}`, MARGIN + 18, y + 11, { width: 24, align: 'center' });

    // Icon and title
    doc
      .font(fonts.bold)
      .fontSize(15)
      .fillColor(COLORS.primary)
      .text(`${part.icon}  ${part.title}`, MARGIN + 60, y + 5);

    // Description
    doc
      .font(fonts.regular)
      .fontSize(10)
      .fillColor(COLORS.gray)
      .text(part.description, MARGIN + 60, y + 25);

    // Separator
    if (index < parts.length - 1) {
      doc
        .moveTo(MARGIN + 60, y + 50)
        .lineTo(PAGE_WIDTH - MARGIN, y + 50)
        .strokeColor(COLORS.lightGray)
        .lineWidth(0.5)
        .stroke();
    }

    y += 65;
  });
}

interface RenderState {
  y: number;
}

function ensureSpace(doc: PDFKit.PDFDocument, state: RenderState, needed: number): void {
  if (state.y + needed > PAGE_HEIGHT - 60) {
    doc.addPage();
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(COLORS.background);
    drawPageBorder(doc);
    state.y = 40;
  }
}

function renderRichContent(
  doc: PDFKit.PDFDocument,
  fonts: { regular: string; bold: string },
  content: string,
  startY: number,
): number {
  const state: RenderState = { y: startY };
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      state.y += 8;
      continue;
    }

    // ## Heading
    if (trimmed.startsWith('## ')) {
      const headingText = trimmed.replace(/^#+\s*/, '').toUpperCase();
      ensureSpace(doc, state, 40);

      // Purple left border + light background
      doc.roundedRect(MARGIN, state.y, CONTENT_WIDTH, 30, 3).fill(COLORS.lightPurple);
      doc.rect(MARGIN, state.y, 4, 30).fill(COLORS.primary);
      doc
        .font(fonts.bold)
        .fontSize(12)
        .fillColor(COLORS.primary)
        .text(headingText, MARGIN + 15, state.y + 8, { width: CONTENT_WIDTH - 25 });
      state.y += 40;
      continue;
    }

    // • Bullet point
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      const bulletText = trimmed.replace(/^[•\-]\s*/, '');
      ensureSpace(doc, state, 30);

      // Light background for bullet
      const textHeight = doc.font(fonts.regular).fontSize(10).heightOfString(bulletText, {
        width: CONTENT_WIDTH - 40,
      });
      const bulletHeight = Math.max(textHeight + 10, 22);

      doc.roundedRect(MARGIN + 10, state.y, CONTENT_WIDTH - 20, bulletHeight, 2).fill('#FAF5EB');

      // Gold dot
      doc.circle(MARGIN + 22, state.y + 10, 3).fill(COLORS.accent);

      // Render bullet text with bold markers
      renderTextWithBold(doc, fonts, bulletText, MARGIN + 32, state.y + 4, CONTENT_WIDTH - 50);

      state.y += bulletHeight + 4;
      continue;
    }

    // Regular paragraph
    ensureSpace(doc, state, 20);
    const paraHeight = renderTextWithBold(doc, fonts, trimmed, MARGIN + 5, state.y, CONTENT_WIDTH - 10);
    state.y += paraHeight + 6;
  }

  return state.y;
}

function renderTextWithBold(
  doc: PDFKit.PDFDocument,
  fonts: { regular: string; bold: string },
  text: string,
  x: number,
  y: number,
  maxWidth: number,
): number {
  // Split text by **bold** markers
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  let fullText = '';
  const segments: { text: string; bold: boolean }[] = [];

  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      segments.push({ text: inner, bold: true });
      fullText += inner;
    } else {
      segments.push({ text: part, bold: false });
      fullText += part;
    }
  }

  // Calculate total height first
  const height = doc.font(fonts.regular).fontSize(10).heightOfString(fullText, {
    width: maxWidth,
    align: 'justify',
    lineGap: 4,
  });

  // For simplicity with mixed bold/regular in PDFKit, render segments inline
  // PDFKit doesn't natively support inline bold switching well with wrapping,
  // so we render the full text with regular font and overlay bold parts
  // A practical approach: just render the whole text, applying bold to the entire text if it has bold markers
  const hasBold = segments.some((s) => s.bold);

  if (hasBold && segments.length <= 3) {
    // Simple case: render with continued text
    let isFirst = true;
    for (const seg of segments) {
      if (!seg.text) continue;
      doc
        .font(seg.bold ? fonts.bold : fonts.regular)
        .fontSize(10)
        .fillColor(seg.bold ? COLORS.primary : COLORS.text);

      if (isFirst) {
        doc.text(seg.text, x, y, {
          width: maxWidth,
          continued: segments.indexOf(seg) < segments.length - 1 && segments.slice(segments.indexOf(seg) + 1).some(s => s.text),
          lineGap: 4,
        });
        isFirst = false;
      } else {
        const isLast = segments.indexOf(seg) === segments.length - 1 || !segments.slice(segments.indexOf(seg) + 1).some(s => s.text);
        doc.text(seg.text, {
          continued: !isLast,
          lineGap: 4,
        });
      }
    }
  } else {
    // Fallback: render as regular text
    doc
      .font(fonts.regular)
      .fontSize(10)
      .fillColor(COLORS.text)
      .text(fullText, x, y, {
        width: maxWidth,
        align: 'justify',
        lineGap: 4,
      });
  }

  return height;
}

function addAnalysisPage(
  doc: PDFKit.PDFDocument,
  fonts: { regular: string; bold: string },
  part: AnalysisPart,
  partIndex: number,
) {
  doc.addPage();
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(COLORS.background);
  drawPageBorder(doc);

  // Header bar
  doc.roundedRect(MARGIN, 30, CONTENT_WIDTH, 45, 5).fill(COLORS.primary);

  doc
    .font(fonts.bold)
    .fontSize(18)
    .fillColor(COLORS.white)
    .text(`${part.icon}  ${part.title}`, MARGIN + 15, 42, { width: CONTENT_WIDTH - 30 });

  // Subtitle
  doc
    .font(fonts.regular)
    .fontSize(9)
    .fillColor(COLORS.accent)
    .text(part.description, MARGIN + 15, 65, { width: CONTENT_WIDTH - 30 });

  // Accent line
  doc.moveTo(MARGIN, 85).lineTo(PAGE_WIDTH - MARGIN, 85).strokeColor(COLORS.accent).lineWidth(1).stroke();

  // Content
  renderRichContent(doc, fonts, part.content, 100);

  // Page number
  doc
    .font(fonts.regular)
    .fontSize(8)
    .fillColor(COLORS.gray)
    .text(`Trang ${partIndex + 3}`, 0, PAGE_HEIGHT - 40, { align: 'center', width: PAGE_WIDTH });
}

function addDisclaimerPage(doc: PDFKit.PDFDocument, fonts: { regular: string; bold: string }) {
  doc.addPage();
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(COLORS.background);
  drawPageBorder(doc);

  const centerX = PAGE_WIDTH / 2;

  doc.font(fonts.bold).fontSize(20).fillColor(COLORS.primary).text('✦', 0, 200, { align: 'center' });

  doc.font(fonts.bold).fontSize(16).fillColor(COLORS.primary).text('LƯU Ý QUAN TRỌNG', 0, 240, { align: 'center' });

  doc.moveTo(200, 270).lineTo(PAGE_WIDTH - 200, 270).strokeColor(COLORS.accent).lineWidth(1).stroke();

  const disclaimer = `Bản phân tích tử vi này được tạo bởi trí tuệ nhân tạo dựa trên
dữ liệu lá số Tử Vi Đẩu Số truyền thống. Kết quả chỉ mang tính
chất tham khảo và giải trí.

Tử vi không quyết định số phận con người. Mỗi người đều có khả
năng tự quyết định cuộc đời mình thông qua nỗ lực, học hỏi và
những lựa chọn đúng đắn.

Hãy sử dụng thông tin này như một công cụ để hiểu bản thân tốt
hơn, không phải để giới hạn tiềm năng của chính mình.`;

  doc
    .font(fonts.regular)
    .fontSize(11)
    .fillColor(COLORS.text)
    .text(disclaimer, MARGIN + 40, 290, {
      width: CONTENT_WIDTH - 80,
      align: 'center',
      lineGap: 6,
    });

  doc.moveTo(200, 500).lineTo(PAGE_WIDTH - 200, 500).strokeColor(COLORS.accent).lineWidth(1).stroke();

  doc
    .font(fonts.bold)
    .fontSize(14)
    .fillColor(COLORS.accent)
    .text('Chúc bạn luôn bình an và hạnh phúc! ✦', 0, 530, { align: 'center' });

  doc
    .font(fonts.regular)
    .fontSize(9)
    .fillColor(COLORS.gray)
    .text('Bot Tử Vi Đẩu Số AI — Powered by Deepseek & iztro', 0, PAGE_HEIGHT - 60, { align: 'center' });
}

export async function generatePDF(
  userInfo: UserInfo,
  astroResult: AstroResult,
  analysisParts: AnalysisPart[],
): Promise<string> {
  const fonts = await ensureFonts();

  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  const fileName = `tuvi_${userInfo.fullName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  const filePath = path.join(config.outputDir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `Tử Vi Đẩu Số - ${userInfo.fullName}`,
        Author: 'Bot Tử Vi Đẩu Số AI',
        Subject: 'Phân tích lá số tử vi đẩu số chi tiết',
      },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // 1. Cover page
    addCoverPage(doc, fonts, userInfo, astroResult);

    // 2. Table of contents
    addTableOfContents(doc, fonts, analysisParts);

    // 3. Analysis pages
    analysisParts.forEach((part, index) => {
      addAnalysisPage(doc, fonts, part, index);
    });

    // 4. Disclaimer page
    addDisclaimerPage(doc, fonts);

    doc.end();

    stream.on('finish', () => {
      logger.success(`PDF đã được tạo: ${filePath}`);
      resolve(filePath);
    });

    stream.on('error', (err) => {
      logger.error(`Lỗi tạo PDF: ${err.message}`);
      reject(err);
    });
  });
}
