export interface UserInfo {
  fullName: string;
  gender: 'male' | 'female';
  birthDate: string;       // DD/MM/YYYY
  birthHour: number;       // 0-11 (index of 12 canh giờ)
  birthHourName: string;   // Tý, Sửu, ...
  birthPlace: string;
}

export type ConversationStep =
  | 'idle'
  | 'ask_name'
  | 'ask_gender'
  | 'ask_birthdate'
  | 'ask_birthhour'
  | 'ask_birthplace'
  | 'confirm'
  | 'processing';

export interface ConversationState {
  step: ConversationStep;
  data: Partial<UserInfo>;
  messageId?: number;
}

export interface AnalysisPart {
  title: string;
  icon: string;
  description: string;
  content: string;
}

export const BIRTH_HOURS = [
  'Tý (23h-1h)',
  'Sửu (1h-3h)',
  'Dần (3h-5h)',
  'Mão (5h-7h)',
  'Thìn (7h-9h)',
  'Tỵ (9h-11h)',
  'Ngọ (11h-13h)',
  'Mùi (13h-15h)',
  'Thân (15h-17h)',
  'Dậu (17h-19h)',
  'Tuất (19h-21h)',
  'Hợi (21h-23h)',
];

export const BIRTH_HOUR_NAMES = [
  'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ',
  'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi',
];
