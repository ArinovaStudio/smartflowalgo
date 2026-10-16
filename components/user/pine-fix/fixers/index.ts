import type { Fixer } from '../types';
import { notAFunctionFixer } from './displayFunction';
import { nullReceiverFixer } from './nullFunction';
import { paramsFixer } from './params';


export const ALL_FIXERS: Fixer[] = [
  paramsFixer,
  nullReceiverFixer,
  notAFunctionFixer,
];