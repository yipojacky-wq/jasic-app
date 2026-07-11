import type { ReportDetail } from '../types';

export function reportToMarkdown(report: ReportDetail) {
  const lines = [
    `# ${report.title}`,
    '',
    '## Audit',
    '',
    `- Report type: ${report.reportType}`,
    `- Data as of: ${report.asOf}`,
    `- Rule version: ${report.ruleVersion}`,
    ...(report.stockSymbol ? [`- Stock symbol: ${report.stockSymbol}`] : []),
    ...governanceAuditLines(report),
    '',
    '## Summary',
    '',
    report.summary,
    '',
  ];

  if (report.metrics.length) {
    lines.push('## Metrics', '');
    for (const metric of report.metrics) {
      lines.push(
        `- **${metric.label}:** ${metric.value}${metric.note ? ` (${metric.note})` : ''}`,
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

  lines.push('## Disclaimer', '', report.disclaimer, '');
  return lines.join('\n');
}

function governanceAuditLines(report: ReportDetail) {
  const audit = report.governanceAudit;
  if (!audit) return [];
  return [
    ...(audit.modelIdentifier ? [`- AI model: ${audit.modelIdentifier}`] : []),
    ...(audit.promptVersion ? [`- AI prompt version: ${audit.promptVersion}`] : []),
    ...(audit.responseSchemaVersion
      ? [`- AI response schema version: ${audit.responseSchemaVersion}`]
      : []),
    ...(audit.allowedActions?.length
      ? [`- AI allowed actions: ${audit.allowedActions.join(', ')}`]
      : []),
  ];
}

export function reportFilename(report: ReportDetail) {
  const safeTitle = report.title
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 80);
  const date = report.asOf.slice(0, 10);
  return `JASIC-${safeTitle}-${date}.md`;
}
