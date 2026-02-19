import { describe, it, expect, vi, beforeEach } from "vitest";
import { isPresentAtLocation } from "./squareClient.js";

describe("isPresentAtLocation", () => {
  const locId = "LOC_ID";

  it("returns true when presentAtAllLocations is true and not absent", () => {
    expect(isPresentAtLocation({ id: "x", type: "ITEM", presentAtAllLocations: true }, locId)).toBe(true);
    expect(
      isPresentAtLocation(
        { id: "x", type: "ITEM", presentAtAllLocations: true, absentAtLocationIds: ["OTHER"] },
        locId
      )
    ).toBe(true);
  });

  it("returns false when location is in absentAtLocationIds", () => {
    expect(
      isPresentAtLocation(
        { id: "x", type: "ITEM", presentAtAllLocations: true, absentAtLocationIds: [locId] },
        locId
      )
    ).toBe(false);
  });

  it("returns true when presentAtAllLocations is false but location in presentAtLocationIds", () => {
    expect(
      isPresentAtLocation(
        { id: "x", type: "ITEM", presentAtAllLocations: false, presentAtLocationIds: [locId] },
        locId
      )
    ).toBe(true);
  });

  it("returns false when presentAtAllLocations is false and location not in presentAtLocationIds", () => {
    expect(
      isPresentAtLocation(
        { id: "x", type: "ITEM", presentAtAllLocations: false, presentAtLocationIds: ["OTHER"] },
        locId
      )
    ).toBe(false);
  });

  it("defaults presentAtAllLocations to true when undefined", () => {
    expect(isPresentAtLocation({ id: "x", type: "ITEM" }, locId)).toBe(true);
  });
});
