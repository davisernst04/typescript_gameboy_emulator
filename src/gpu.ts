import { log } from "./log";
import { cpu } from "./cpu";
import { mmu } from "./mmu";
export const gpu = {
  vram: new Uint8Array(8192),
  oam: new Uint8Array(160),
  reg: new Uint8Array(64),
  tilemap: [] as number[][][],
  objdata: [] as any[],
  objdatasorted: [] as any[],
  canvas: {} as CanvasRenderingContext2D,
  screen: {} as ImageData,
  palette: {
    bg: new Uint8Array(4),
    obj0: new Uint8Array(4),
    obj1: new Uint8Array(4)
  },

  scanrow: new Uint8Array(160),

  curline: 0,
  curscan: 0,
  linemode: 0,
  modeclocks: 0,

  yscrl: 0,
  xscrl: 0,
  raster: 0,
  ints: 0,
  lcdon: 0,
  bgon: 0,
  objon: 0,
  winon: 0,

  objsize: 0,

  bgtilebase: 0x0000,
  bgmapbase: 0x1800,
  wintilebase: 0x1800,

  reset: () => {
    gpu.vram.fill(0);
    gpu.oam.fill(0);
    gpu.reg.fill(0);

    for (let i = 0; i < 4; i++) {
      gpu.palette.bg[i] = 255;
      gpu.palette.obj0[i] = 255;
      gpu.palette.obj1[i] = 255;
    }

    for (let i = 0; i < 512; i++) {
      gpu.tilemap[i] = [];

      for (let j = 0; j < 8; j++) {
        gpu.tilemap[i][j] = [];

        for (let k = 0; k < 8; k++) {
          gpu.tilemap[i][j][k] = 0;
        }
      }
    }

    log.out('GPU', 'Initializing screen');
    
    let c = document.getElementById('screen') as HTMLCanvasElement;
    if (c && c.getContext) {
      gpu.canvas = c.getContext('2d') as CanvasRenderingContext2D;

      if (!gpu.canvas) {
        log.out('GPU', 'Failed to get 2D context');
      } else {
        if (gpu.canvas.createImageData) {
          gpu.screen = gpu.canvas.createImageData(160, 144);
        } else if(gpu.canvas.getImageData) {
          gpu.screen = gpu.canvas.getImageData(0, 0, 160, 144);
        } else {
          gpu.screen = { width: 160, height: 144, data: new Uint8ClampedArray(160 * 144 * 4)} as unknown as ImageData;
        }

        for (let i = 0; i < gpu.screen.data.length; i++) {
          gpu.screen.data[i] = 255;
        }
        gpu.canvas.putImageData(gpu.screen, 0, 0);
      }
    } else {
      log.out('GPU', 'Canvas element "screen" not found or not supported');
    }

    gpu.curline = 0;
    gpu.curscan = 0;
    gpu.linemode = 2;
    gpu.modeclocks = 0;
    gpu.yscrl = 0;
    gpu.xscrl = 0;
    gpu.raster = 0;
    gpu.ints = 0;
    gpu.lcdon = 0;
    gpu.bgon = 0;
    gpu.objon = 0;
    gpu.winon = 0;
    gpu.objsize = 0;

    gpu.scanrow.fill(0);

    gpu.objdata = [];
    for (let i = 0; i < 40; i++) {
      gpu.objdata[i] = {'y': -16, 'x': -8, 'tile': 0, 'palette': 0, 'yflip': 0, 'xflip': 0, 'prio': 0, 'num': i};
    }
    gpu.objdatasorted = [];

    gpu.bgtilebase = 0x0000;
    gpu.bgmapbase = 0x1800;
    gpu.wintilebase = 0x1800;

    log.out('GPU', 'GPU reset');
  },

  checkline: () => {
    gpu.modeclocks += cpu.reg.m;
    switch (gpu.linemode) {
      case 0: // H-Blank
        if (gpu.modeclocks >= 51) {
          gpu.modeclocks = 0;
          gpu.curline++;
          gpu.curscan += 640;
          if (gpu.curline === 144) {
            gpu.linemode = 1;
            if (gpu.canvas && gpu.canvas.putImageData) {
              gpu.canvas.putImageData(gpu.screen, 0, 0);
            }
            mmu.intf |= 1;
          } else {
            gpu.linemode = 2;
          }
        }
        break;
      case 1: // V-Blank
        if (gpu.modeclocks >= 114) {
          gpu.modeclocks = 0;
          gpu.curline++;
          if (gpu.curline > 153) {
            gpu.curline = 0;
            gpu.curscan = 0;
            gpu.linemode = 2;
          }
        }
        break;
      // OAM-read mode
      case 2:
        if (gpu.modeclocks >= 20) {
          gpu.modeclocks = 0;
          gpu.linemode = 3;
        }
        break;
      // Render scanline
      case 3:
        if (gpu.modeclocks >= 43) {
          gpu.modeclocks = 0;
          gpu.linemode = 0;
          if (gpu.lcdon) {
            if (gpu.bgon) {
              let linebase = gpu.curscan;
              let mapbase = gpu.bgmapbase + ((((gpu.curline + gpu.yscrl) & 255) >> 3) << 5);
              let y = (gpu.curline + gpu.yscrl) & 7;
              let x = gpu.xscrl & 7;
              let t = (gpu.xscrl >> 3) & 31;

              for (let i = 0; i < 160; i++) {
                let tile = gpu.vram[mapbase + t];
                if (gpu.bgtilebase && tile < 128) tile += 256;
                let tilerow = gpu.tilemap[tile][y];
                let color_idx = tilerow[x];
                gpu.scanrow[i] = color_idx;
                let color = gpu.palette.bg[color_idx];

                gpu.screen.data[linebase] = color;
                gpu.screen.data[linebase + 1] = color;
                gpu.screen.data[linebase + 2] = color;
                gpu.screen.data[linebase + 3] = 255;

                linebase += 4;
                x++;
                if (x === 8) {
                  x = 0;
                  t = (t + 1) & 31;
                }
              }
            }
            if (gpu.objon) {
              let spritesOnLine = [];
              for (let i = 0; i < 40; i++) {
                let obj = gpu.objdata[i];
                if (obj.y <= gpu.curline && obj.y + 8 > gpu.curline) {
                  spritesOnLine.push(obj);
                  if (spritesOnLine.length >= 10) break;
                }
              }

              // Draw in reverse order so lower OAM index is on top
              for (let i = spritesOnLine.length - 1; i >= 0; i--) {
                let obj = spritesOnLine[i];
                let tilerow;
                if (obj.yflip) {
                  tilerow = gpu.tilemap[obj.tile][7 - (gpu.curline - obj.y)];
                } else {
                  tilerow = gpu.tilemap[obj.tile][gpu.curline - obj.y];
                }

                let pal = obj.palette ? gpu.palette.obj1 : gpu.palette.obj0;
                for (let x = 0; x < 8; x++) {
                  let canvas_x = obj.x + x;
                  if (canvas_x >= 0 && canvas_x < 160) {
                    let color_idx = obj.xflip ? tilerow[7 - x] : tilerow[x];
                    if (color_idx !== 0 && (obj.prio === 0 || gpu.scanrow[canvas_x] === 0)) {
                      let color = pal[color_idx];
                      let linebase = (gpu.curline * 160 + canvas_x) * 4;
                      gpu.screen.data[linebase] = color;
                      gpu.screen.data[linebase + 1] = color;
                      gpu.screen.data[linebase + 2] = color;
                      gpu.screen.data[linebase + 3] = 255;
                    }
                  }
                }
              }
            }
          }
        }
        break;
    }
  },

  updatetile: (addr: number, _val: number) => {
    let saddr = addr & 0x1fff;
    if (saddr & 1) {
      saddr--;
    }

    let tile = (saddr >> 4) & 511;
    let y = (saddr >> 1) & 7;

    for (let x = 0; x < 8; x++) {
      let sx = 1 << (7 - x);
      gpu.tilemap[tile][y][x] = ((gpu.vram[saddr] & sx) ? 1 : 0) | ((gpu.vram[saddr + 1] & sx) ? 2 : 0);
    }
  },

  updateoam: (addr: number, val: number) => {
    let oam_addr = addr - 0xFE00;
    let obj = oam_addr >> 2;

    if (obj < 40) {
      switch (oam_addr & 3) {
        case 0:
          gpu.objdata[obj].y = val - 16;
          break;
        case 1:
          gpu.objdata[obj].x = val - 8;
          break;
        case 2:
          gpu.objdata[obj].tile = val;
          break;
        case 3:
          gpu.objdata[obj].palette = (val & 0x10) ? 1 : 0;
          gpu.objdata[obj].yflip = (val & 0x20) ? 1 : 0;
          gpu.objdata[obj].xflip = (val & 0x40) ? 1 : 0;
          gpu.objdata[obj].prio = (val & 0x80) ? 1 : 0;
          break;
      }
    }
  },

  rb: (addr: number): number => {
    let gaddr = addr - 0xff40;

    switch (gaddr) {
      case 0:
        return (gpu.lcdon ? 0x80 : 0) | 
               ((gpu.bgtilebase == 0x0000) ? 0x10 : 0) | 
               ((gpu.bgmapbase == 0x1C00) ? 0x08 : 0) |
               (gpu.objsize ? 0x04 : 0) |
               (gpu.objon ? 0x02 : 0) | 
               (gpu.bgon ? 0x01 : 0);
      case 1:
        return (gpu.curline == gpu.raster ? 0x04 : 0) | gpu.linemode;
      case 2:
        return gpu.yscrl;
      case 3:
        return gpu.xscrl;
      case 4:
        return gpu.curline;
      case 5:
        return gpu.raster;
      default:
        return gpu.reg[gaddr];
    }
  },
   
  wb: (addr: number, val: number) => {
    let gaddr = addr - 0xff40;
    gpu.reg[gaddr] = val;

    switch (gaddr) {
      case 0:
        gpu.lcdon = (val & 0x80) ? 1 : 0;
        gpu.bgtilebase = (val & 0x10) ? 0x0000 : 0x0800;
        gpu.bgmapbase = (val & 0x08) ? 0x1c00 : 0x1800;
        gpu.objsize = (val & 0x04) ? 1 : 0;
        gpu.objon = (val & 0x02) ? 1 : 0;
        gpu.bgon = (val & 0x01) ? 1 : 0;
        break;
      case 2:
        gpu.yscrl = val;
        break;
      case 3:
        gpu.xscrl = val;
        break;
      case 5:
        gpu.raster = val;
        break;

      case 6:
        // DMA transfer handled in mmu.ts
        break;

      case 7:
        for (let i = 0; i < 4; i++) {
          switch ((val >> (i * 2)) & 3) {
            case 0:
              gpu.palette.bg[i] = 255;
              break;
            case 1:
              gpu.palette.bg[i] = 192;
              break;
            case 2:
              gpu.palette.bg[i] = 96;
              break;
            case 3:
              gpu.palette.bg[i] = 0;
              break;
          }
        }
        break;

      case 8:
        for (let i = 0; i < 4; i++) {
          switch ((val >> (i * 2)) & 3) {
            case 0:
              gpu.palette.obj0[i] = 255;
              break;
            case 1:
              gpu.palette.obj0[i] = 192;
              break;
            case 2:
              gpu.palette.obj0[i] = 96;
              break;
            case 3:
              gpu.palette.obj0[i] = 0;
              break;
          }
        }
        break;

      case 9:
        for (let i = 0; i < 4; i++) {
          switch ((val >> (i * 2)) & 3) {
            case 0:
              gpu.palette.obj1[i] = 255;
              break;
            case 1:
              gpu.palette.obj1[i] = 192;
              break;
            case 2:
              gpu.palette.obj1[i] = 96;
              break;
            case 3:
              gpu.palette.obj1[i] = 0;
              break;
          }
        }
        break;
    }
  }
};
