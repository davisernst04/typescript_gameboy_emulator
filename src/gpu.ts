import { argv0 } from "process";

export const gpu = {
  vram: [] as number[],
  oam: [] as number[],
  reg: [] as number[],
  tilemap: [] as number[],
  objdata: [] as number[],
  objdatasorted: [] as number[],
  palette: [] as number[],
  scanrow: [] as number[],

  curline: 0,
  curscan: 0,
  linemode: 0,
  modeclocks: 0,
};
