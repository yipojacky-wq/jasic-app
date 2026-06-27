import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  officialTaiwanMarketSources,
  pendingProductionSources,
} from '../supabase/functions/_shared/marketDataContracts.ts';
import * as taiwanAdapters from '../supabase/functions/_shared/taiwanMarketAdapters.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

type Check = {
  name: string;
  run: () => void;
};

const officialCodes = [
  'TWSE_STOCK_DAY_ALL',
  'TWSE_T86',
  'TPEX_DAILY_QUOTES',
  'TPEX_3INSTI',
] as const;

const pendingCodes = [
  'TAIWAN_MARGIN_TRADING',
  'TAIWAN_OPEN_INTEREST',
  'JASIC_MACRO_FIVE',
] as const;

const requiredAdapterExports = [
  'twseStockRows',
  'tpexStockRows',
  'twseDailyPriceBatch',
  'tpexDailyPriceBatch',
  'twseInstitutionalFlowBatch',
  'tpexInstitutionalFlowBatch',
] as const;

function fail(message: string): never {
  throw new Error(message);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function readProjectFile(pathFromRoot: string): string {
  const filePath = join(root, pathFromRoot);
  assert(existsSync(filePath), `${pathFromRoot} is missing`);
  return readFileSync(filePath, 'utf8');
}

const checks: Check[] = [
  {
    name: 'Official Taiwan market source registry is complete',
    run: () => {
      const actualCodes = sorted(officialTaiwanMarketSources.map((source) => source.code));
      assert(
        JSON.stringify(actualCodes) === JSON.stringify(sorted(officialCodes)),
        `Official source codes mismatch: ${actualCodes.join(', ')}`,
      );

      for (const source of officialTaiwanMarketSources) {
        assert(source.provider.trim().length > 0, `${source.code} provider is empty`);
        assert(source.datasetName.trim().length > 0, `${source.code} datasetName is empty`);
        assert(
          source.licenseStatus !== 'pending_review',
          `${source.code} cannot be pending_review in official registry`,
        );
        assert(source.attribution.trim().length > 0, `${source.code} attribution is empty`);
        assert(source.endpoint?.startsWith('https://'), `${source.code} endpoint must be HTTPS`);
        assert(
          source.commercialUseNote.trim().length >= 20,
          `${source.code} commercialUseNote is too short`,
        );
      }
    },
  },
  {
    name: 'Pending production sources stay blocked until reviewed',
    run: () => {
      const actualCodes = sorted(pendingProductionSources.map((source) => source.code));
      assert(
        JSON.stringify(actualCodes) === JSON.stringify(sorted(pendingCodes)),
        `Pending source codes mismatch: ${actualCodes.join(', ')}`,
      );

      for (const source of pendingProductionSources) {
        assert(
          source.licenseStatus === 'pending_review',
          `${source.code} must remain pending_review until a source is approved`,
        );
        assert(
          !source.endpoint || source.endpoint.startsWith('https://'),
          `${source.code} endpoint must be omitted or HTTPS`,
        );
      }
    },
  },
  {
    name: 'Taiwan market adapter exports are available',
    run: () => {
      for (const exportName of requiredAdapterExports) {
        assert(
          typeof taiwanAdapters[exportName] === 'function',
          `${exportName} must be exported from taiwanMarketAdapters.ts`,
        );
      }
    },
  },
  {
    name: 'Market ingestion uses shared adapter batches',
    run: () => {
      const ingestSource = readProjectFile('supabase/functions/market-data-ingest/index.ts');
      for (const exportName of requiredAdapterExports) {
        assert(
          ingestSource.includes(exportName),
          `market-data-ingest/index.ts does not use ${exportName}`,
        );
      }
      assert(
        ingestSource.includes('ingestionRunFromBatch'),
        'market-data-ingest/index.ts must persist ingestion status through ingestionRunFromBatch',
      );
    },
  },
  {
    name: 'Data-source documentation is present',
    run: () => {
      const adapterContract = readProjectFile('docs/DATA_SOURCE_ADAPTER_CONTRACT.md');
      const registryDoc = readProjectFile('docs/DATA_SOURCE_REGISTRY.md');
      for (const code of [...officialCodes, ...pendingCodes]) {
        assert(
          adapterContract.includes(code) || registryDoc.includes(code),
          `${code} is missing from data-source docs`,
        );
      }
    },
  },
];

const failures: string[] = [];

for (const check of checks) {
  try {
    check.run();
    console.log(`PASS ${check.name}`);
  } catch (error) {
    failures.push(`${check.name}: ${(error as Error).message}`);
    console.error(`FAIL ${check.name}`);
  }
}

if (failures.length > 0) {
  console.error('\nData-source doctor failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('\nData-source doctor passed.');
