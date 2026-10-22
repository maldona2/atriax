import { shouldUseSsl } from '../connect.js';

describe('shouldUseSsl', () => {
  it('uses SSL in production by default (Railway)', () => {
    expect(shouldUseSsl({ NODE_ENV: 'production' })).toBe(true);
  });

  it('skips SSL outside production', () => {
    expect(shouldUseSsl({ NODE_ENV: 'development' })).toBe(false);
  });

  it('lets DATABASE_SSL=false turn SSL off in production (Coolify)', () => {
    expect(shouldUseSsl({ NODE_ENV: 'production', DATABASE_SSL: 'false' })).toBe(false);
  });

  it('lets DATABASE_SSL=true turn SSL on outside production', () => {
    expect(shouldUseSsl({ NODE_ENV: 'development', DATABASE_SSL: 'true' })).toBe(true);
  });
});
