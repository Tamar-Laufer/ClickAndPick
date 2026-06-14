'use strict';

const { esc } = require('./format');

const BRAND = 'Click&Pick';
const ACCENT = '#EE5A2A';
const INK = '#1C1610';

function layout({ title, intro, rows = [], cta, footerNote }) {
  const rowsHtml = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:9px 0;color:#8A8174;font-size:14px;white-space:nowrap;text-align:right;">${esc(r.label)}</td>
        <td style="padding:9px 0;color:${INK};font-size:14px;font-weight:600;text-align:left;">${r.value}</td>
      </tr>`,
    )
    .join('');
  const ctaHtml = cta
    ? `<tr><td colspan="2" style="padding-top:26px;">
         <a href="${esc(cta.href)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 30px;">${esc(cta.label)}</a>
       </td></tr>`
    : '';
  return `<!DOCTYPE html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F7F0E2;font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;">
  <div style="max-width:560px;margin:0 auto;padding:24px;direction:rtl;text-align:right;">
    <div style="font-size:22px;font-weight:700;color:${ACCENT};margin-bottom:16px;text-align:right;">${BRAND}</div>
    <div style="background:#ffffff;border:1px solid #E2D9C6;padding:32px;text-align:right;">
      <h1 style="margin:0 0 10px;font-size:21px;color:${INK};">${esc(title)}</h1>
      <p style="margin:0 0 18px;color:#4F463C;font-size:15px;line-height:1.65;">${intro}</p>
      <table role="presentation" width="100%" style="border-collapse:collapse;">${rowsHtml}${ctaHtml}</table>
      ${footerNote ? `<p style="margin:24px 0 0;color:#8A8174;font-size:13px;line-height:1.6;">${footerNote}</p>` : ''}
    </div>
    <div style="text-align:center;color:#8A8174;font-size:12px;margin-top:18px;">© ${new Date().getFullYear()} ${BRAND} · השאלה שיתופית</div>
  </div>
</body></html>`;
}

module.exports = { BRAND, ACCENT, INK, layout };
