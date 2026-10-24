import { readFileSync } from 'node:fs';
import { createHTFClient } from './trade-data.mjs';
export function createTradeProvider({mode = 'demo', ...options} = {}) {
  if (!['demo', 'qualified'].includes(mode)) throw new Error('Unknown trade notification mode');
  const study = JSON.parse(readFileSync(new URL('../assets/htf-study.json', import.meta.url), 'utf8'));
  const client = createHTFClient(options);
  return { snapshot: (asset, frame) => client.snapshot(asset, frame, study.profiles[asset]?.[frame], mode === 'demo') };
}
