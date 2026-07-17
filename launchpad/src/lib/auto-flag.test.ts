import { describe, it, expect } from "vitest";
import { detectSuspiciousContent } from "@/lib/auto-flag";

describe("detectSuspiciousContent", () => {
  it("devuelve null para texto normal", () => {
    expect(detectSuspiciousContent("Me encanta este producto, gran trabajo!")).toBeNull();
  });

  it("detecta enlaces de acortadores conocidos", () => {
    expect(detectSuspiciousContent("Mira esto: bit.ly/abc123")).not.toBeNull();
    expect(detectSuspiciousContent("visita tinyurl.com/xyz ya")).not.toBeNull();
  });

  it("detecta frases típicas de estafa", () => {
    expect(detectSuspiciousContent("GANA DINERO RAPIDO trabajando desde casa")).not.toBeNull();
    expect(detectSuspiciousContent("haz clic aqui para reclamar tu premio")).not.toBeNull();
  });

  it("detecta exceso de mayúsculas combinado con signos de exclamación", () => {
    expect(detectSuspiciousContent("COMPRA AHORA MISMO ANTES QUE SE ACABE!!!")).not.toBeNull();
  });

  it("no marca un comentario normal con una sola palabra en mayúsculas", () => {
    expect(detectSuspiciousContent("Esto es GENIAL, felicidades por el lanzamiento")).toBeNull();
  });

  it("devuelve una razón legible cuando detecta algo", () => {
    const reason = detectSuspiciousContent("click aqui: bit.ly/free-money");
    expect(typeof reason).toBe("string");
    expect((reason as string).length).toBeGreaterThan(0);
  });
});
