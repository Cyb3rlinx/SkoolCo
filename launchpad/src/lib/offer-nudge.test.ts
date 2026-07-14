import { describe, it, expect } from "vitest";
import {
  selectOfferNudgeCandidates,
  OFFER_NUDGE_UPVOTE_THRESHOLD,
} from "./offer-nudge";

const base = {
  status: "LIVE",
  openToOffers: false,
  offerNudgeSentAt: null as Date | null,
  upvoteCount: OFFER_NUDGE_UPVOTE_THRESHOLD,
};

describe("selectOfferNudgeCandidates", () => {
  it("incluye productos LIVE que alcanzan el umbral exacto o lo superan", () => {
    expect(selectOfferNudgeCandidates([{ ...base }])).toHaveLength(1);
    expect(
      selectOfferNudgeCandidates([{ ...base, upvoteCount: OFFER_NUDGE_UPVOTE_THRESHOLD + 1 }])
    ).toHaveLength(1);
  });

  it("excluye productos por debajo del umbral", () => {
    expect(
      selectOfferNudgeCandidates([{ ...base, upvoteCount: OFFER_NUDGE_UPVOTE_THRESHOLD - 1 }])
    ).toHaveLength(0);
  });

  it("excluye productos que ya están abiertos a ofertas", () => {
    expect(selectOfferNudgeCandidates([{ ...base, openToOffers: true }])).toHaveLength(0);
  });

  it("excluye productos cuyo aviso ya se envió", () => {
    expect(
      selectOfferNudgeCandidates([{ ...base, offerNudgeSentAt: new Date("2026-07-01") }])
    ).toHaveLength(0);
  });

  it("excluye productos no publicados", () => {
    expect(selectOfferNudgeCandidates([{ ...base, status: "DRAFT" }])).toHaveLength(0);
    expect(selectOfferNudgeCandidates([{ ...base, status: "ARCHIVED" }])).toHaveLength(0);
  });

  it("conserva los campos extra del caller (genérica)", () => {
    const result = selectOfferNudgeCandidates([{ ...base, slug: "mi-producto" }]);
    expect(result[0]?.slug).toBe("mi-producto");
  });
});
