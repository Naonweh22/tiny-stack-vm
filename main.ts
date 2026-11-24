// Tiny stack VM for make.fun — written in this recorded session.
// Runs every /input/<id>/program.bin on its input.bin and writes
// /output/<id>/stdout.bin + /output/<id>/exit.txt, per ISA.md.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const IN_DIR = process.env.MAKEFUN_INPUT_DIR ?? "/input";
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const MAX_STACK = 256;
const MAX_CALL = 64;
const MAX_MEM = 256;
const MAX_STEPS = 1_000_000;
const MAX_OUT = 65_536;

// pops / pushes per opcode, used for the stack checks in ISA.md.
// Checked before every instruction runs, so underflow (trap 2) and
// overflow (trap 3) are caught before the instruction's own trap.
const NEED: Record<number, [number, number]> = {
  0x00: [0, 0], 0x01: [0, 1], 0x02: [0, 1], 0x03: [1, 0], 0x04: [1, 2],
  0x05: [2, 2], 0x06: [2, 3], 0x07: [3, 3], 0x10: [2, 1], 0x11: [2, 1],
  0x12: [2, 1], 0x13: [2, 1], 0x14: [2, 1], 0x15: [2, 1], 0x16: [2, 1],
  0x17: [1, 1], 0x18: [2, 1], 0x19: [2, 1], 0x1a: [2, 1], 0x1b: [1, 1],
  0x1c: [2, 1], 0x1d: [2, 1], 0x1e: [2, 1], 0x20: [2, 1], 0x21: [2, 1],
  0x22: [2, 1], 0x30: [0, 0], 0x31: [1, 0], 0x32: [1, 0], 0x33: [0, 0],
  0x34: [0, 0], 0x40: [1, 1], 0x41: [2, 0], 0x50: [1, 0], 0x51: [1, 0],
  0x52: [0, 1], 0x53: [1, 0],
};
const IMM_LEN: Record<number, number> = {
  0x01: 1, 0x02: 4, 0x30: 2, 0x31: 2, 0x32: 2, 0x33: 2,
};

function run(prog: Uint8Array, input: Uint8Array): { out: Uint8Array; code: number } {
  const stack = new Int32Array(MAX_STACK);
  const calls = new Int32Array(MAX_CALL);
  const mem = new Int32Array(MAX_MEM);
  const out = new Uint8Array(MAX_OUT);
  let sp = 0, cp = 0, ip = 0, olen = 0, pc = 0, steps = 0;
  const done = (code: number) => ({ out: out.slice(0, olen), code });
  const fail = (code: number): never => { throw code; };
  try {
    for (;;) {
      if (steps === MAX_STEPS) return done(10);
      if (pc < 0 || pc >= prog.length) return done(9);
      const op = prog[pc];
      const spec = NEED[op];
      if (spec === undefined) return done(5);
      const imm = IMM_LEN[op] ?? 0;
      if (pc + imm >= prog.length) return done(9);
      steps++;
      const [pops, pushes] = spec;
      if (sp < pops) return done(2);
      if (sp - pops + pushes > MAX_STACK) return done(3);
      const next = pc + 1 + imm;
      const u16 = imm === 2 ? prog[pc + 1] | (prog[pc + 2] << 8) : 0;
      const s16 = imm === 2 ? ((u16 << 16) >> 16) : 0;
      pc = next;
      switch (op) {
        case 0x00: return done(0);
        case 0x01: stack[sp++] = (prog[next - 1] << 24) >> 24; break;
        case 0x02: stack[sp++] = prog[next - 4] | (prog[next - 3] << 8) | (prog[next - 2] << 16) | (prog[next - 1] << 24); break;
        case 0x03: sp--; break;
        case 0x04: stack[sp] = stack[sp - 1]; sp++; break; // stack bounds already checked above
        case 0x05: { const t = stack[sp - 1]; stack[sp - 1] = stack[sp - 2]; stack[sp - 2] = t; break; }
        case 0x06: stack[sp] = stack[sp - 2]; sp++; break;
        case 0x07: { const a = stack[sp - 3]; stack[sp - 3] = stack[sp - 2]; stack[sp - 2] = stack[sp - 1]; stack[sp - 1] = a; break; }
        case 0x17: stack[sp - 1] = (-stack[sp - 1]) | 0; break;
        case 0x1b: stack[sp - 1] = ~stack[sp - 1]; break;
        case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15:
        case 0x16: case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d:
        case 0x1e: case 0x20: case 0x21: case 0x22: {
          const b = stack[sp - 1], a = stack[sp - 2];
          let r = 0;
          if (op === 0x10) r = (a + b) | 0;
          else if (op === 0x11) r = (a - b) | 0;
          else if (op === 0x12) r = Math.imul(a, b);
          else if (op === 0x13) { if (b === 0) fail(4); r = a === -2147483648 && b === -1 ? a : (a / b) | 0; }
          else if (op === 0x14) { if (b === 0) fail(4); r = b === -1 ? 0 : (a % b) | 0; }
          else if (op === 0x15) { if (b === 0) fail(4); r = Math.floor((a >>> 0) / (b >>> 0)) | 0; }
          else if (op === 0x16) { if (b === 0) fail(4); r = ((a >>> 0) % (b >>> 0)) | 0; }
          else if (op === 0x18) r = a & b;
          else if (op === 0x19) r = a | b;
          else if (op === 0x1a) r = a ^ b;
          else if (op === 0x1c) r = a << (b & 31);
          else if (op === 0x1d) r = a >> (b & 31);
          else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
          else if (op === 0x20) r = a === b ? 1 : 0;
          else if (op === 0x21) r = a < b ? 1 : 0;
          else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
          sp -= 2; stack[sp++] = r; break;
        }
        case 0x30: pc = next + s16; break;
        case 0x31: { const v = stack[--sp]; if (v === 0) pc = next + s16; break; }
        case 0x32: { const v = stack[--sp]; if (v !== 0) pc = next + s16; break; }
        case 0x33: if (cp === MAX_CALL) return done(7); calls[cp++] = next; pc = u16; break;
        case 0x34: if (cp === 0) return done(8); pc = calls[--cp]; break;
        case 0x40: { const a = stack[sp - 1]; if (a < 0 || a >= MAX_MEM) return done(6); stack[sp - 1] = mem[a]; break; }
        case 0x41: { const a = stack[sp - 1], v = stack[sp - 2]; if (a < 0 || a >= MAX_MEM) return done(6); sp -= 2; mem[a] = v; break; }
        case 0x50: { const s = String(stack[sp - 1]); if (olen + s.length > MAX_OUT) return done(11); sp--; for (let i = 0; i < s.length; i++) out[olen++] = s.charCodeAt(i); break; }
        case 0x51: if (olen + 1 > MAX_OUT) return done(11); out[olen++] = stack[--sp] & 255; break;
        case 0x52: stack[sp++] = ip < input.length ? input[ip++] : -1; break;
        case 0x53: return done(stack[--sp] & 255);
      }
    }
  } catch (code) {
    return done(code as number);
  }
}

for (const id of readdirSync(IN_DIR).sort()) {
  const r = run(readFileSync(join(IN_DIR, id, "program.bin")), readFileSync(join(IN_DIR, id, "input.bin")));
  mkdirSync(join(OUT_DIR, id), { recursive: true });
  writeFileSync(join(OUT_DIR, id, "stdout.bin"), r.out);
  writeFileSync(join(OUT_DIR, id, "exit.txt"), `${r.code}\n`);
}
