import OpenAI from 'openai';
import { config } from '../utils/config';
import { logger } from '../utils/logger';
import { AnalysisPart, UserInfo } from '../astrology/types';

const client = new OpenAI({
  apiKey: config.deepseekApiKey,
  baseURL: config.deepseekBaseUrl,
});

const SYSTEM_PROMPT = `Bạn là một chuyên gia Tử Vi Đẩu Số hàng đầu Việt Nam với hơn 40 năm kinh nghiệm.
Bạn phân tích lá số tử vi rất chi tiết, sâu sắc, kết hợp kiến thức cổ điển và hiện đại.

YÊU CẦU FORMAT BẮT BUỘC:
- Tiêu đề phụ: bắt đầu bằng ## (ví dụ: ## Mệnh Cung)
- In đậm: bọc trong ** (ví dụ: **Tử Vi miếu địa**)
- Liệt kê: bắt đầu bằng • (ví dụ: • Sao Tử Vi tọa Mệnh)
- Đoạn văn phân tích: viết bình thường, chi tiết, sâu sắc
- Mỗi phần phải có ít nhất 2-3 tiêu đề phụ ## và kết hợp đoạn văn + bullet points
- Viết hoàn toàn bằng tiếng Việt
- Phân tích dựa trên dữ liệu lá số được cung cấp, KHÔNG bịa thêm sao hay cung không có trong dữ liệu
- Độ dài mỗi phần: 400-600 từ`;

interface AnalysisSection {
  title: string;
  icon: string;
  description: string;
  prompt: string;
}

const ANALYSIS_SECTIONS: AnalysisSection[] = [
  {
    title: 'Tổng Quan Lá Số',
    icon: '⭐',
    description: 'Mệnh cung, Thân cung, Ngũ hành cục, Cách cục, Tính cách',
    prompt: `Phân tích TỔNG QUAN LÁ SỐ TỬ VI cho người này. Bao gồm:
- Mệnh cung: sao nào tọa thủ, ý nghĩa, miếu/vượng/đắc/hãm
- Thân cung: vị trí, ảnh hưởng đến nửa đời sau
- Ngũ hành cục: ý nghĩa, tương sinh tương khắc
- Cách cục chính: xác định cách cục dựa trên bộ sao
- Tính cách con người: ưu điểm, nhược điểm, tâm tính`,
  },
  {
    title: 'Sự Nghiệp & Tài Lộc',
    icon: '💼',
    description: 'Quan Lộc, Tài Bạch, Ngành nghề phù hợp',
    prompt: `Phân tích SỰ NGHIỆP VÀ TÀI LỘC. Bao gồm:
- Cung Quan Lộc: sao tọa thủ, con đường sự nghiệp, kiểu làm việc
- Cung Tài Bạch: khả năng tài chính, cách kiếm tiền, giữ tiền
- Ngành nghề phù hợp nhất (ít nhất 3-5 ngành cụ thể)
- Thời điểm thuận lợi cho sự nghiệp
- Lời khuyên phát triển nghề nghiệp`,
  },
  {
    title: 'Tình Duyên & Gia Đạo',
    icon: '❤️',
    description: 'Phu Thê, Tử Tức, Phụ Mẫu, Huynh Đệ',
    prompt: `Phân tích TÌNH DUYÊN VÀ GIA ĐẠO. Bao gồm:
- Cung Phu Thê: đặc điểm người bạn đời, tuổi hợp, hôn nhân sớm/muộn
- Cung Tử Tức: con cái, số con, mối quan hệ với con
- Cung Phụ Mẫu: mối quan hệ với cha mẹ, ảnh hưởng gia đình
- Cung Huynh Đệ: anh chị em, bạn bè, đồng nghiệp
- Lời khuyên cho đời sống tình cảm`,
  },
  {
    title: 'Sức Khỏe & Phúc Đức',
    icon: '🏥',
    description: 'Tật Ách, Phúc Đức, Điền Trạch',
    prompt: `Phân tích SỨC KHỎE VÀ PHÚC ĐỨC. Bao gồm:
- Cung Tật Ách: bệnh tật cần đề phòng, bộ phận cơ thể yếu
- Cung Phúc Đức: phúc phần, đời sống tinh thần, tuổi thọ
- Cung Điền Trạch: nhà cửa, bất động sản, tài sản cố định
- Cách phòng bệnh và bảo vệ sức khỏe
- Phong thủy và hướng tốt`,
  },
  {
    title: 'Vận Hạn 10 Năm Tới',
    icon: '🔮',
    description: 'Đại hạn, Lưu niên 2025-2035',
    prompt: `Phân tích VẬN HẠN 10 NĂM TỚI (2025-2035). Bao gồm:
- Đại hạn hiện tại đang đi: ảnh hưởng chung
- Lưu niên từng năm từ 2025 đến 2035: mỗi năm nêu xu hướng chính (tốt/xấu/bình), sự kiện có thể xảy ra
- Năm nào thuận lợi nhất, năm nào cần cẩn thận
- Những mốc thời gian quan trọng cần lưu ý
- Cách hóa giải vận xấu nếu có`,
  },
  {
    title: 'Lời Khuyên Tổng Hợp',
    icon: '💎',
    description: 'Điểm mạnh/yếu, Quý nhân, May mắn',
    prompt: `Đưa ra LỜI KHUYÊN TỔNG HỢP. Bao gồm:
- Tổng kết điểm mạnh nổi bật nhất (3-5 điểm)
- Điểm yếu cần khắc phục (3-5 điểm)
- Quý nhân phù trợ: tuổi nào, hướng nào, ai giúp đỡ
- Con số may mắn, màu sắc may mắn, hướng tốt
- Lời khuyên cuộc sống tổng quát để phát huy lá số
- Câu kết thúc động viên, tích cực`,
  },
];

async function analyzeSinglePart(
  section: AnalysisSection,
  astroData: string,
  userInfo: UserInfo,
): Promise<AnalysisPart> {
  const userPrompt = `Thông tin người xem:
- Họ tên: ${userInfo.fullName}
- Giới tính: ${userInfo.gender === 'male' ? 'Nam' : 'Nữ'}
- Ngày sinh: ${userInfo.birthDate}
- Giờ sinh: ${userInfo.birthHourName}
- Nơi sinh: ${userInfo.birthPlace}

DỮ LIỆU LÁ SỐ TỬ VI:
${astroData}

YÊU CẦU: ${section.prompt}`;

  try {
    const response = await client.chat.completions.create({
      model: config.deepseekModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content || 'Không có dữ liệu phân tích.';
    return { title: section.title, icon: section.icon, description: section.description, content };
  } catch (error: any) {
    logger.error(`Lỗi phân tích phần ${section.title}: ${error.message}`);
    return {
      title: section.title,
      icon: section.icon,
      description: section.description,
      content: `Không thể phân tích phần này do lỗi kết nối. Vui lòng thử lại sau.`,
    };
  }
}

export async function analyzeAllParts(
  astroData: string,
  userInfo: UserInfo,
  onProgress: (partIndex: number, totalParts: number) => Promise<void>,
): Promise<AnalysisPart[]> {
  const total = ANALYSIS_SECTIONS.length;
  await onProgress(0, total);

  logger.ai(`Phân tích song song ${total} phần...`);

  // Run all 6 parts in parallel
  const promises = ANALYSIS_SECTIONS.map((section, i) => {
    logger.ai(`Bắt đầu phần ${i + 1}/${total}: ${section.title}`);
    return analyzeSinglePart(section, astroData, userInfo);
  });

  const results = await Promise.all(promises);

  await onProgress(total, total);
  logger.success(`Hoàn thành tất cả ${total} phần`);

  return results;
}
