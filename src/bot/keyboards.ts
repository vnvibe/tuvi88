import { InlineKeyboardButton } from 'node-telegram-bot-api';
import { BIRTH_HOURS } from '../astrology/types';

export function genderKeyboard(): InlineKeyboardButton[][] {
  return [
    [
      { text: '👨 Nam', callback_data: 'gender_male' },
      { text: '👩 Nữ', callback_data: 'gender_female' },
    ],
  ];
}

export function birthHourKeyboard(): InlineKeyboardButton[][] {
  const rows: InlineKeyboardButton[][] = [];
  for (let i = 0; i < BIRTH_HOURS.length; i += 3) {
    const row: InlineKeyboardButton[] = [];
    for (let j = i; j < Math.min(i + 3, BIRTH_HOURS.length); j++) {
      row.push({
        text: BIRTH_HOURS[j],
        callback_data: `hour_${j}`,
      });
    }
    rows.push(row);
  }
  return rows;
}

export function confirmKeyboard(): InlineKeyboardButton[][] {
  return [
    [
      { text: '✅ Xác nhận', callback_data: 'confirm_yes' },
      { text: '🔄 Nhập lại', callback_data: 'confirm_no' },
    ],
  ];
}
