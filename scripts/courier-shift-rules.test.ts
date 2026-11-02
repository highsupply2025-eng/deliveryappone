import { describe, expect, test } from "bun:test";
import { BREAK_SECONDS, WORK_SECONDS, workedSeconds, salaryDayEligible, shiftAssignmentSchema, canRequestBreak, canRejectOrder, courierAvailable } from "../src/lib/courier-shift-rules";

describe("courier employment", () => {
  test("one break request per shift including a denied request", () => {
    expect(canRequestBreak("active","none",false,100)).toBe(true);
    expect(canRequestBreak("active","rejected",true,100)).toBe(false);
    expect(canRequestBreak("active","approved",true,100)).toBe(false);
  });
  test("one rejection per shift and only before pickup", () => {
    expect(canRejectOrder(null,"ready",100)).toBe(true);
    expect(canRejectOrder("first-rejected-order","ready",100)).toBe(false);
    expect(canRejectOrder(null,"on_the_way",100)).toBe(false);
    expect(canRejectOrder(null,"pending",100)).toBe(true);
  });
  test("availability stops at ten working hours and during the single break", () => {
    expect(courierAvailable("active",35999,false)).toBe(true);
    expect(courierAvailable("active",36000,false)).toBe(false);
    expect(courierAvailable("active",100,true)).toBe(false);
    expect(courierAvailable("completed",36000,false)).toBe(false);
  });
  test("a salary day requires all ten hours", () => {
    expect(WORK_SECONDS).toBe(36000);
    expect(salaryDayEligible(35999)).toBe(false);
    expect(salaryDayEligible(36000)).toBe(true);
  });
  test("a one-hour break is excluded and extends ten hours to eleven", () => {
    expect(BREAK_SECONDS).toBe(3600);
    expect(workedSeconds(0, 10*3600000, 4*3600000, 5*3600000)).toBe(32400);
    expect(workedSeconds(0, 11*3600000, 4*3600000, 5*3600000)).toBe(36000);
  });
  test("elapsed break time only, capped at ten working hours", () => {
    expect(workedSeconds(0, 4.5*3600000, 4*3600000, 5*3600000)).toBe(14400);
    expect(workedSeconds(0, 12*3600000)).toBe(36000);
  });
  test("admin assignment requires exactly three distinct adjacent-confirmed areas", () => {
    const base = {courier_id:"11111111-1111-4111-8111-111111111111", scheduled_start:"2026-10-23T20:00:00Z", adjacent_confirmed:true};
    expect(shiftAssignmentSchema.safeParse({...base, neighborhoods:["النرجس","الياسمين","العارض"]}).success).toBe(true);
    expect(shiftAssignmentSchema.safeParse({...base, neighborhoods:["النرجس","الياسمين"]}).success).toBe(false);
    expect(shiftAssignmentSchema.safeParse({...base, neighborhoods:["النرجس","النرجس","العارض"]}).success).toBe(false);
    expect(shiftAssignmentSchema.safeParse({...base, adjacent_confirmed:false, neighborhoods:["النرجس","الياسمين","العارض"]}).success).toBe(false);
  });
});