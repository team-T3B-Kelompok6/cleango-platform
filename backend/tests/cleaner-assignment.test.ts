import { describe, expect, it } from 'vitest';
import { intervalsOverlap, timeToMinutes } from '../src/model/cleaner-task.model.js';
import 'dotenv/config';

describe('cleaner assignment overlap', () => {
  it('parses HH:MM and HH:MM:SS into minutes', () => {
    expect(timeToMinutes('08:00')).toBe(480);
    expect(timeToMinutes('09:30:00')).toBe(570);
  });

  it('detects overlapping work intervals only', () => {
    expect(intervalsOverlap(540, 60, 570, 60)).toBe(true);
    expect(intervalsOverlap(540, 60, 600, 60)).toBe(false);
    expect(intervalsOverlap(600, 60, 540, 60)).toBe(false);
  });
});
