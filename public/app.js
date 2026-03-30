// =============================================
// TỬ VI ĐẨU SỐ - FRONTEND APP
// =============================================

const HOUR_NAMES = ['Tý','Sửu','Dần','Mão','Thìn','Tỵ','Ngọ','Mùi','Thân','Dậu','Tuất','Hợi'];
const SECTION_ICONS = ['⭐','💼','❤️','🏥','🔮','💎'];

// ---- Particles ----
(function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = (60 + Math.random() * 40) + '%';
    p.style.animationDelay = Math.random() * 6 + 's';
    p.style.animationDuration = (4 + Math.random() * 4) + 's';
    container.appendChild(p);
  }
})();

// ---- Helpers ----
function scrollToForm() {
  document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
}

function showSection(id) {
  document.getElementById(id).style.display = '';
}

function hideSection(id) {
  document.getElementById(id).style.display = 'none';
}

function showError(msg) {
  let toast = document.querySelector('.error-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'error-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

function resetForm() {
  hideSection('results-section');
  hideSection('progress-section');
  showSection('form-section');
  document.getElementById('hero').style.display = '';
  document.querySelector('.footer').style.display = '';
  document.getElementById('tuvi-form').reset();
  document.getElementById('analysis-parts').innerHTML = '';
  document.getElementById('palace-grid').innerHTML = '';
  document.getElementById('result-summary').innerHTML = '';
  hideSection('pdf-download');
  hideSection('palace-section');
  const btn = document.getElementById('btnSubmit');
  btn.disabled = false;
  btn.querySelector('.btn-text').style.display = '';
  btn.querySelector('.btn-loading').style.display = 'none';
  scrollToForm();
}

// ---- Rich text renderer ----
function stripBoldMarkers(text) {
  return text.replace(/\*\*/g, '');
}

function renderRichText(content) {
  const lines = content.split('\n');
  let html = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Heading: ## or ### or **ALL CAPS HEADING** on its own line
    if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      const text = trimmed.replace(/^#+\s*/, '');
      html += `<div class="heading">${escapeHtml(stripBoldMarkers(text))}</div>`;
    } else if (/^\*\*[^*]+\*\*$/.test(trimmed) && trimmed.length < 80) {
      // Standalone **bold line** = treat as heading
      const text = trimmed.slice(2, -2);
      html += `<div class="heading">${escapeHtml(text)}</div>`;
    } else if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const text = trimmed.replace(/^[•\-\*]\s*/, '');
      html += `<div class="bullet"><span>${renderBold(text)}</span></div>`;
    } else if (/^\d+[\.\)]\s/.test(trimmed)) {
      // Numbered list: 1. or 1)
      const text = trimmed.replace(/^\d+[\.\)]\s*/, '');
      html += `<div class="bullet"><span>${renderBold(text)}</span></div>`;
    } else {
      html += `<div class="paragraph">${renderBold(trimmed)}</div>`;
    }
  }

  return html;
}

function renderBold(text) {
  return escapeHtml(text).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ---- Build Results ----
function buildSummary(userInfo, astro) {
  const container = document.getElementById('result-summary');
  const genderText = userInfo.gender === 'male' ? 'Nam' : 'Nữ';

  container.innerHTML = `
    <div class="summary-name">${escapeHtml(userInfo.fullName)}</div>
    <div class="summary-grid">
      <div class="summary-item"><span class="summary-label">Ngày sinh</span><span class="summary-value">${userInfo.birthDate}</span></div>
      <div class="summary-item"><span class="summary-label">Giờ sinh</span><span class="summary-value">${userInfo.birthHourName}</span></div>
      <div class="summary-item"><span class="summary-label">Giới tính</span><span class="summary-value">${genderText}</span></div>
      <div class="summary-item"><span class="summary-label">Nơi sinh</span><span class="summary-value">${escapeHtml(userInfo.birthPlace)}</span></div>
      <div class="summary-item"><span class="summary-label">Âm lịch</span><span class="summary-value">${astro.lunarDate || ''}</span></div>
      <div class="summary-item"><span class="summary-label">Can Chi</span><span class="summary-value">${astro.chineseDate || ''}</span></div>
      <div class="summary-item"><span class="summary-label">Mệnh chủ</span><span class="summary-value">${astro.soul || ''}</span></div>
      <div class="summary-item"><span class="summary-label">Thân chủ</span><span class="summary-value">${astro.body || ''}</span></div>
      <div class="summary-item"><span class="summary-label">Ngũ hành</span><span class="summary-value">${astro.fiveElementsClass || ''}</span></div>
      <div class="summary-item"><span class="summary-label">Con giáp</span><span class="summary-value">${astro.zodiac || ''}</span></div>
      <div class="summary-item"><span class="summary-label">Cung Mệnh</span><span class="summary-value">${astro.earthlyBranchOfSoulPalace || ''}</span></div>
      <div class="summary-item"><span class="summary-label">Cung Thân</span><span class="summary-value">${astro.earthlyBranchOfBodyPalace || ''}</span></div>
    </div>
  `;
}

function buildPalaceGrid(palaces) {
  const grid = document.getElementById('palace-grid');
  showSection('palace-section');

  grid.innerHTML = palaces.map(p => {
    const isBody = p.isBodyPalace;
    const majors = p.majorStars.length > 0
      ? p.majorStars.map(s => `<span class="star-major">${escapeHtml(s)}</span>`).join(', ')
      : '<span class="star-empty">Vô chính diệu</span>';

    return `
      <div class="palace-card${isBody ? ' body-palace' : ''}">
        <div class="palace-name">
          ${escapeHtml(p.name)}
          ${isBody ? '<span class="badge-body">Thân</span>' : ''}
        </div>
        <div class="palace-stem">${escapeHtml(p.heavenlyStem)} ${escapeHtml(p.earthlyBranch)}</div>
        <div class="palace-stars">${majors}</div>
        ${p.decadalRange ? `<div class="palace-decadal">Đại hạn: ${escapeHtml(p.decadalRange)} tuổi</div>` : ''}
      </div>
    `;
  }).join('');
}

function toggleAccordion(header) {
  const card = header.parentElement;
  const wasCollapsed = card.classList.contains('collapsed');

  // Close all other cards
  document.querySelectorAll('.analysis-card').forEach(c => c.classList.add('collapsed'));

  // Toggle clicked card
  if (wasCollapsed) {
    card.classList.remove('collapsed');
    // Smooth scroll to card
    setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }
}

function addAnalysisPart(index, part) {
  const container = document.getElementById('analysis-parts');
  const card = document.createElement('div');
  // All collapsed by default
  card.className = 'analysis-card fade-in collapsed';
  card.style.animationDelay = (index * 0.1) + 's';

  card.innerHTML = `
    <div class="analysis-header" onclick="toggleAccordion(this)">
      <span class="analysis-icon">${part.icon}</span>
      <div>
        <div class="analysis-title">${escapeHtml(part.title)}</div>
        <div class="analysis-desc">${escapeHtml(part.description)}</div>
      </div>
    </div>
    <div class="analysis-body">
      ${renderRichText(part.content)}
    </div>
  `;

  container.appendChild(card);
}

// ---- Progress ----
function updateProgress(step, total, message, sub, subTotal) {
  const title = document.getElementById('progress-title');
  const msg = document.getElementById('progress-message');
  const fill = document.getElementById('progress-fill');
  const steps = document.querySelectorAll('.p-step');

  let pct = (step / total) * 100;
  if (step === 2 && sub !== undefined && subTotal) {
    pct = (1 / total + (sub / subTotal) / total) * 100;
  }

  fill.style.width = Math.min(pct, 100) + '%';
  title.textContent = message;
  msg.textContent = `Bước ${step}/${total}`;

  steps.forEach(s => {
    const sStep = parseInt(s.dataset.step);
    s.classList.remove('active', 'done');
    if (sStep < step) s.classList.add('done');
    else if (sStep === step) s.classList.add('active');
  });
}

// ---- Main Submit ----
document.getElementById('tuvi-form').addEventListener('submit', async function(e) {
  e.preventDefault();

  const fullName = document.getElementById('fullName').value.trim();
  const genderEl = document.querySelector('input[name="gender"]:checked');
  const birthDay = document.getElementById('birthDay').value;
  const birthMonth = document.getElementById('birthMonth').value;
  const birthYear = document.getElementById('birthYear').value;
  const hourEl = document.querySelector('input[name="birthHour"]:checked');
  const birthPlace = document.getElementById('birthPlace').value.trim();

  // Validation
  if (!fullName || fullName.length < 2) return showError('Vui lòng nhập họ tên đầy đủ');
  if (!genderEl) return showError('Vui lòng chọn giới tính');
  if (!birthDay || !birthMonth || !birthYear) return showError('Vui lòng nhập đầy đủ ngày tháng năm sinh');
  if (!hourEl) return showError('Vui lòng chọn giờ sinh');
  if (!birthPlace || birthPlace.length < 2) return showError('Vui lòng nhập nơi sinh');

  const day = parseInt(birthDay);
  const month = parseInt(birthMonth);
  const year = parseInt(birthYear);

  if (month < 1 || month > 12) return showError('Tháng sinh không hợp lệ (1-12)');
  if (day < 1 || day > 31) return showError('Ngày sinh không hợp lệ (1-31)');
  if (year < 1900 || year > 2024) return showError('Năm sinh không hợp lệ (1900-2024)');

  const birthDate = `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`;
  const birthHour = parseInt(hourEl.value);
  const birthHourName = HOUR_NAMES[birthHour];

  const userInfo = { fullName, gender: genderEl.value, birthDate, birthHour, birthHourName, birthPlace };

  // UI transitions
  const btn = document.getElementById('btnSubmit');
  btn.disabled = true;
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-loading').style.display = '';

  document.getElementById('analysis-parts').innerHTML = '';
  document.getElementById('palace-grid').innerHTML = '';
  hideSection('pdf-download');
  hideSection('palace-section');

  setTimeout(() => {
    hideSection('form-section');
    document.getElementById('hero').style.display = 'none';
    showSection('progress-section');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 300);

  // SSE request
  try {
    const response = await fetch('/api/tuvi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userInfo),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Lỗi server');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        if (!event.trim()) continue;

        const lines = event.split('\n');
        let eventType = '';
        let eventData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) eventType = line.slice(7);
          else if (line.startsWith('data: ')) eventData = line.slice(6);
        }

        if (!eventType || !eventData) continue;

        try {
          const data = JSON.parse(eventData);

          switch (eventType) {
            case 'progress':
              updateProgress(data.step, data.total, data.message, data.sub, data.subTotal);
              break;

            case 'astro':
              buildSummary(userInfo, data);
              if (data.palaces) buildPalaceGrid(data.palaces);
              break;

            case 'analysis':
              addAnalysisPart(data.index, data.part);
              break;

            case 'complete':
              updateProgress(data.total || 3, data.total || 3, 'Hoàn thành!');

              if (data.pdfUrl) {
                document.getElementById('pdf-link').href = data.pdfUrl;
                showSection('pdf-download');
              }

              setTimeout(() => {
                hideSection('progress-section');
                showSection('results-section');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 600);
              break;

            case 'error':
              throw new Error(data.message);
          }
        } catch (parseErr) {
          if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
        }
      }
    }
  } catch (error) {
    showError(error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    resetForm();
  }
});
