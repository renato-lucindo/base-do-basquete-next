import { describe, expect, it } from "vitest";
import { initialState } from "./model";
import { readSaved, saveLocal, publishBatch, type Store } from "./storage";

const memory = (): Store => {
  let value: string | null = null;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
  };
};

describe("adaptador fictício de rascunhos", () => {
  it("rejeita duas tentativas antigas até recarga explícita", () => {
    const store = memory();
    const one = readSaved(store);
    const two = readSaved(store);
    saveLocal(store, one.version, one.data);
    expect(() => saveLocal(store, two.version, two.data)).toThrow("outra aba");
    expect(() => saveLocal(store, two.version, two.data)).toThrow("outra aba");
    const reloaded = readSaved(store);
    expect(saveLocal(store, reloaded.version, reloaded.data).version).toBe(2);
  });
  it("falha de armazenamento não se apresenta como salvamento", () => {
    const store: Store = {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(() => saveLocal(store, 0, initialState())).toThrow("salvar");
  });
  it("preserva os sucessos do lote e permite tentar somente a falha", () => {
    const data = initialState();
    data.batch = ["a", "b", "c"].map((id, i) => ({
      id,
      file: id,
      destination: "f-adulto",
      home: "A",
      away: "B",
      format: "FIBA",
      status: "ready",
      error: "",
      selected: true,
      resolved: true,
      failPublish: i === 1,
      score: [2, 0],
      date: "",
    }));
    const store = memory();
    const result = publishBatch(store, 0, data);
    expect(result.data.publications.map((p) => p.id)).toEqual(["a", "c"]);
    expect(result.data.batch[1].error).toContain("Tente novamente");
    const retry = structuredClone(result.data);
    retry.batch[1].failPublish = false;
    const final = publishBatch(store, result.version, retry);
    expect(final.data.publications.map((p) => p.id)).toEqual(["a", "c", "b"]);
    expect(readSaved(store).data.publications).toHaveLength(3);
  });
});
