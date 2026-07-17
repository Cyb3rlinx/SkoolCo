import { describe, it, expect } from "vitest";
import { extractMentions } from "@/lib/mentions";

describe("extractMentions", () => {
  it("devuelve vacío sin menciones", () => {
    expect(extractMentions("hola a todos")).toEqual([]);
  });

  it("extrae una mención", () => {
    expect(extractMentions("gracias @willy por el feedback")).toEqual(["willy"]);
  });

  it("extrae varias menciones en orden de aparición", () => {
    expect(extractMentions("@willy y @kevin ambos ayudaron")).toEqual(["willy", "kevin"]);
  });

  it("deduplica menciones repetidas", () => {
    expect(extractMentions("@willy @willy @willy")).toEqual(["willy"]);
  });

  it("normaliza a minúsculas", () => {
    expect(extractMentions("@Willy")).toEqual(["willy"]);
  });

  it("tope de 5 menciones por comentario", () => {
    // Usernames de 2 caracteres ("a1") no son válidos (mínimo 3, igual que
    // usernameSchema) y el regex los ignora — se usan de 3+ para ejercitar
    // el tope real de 5 menciones detectadas.
    const body = "@usr1 @usr2 @usr3 @usr4 @usr5 @usr6 @usr7";
    expect(extractMentions(body)).toEqual(["usr1", "usr2", "usr3", "usr4", "usr5"]);
  });

  it("ignora un @ pegado a texto sin formato de username válido", () => {
    expect(extractMentions("mi email es alguien@dominio.com")).toEqual(["dominio"]);
  });

  it("no matchea un username de menos de 3 caracteres", () => {
    expect(extractMentions("hola @ab")).toEqual([]);
  });
});
