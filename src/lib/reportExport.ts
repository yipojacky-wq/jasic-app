import type { ReportDetail } from '../types';

export function reportToMarkdown(report: ReportDetail) {
  const lines = [
    `# ${report.title}`,
    '',
    `- 類型：${report.type}`,
    `- 資料時間：${report.asOf}`,
    `- 規則版本：${report.ruleVersion}`,
    ...(report.stockSymbol ? [`- 股票代號：${report.stockSymbol}`] : []),
    '',
    '## 摘要',
    '',
    report.summary,
    '',
  ];

  if (report.metrics.length) {
    lines.push('## 指標', '');
    for (const metric of report.metrics) {
      lines.push(
        `- **${metric.label}：** ${metric.value}${metric.note ? `（${metric.note}）` : ''}`,
      );
    }
    lines.push('');
  }

  for (const section of report.sections) {
    lines.push(`## ${section.title}`, '');
    for (const item of section.items) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  lines.push('## 重要聲明', '', report.disclaimer, '');
  return lines.join('\n');
}

export function reportFilename(report: ReportDetail) {
  const safeTitle = report.title
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  const date = report.asOf.slice(0, 10);
  return `JASIC-${safeTitle}-${date}.md`;
}
