import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('mandat-sign', () => {
  const prev = process.env.MANDAT_LINK_SECRET;

  beforeEach(() => {
    process.env.MANDAT_LINK_SECRET = 'test-secret-mandat';
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.MANDAT_LINK_SECRET;
    else process.env.MANDAT_LINK_SECRET = prev;
  });

  it('signs and verifies mandat query', async () => {
    const { signMandatQuery, verifyMandatQuery } = require('../netlify/functions/lib/mandat-sign');
    const p = new URLSearchParams();
    p.set('ref', 'RDA-260517-1234');
    p.set('phone', '+33612345678');
    p.set('name', 'Jean Dupont');
    const signed = signMandatQuery(p);
    expect(signed).toBeTruthy();
    p.set('exp', signed.exp);
    p.set('sig', signed.sig);
    const v = verifyMandatQuery(p);
    expect(v.ok).toBe(true);
    expect(v.reason).toBe('signed_ok');
  });

  it('rejects tampered signature', async () => {
    const { signMandatQuery, verifyMandatQuery } = require('../netlify/functions/lib/mandat-sign');
    const p = new URLSearchParams();
    p.set('ref', 'RDA-260517-1234');
    const signed = signMandatQuery(p);
    p.set('exp', signed.exp);
    p.set('sig', 'bad-signature');
    const v = verifyMandatQuery(p);
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('invalid_signature');
  });
});
