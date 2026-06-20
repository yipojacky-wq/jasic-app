export type ReportSection = {
  title: string;
  items: string[];
  tone?: 'info' | 'positive' | 'warning' | 'danger';
};

export function isoWeek(dateValue: string) {
  const date = new Date(`${dateValue.slice(0, 10)}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function riskLabel(score: number) {
  return score >= 70 ? '高' : score >= 40 ? '中' : '低';
}

export function dailyMarketSections(input: {
  summary: string;
  regime: string;
  score: number;
  risk: number;
  topIndustries: string[];
}): ReportSection[] {
  return [
    {
      title: '市場結論',
      tone: 'info',
      items: [
        input.summary,
        `市場狀態 ${input.regime}，Market Score ${input.score.toFixed(1)}。`,
      ],
    },
    {
      title: '今日焦點',
      tone: 'positive',
      items: input.topIndustries.length
        ? input.topIndustries.map((industry) => `${industry} 位於候選池前段`)
        : ['目前沒有足夠產業資料形成焦點清單'],
    },
    {
      title: '風險控制',
      tone: input.risk >= 70 ? 'danger' : 'warning',
      items: [
        `市場風險分數 ${input.risk.toFixed(1)}（${riskLabel(input.risk)}風險）。`,
        '避免以單一指標或單日漲跌取代完整決策流程。',
      ],
    },
  ];
}

export function reportDisclaimer() {
  return '本報告僅供研究與風險檢核，不構成投資建議、獲利保證或自動交易指令。';
}
