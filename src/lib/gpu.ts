export const gpu = {
  vram: [] as number[],
  oam: [] as number[],
  reg: [] as number[],
  tilemap: [] as number[][][],
  objdata: [] as number[],
  objdatasorted: [] as number[],
  palette: {
    bg: [] as number[],
    obj0: [] as number[],
    obj1: [] as number[]
  },

  scanrow: [] as number[],

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
    let i;
    let j;
    let k;
    for (i = 0; i < 8192; i++) {
      gpu.vram[i] = 0;
    }

    for (i = 0; i < 160; i++) {
      gpu.oam[i] = 0;
    }

    for (i = 0; i < 4; i++) {
      gpu.palette.bg[i] = 255;
      gpu.palette.obj0[i] = 255;
      gpu.palette.obj1[i] = 255;
    }

    for (i = 0; i < 512; i++) {
      gpu.tilemap[i] = [];

      for (j = 0; j < 8; j++) {
        gpu.tilemap[i][j] = [];

        for (k = 0; k < 8; k++) {
          gpu.tilemap[i][j][k] = 0;
        }
      }
    }

    LOG.out('GPU', 'Initializing screen');
    log.out('GPU', 'Initializing screen');
  }
};
