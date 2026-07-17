import { describe, it, expect } from "vitest";
import { baseUsername, resolveUsername, RESERVED_USERNAMES } from "@/lib/username";

describe("baseUsername", () => {
  it("slugifica el nombre", () => {
    expect(baseUsername("William Díaz")).toBe("william-diaz");
  });

  it("recorta a 20 caracteres", () => {
    const result = baseUsername("Un Nombre Larguísimo De Verdad Que No Termina Nunca");
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it("agrega sufijo si el slug cae en la lista de reservados", () => {
    expect(baseUsername("Admin")).toBe("admin-1");
    expect(baseUsername("Denveler")).toBe("denveler-1");
  });

  it("usa un fallback si el nombre no deja slug utilizable", () => {
    const result = baseUsername("!!!");
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});

describe("resolveUsername", () => {
  it("devuelve el base si está libre", () => {
    // Nota: se usa "carla" (no "willy") porque "willy" está en RESERVED_USERNAMES —
    // usarlo aquí chocaría con el comportamiento verificado en el test de
    // "evita chocar con reservados" más abajo.
    expect(resolveUsername("carla", new Set())).toBe("carla");
  });

  it("agrega -2 si el base está tomado", () => {
    expect(resolveUsername("willy", new Set(["willy"]))).toBe("willy-2");
  });

  it("encadena sufijos hasta encontrar uno libre", () => {
    expect(resolveUsername("willy", new Set(["willy", "willy-2", "willy-3"]))).toBe("willy-4");
  });

  it("evita chocar con reservados aunque no estén en `taken`", () => {
    expect(resolveUsername("admin", new Set())).toBe("admin-2");
  });
});

describe("RESERVED_USERNAMES", () => {
  it("incluye los nombres del equipo y términos de sistema", () => {
    for (const w of ["admin", "denveler", "api", "willy", "kevin", "soporte", "moderador", "null", "undefined"]) {
      expect(RESERVED_USERNAMES.has(w)).toBe(true);
    }
  });
});
