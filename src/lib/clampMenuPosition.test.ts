import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { clampMenuPosition } from '@/lib/clampMenuPosition';

describe('clampMenuPosition', () => {
  const rect = {
    top: 100,
    bottom: 140,
    left: 900,
    right: 1000,
    width: 100,
    height: 40,
    x: 900,
    y: 100,
    toJSON: () => ({}),
  } as DOMRect;

  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1024);
    vi.stubGlobal('innerHeight', 768);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('place le menu sous le déclencheur par défaut', () => {
    const pos = clampMenuPosition({ ...rect, left: 200, right: 300 } as DOMRect, 220, 200);
    expect(pos.top).toBe(146);
    expect(pos.left).toBe(200);
  });

  it('recale à gauche si le menu dépasse à droite', () => {
    vi.stubGlobal('innerWidth', 1000);
    const pos = clampMenuPosition(rect, 220, 200);
    expect(pos.left).toBe(772);
  });
});
