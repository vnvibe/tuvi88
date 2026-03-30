import { astro } from 'iztro';
import { UserInfo } from './types';
import { logger } from '../utils/logger';

export interface PalaceInfo {
  name: string;
  isBodyPalace: boolean;
  heavenlyStem: string;
  earthlyBranch: string;
  majorStars: string[];
  minorStars: string[];
  adjectiveStars: string[];
  changsheng12: string;
  boshi12: string;
  ages: number[];
  decadalRange: string;
}

export interface AstroResult {
  solarDate: string;
  lunarDate: string;
  chineseDate: string;
  gender: string;
  zodiac: string;         // Con giáp
  sign: string;           // Cung hoàng đạo
  soul: string;           // Mệnh chủ (sao chủ mệnh)
  body: string;           // Thân chủ (sao chủ thân)
  fiveElementsClass: string; // Ngũ hành cục
  earthlyBranchOfSoulPalace: string;
  earthlyBranchOfBodyPalace: string;
  palaces: PalaceInfo[];
  rawData: any;
}

export function calculateAstro(userInfo: UserInfo): AstroResult {
  const [day, month, year] = userInfo.birthDate.split('/').map(Number);
  const solarDate = `${year}-${month}-${day}`;
  const genderStr = userInfo.gender === 'male' ? '男' : '女';

  logger.info(`Tính lá số: ${solarDate}, giờ ${userInfo.birthHourName}, ${genderStr}`);

  const result = astro.bySolar(solarDate, userInfo.birthHour, genderStr, true, 'vi-VN');

  const palaces: PalaceInfo[] = [];

  for (let i = 0; i < 12; i++) {
    const palace = result.palace(i);
    if (palace) {
      const decadal = (palace as any).decadal;
      palaces.push({
        name: palace.name || `Cung ${i}`,
        isBodyPalace: palace.isBodyPalace || false,
        heavenlyStem: palace.heavenlyStem || '',
        earthlyBranch: palace.earthlyBranch || '',
        majorStars: (palace.majorStars || []).map((s: any) => {
          const name = s.name || '';
          const brightness = s.brightness || '';
          const mutagen = s.mutagen || '';
          return `${name}${brightness ? ` (${brightness})` : ''}${mutagen ? ` [${mutagen}]` : ''}`;
        }),
        minorStars: (palace.minorStars || []).map((s: any) => {
          const name = s.name || '';
          const brightness = s.brightness || '';
          const mutagen = s.mutagen || '';
          return `${name}${brightness ? ` (${brightness})` : ''}${mutagen ? ` [${mutagen}]` : ''}`;
        }),
        adjectiveStars: (palace.adjectiveStars || []).map((s: any) => s.name || ''),
        changsheng12: (palace as any).changsheng12 || '',
        boshi12: (palace as any).boshi12 || '',
        ages: palace.ages || [],
        decadalRange: decadal?.range
          ? `${decadal.range[0]}-${decadal.range[1]}`
          : '',
      });
    }
  }

  const r = result as any;

  // Build readable lunar date from rawDates
  let lunarDateStr = r.lunarDate || '';
  if (r.rawDates?.lunarDate) {
    const ld = r.rawDates.lunarDate;
    lunarDateStr = `${ld.lunarDay}/${ld.lunarMonth}/${ld.lunarYear} (Âm lịch)${ld.isLeap ? ' - Tháng nhuận' : ''}`;
  }

  return {
    solarDate,
    lunarDate: lunarDateStr,
    chineseDate: r.chineseDate || '',
    gender: userInfo.gender === 'male' ? 'Nam' : 'Nữ',
    zodiac: r.zodiac || '',
    sign: r.sign || '',
    soul: r.soul || '',
    body: r.body || '',
    fiveElementsClass: r.fiveElementsClass || '',
    earthlyBranchOfSoulPalace: r.earthlyBranchOfSoulPalace || '',
    earthlyBranchOfBodyPalace: r.earthlyBranchOfBodyPalace || '',
    palaces,
    rawData: result,
  };
}

export function formatAstroData(astroResult: AstroResult, userInfo: UserInfo): string {
  let text = '';

  text += `=== LÁ SỐ TỬ VI ĐẨU SỐ ===\n`;
  text += `Họ tên: ${userInfo.fullName}\n`;
  text += `Giới tính: ${astroResult.gender}\n`;
  text += `Ngày sinh dương lịch: ${userInfo.birthDate}\n`;
  text += `Ngày sinh âm lịch: ${astroResult.lunarDate}\n`;
  text += `Ngày Can Chi: ${astroResult.chineseDate}\n`;
  text += `Giờ sinh: ${userInfo.birthHourName}\n`;
  text += `Nơi sinh: ${userInfo.birthPlace}\n`;
  text += `Con giáp: ${astroResult.zodiac}\n`;
  text += `Cung hoàng đạo: ${astroResult.sign}\n`;
  text += `Mệnh chủ: ${astroResult.soul}\n`;
  text += `Thân chủ: ${astroResult.body}\n`;
  text += `Ngũ hành cục: ${astroResult.fiveElementsClass}\n`;
  text += `Cung Mệnh tại: ${astroResult.earthlyBranchOfSoulPalace}\n`;
  text += `Cung Thân tại: ${astroResult.earthlyBranchOfBodyPalace}\n\n`;

  text += `=== CHI TIẾT 12 CUNG ===\n\n`;

  for (const palace of astroResult.palaces) {
    text += `--- ${palace.name} (${palace.heavenlyStem} ${palace.earthlyBranch})${palace.isBodyPalace ? ' [Thân cung]' : ''} ---\n`;

    if (palace.majorStars.length > 0) {
      text += `Chính tinh: ${palace.majorStars.join(', ')}\n`;
    } else {
      text += `Chính tinh: (Trống - Vô chính diệu)\n`;
    }
    if (palace.minorStars.length > 0) {
      text += `Phụ tinh: ${palace.minorStars.join(', ')}\n`;
    }
    if (palace.adjectiveStars.length > 0) {
      text += `Tạp diệu: ${palace.adjectiveStars.join(', ')}\n`;
    }
    if (palace.changsheng12) {
      text += `Trường Sinh 12: ${palace.changsheng12}\n`;
    }
    if (palace.decadalRange) {
      text += `Đại hạn: ${palace.decadalRange} tuổi\n`;
    }
    text += '\n';
  }

  return text;
}
