import { describe, it, expect } from "vitest";
import { shouldGrantFundador, shouldGrantPrimerLanzamiento } from "@/lib/badges";

describe("shouldGrantFundador", () => {
  it("otorga cuando el conteo (incluyendo a este maker) es <= 10", () => {
    expect(shouldGrantFundador(1)).toBe(true);
    expect(shouldGrantFundador(10)).toBe(true);
  });

  it("no otorga a partir del maker 11", () => {
    expect(shouldGrantFundador(11)).toBe(false);
    expect(shouldGrantFundador(50)).toBe(false);
  });
});

describe("shouldGrantPrimerLanzamiento", () => {
  it("otorga cuando es el primer producto LIVE del maker", () => {
    expect(shouldGrantPrimerLanzamiento(1)).toBe(true);
  });

  it("no otorga en el segundo producto LIVE en adelante", () => {
    expect(shouldGrantPrimerLanzamiento(2)).toBe(false);
    expect(shouldGrantPrimerLanzamiento(5)).toBe(false);
  });
});
