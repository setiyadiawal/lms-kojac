import { LISTENING_CHAPTERS01_05 } from './chapters01_05';
import { LISTENING_CHAPTERS06_10 } from './chapters06_10';
import { LISTENING_CHAPTERS11_15 } from './chapters11_15';
import { LISTENING_CHAPTERS16_20 } from './chapters16_20';
import { LISTENING_CHAPTERS21_25 } from './chapters21_25';
import { LISTENING_CHAPTERS26_30 } from './chapters26_30';
import { LISTENING_CHAPTERS31_35 } from './chapters31_35';

export const LISTENING_PHASE2_ITEMS = [
  ...LISTENING_CHAPTERS01_05,
  ...LISTENING_CHAPTERS06_10,
  ...LISTENING_CHAPTERS11_15,
  ...LISTENING_CHAPTERS16_20,
  ...LISTENING_CHAPTERS21_25,
  ...LISTENING_CHAPTERS26_30,
  ...LISTENING_CHAPTERS31_35,
].sort((a, b) => a.chapter - b.chapter || a.order - b.order);
