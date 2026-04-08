import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calcFinancier,
  calcMoratoire,
  genererIdDossier,
  palierCE261,
} from "./calculs";

describe("calcFinancier", () => {
  it("calcule brut, commission, net et total reclame", () => {
    const result = calcFinancier(600, 3);
    expect(result).toEqual({
      brut: 1800,
      commission: 450,
      netClient: 1350,
      netParPassager: 450,
      totalReclame: 1840,
    });
  });

  it("evite division par zero pour netParPassager", () => {
    const result = calcFinancier(600, 0);
    expect(result.netParPassager).toBe(0);
    expect(result.brut).toBe(0);
  });
});

describe("calcMoratoire", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retourne inactif si LRAR absent", () => {
    expect(calcMoratoire(null)).toEqual({
      actif: false,
      j16: null,
      jours: 0,
      interets: 0,
      total: 0,
    });
  });

  it("retourne inactif avant J+16", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));

    const result = calcMoratoire("2026-04-01");
    expect(result.actif).toBe(false);
    expect(result.jours).toBe(0);
    expect(result.total).toBe(40);
  });

  it("retourne actif apres J+16", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:00:00Z"));

    const result = calcMoratoire("2026-04-01");
    expect(result.actif).toBe(true);
    expect(result.j16).toBe("2026-04-17");
    expect(result.jours).toBeGreaterThanOrEqual(14);
    expect(result.total).toBe(40);
  });
});

describe("genererIdDossier", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("genere un identifiant au format attendu", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T10:00:00Z"));

    expect(genererIdDossier(0)).toBe("RDA-2026-001");
    expect(genererIdDossier(41)).toBe("RDA-2026-042");
  });
});

describe("palierCE261", () => {
  it("retourne 250 jusqu'a 1500 km", () => {
    expect(palierCE261(1500)).toBe(250);
  });

  it("retourne 400 entre 1501 et 3500 km", () => {
    expect(palierCE261(2500)).toBe(400);
    expect(palierCE261(3500)).toBe(400);
  });

  it("retourne 600 au-dela de 3500 km", () => {
    expect(palierCE261(3501)).toBe(600);
  });
});
