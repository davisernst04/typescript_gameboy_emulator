
const fs = require('fs');

const ops = [
  // 00
  'NOP', 'LD_bc_nn', 'LD_bc_a', 'INC_bc', 'INC_b', 'DEC_b', 'LD_b_n', 'RLCA',
  'LD_nn_sp', 'ADD_hl_bc', 'LD_a_bc', 'DEC_bc', 'INC_c', 'DEC_c', 'LD_c_n', 'RRCA',
  // 10
  'STOP', 'LD_de_nn', 'LD_de_a', 'INC_de', 'INC_d', 'DEC_d', 'LD_d_n', 'RLA',
  'JR_n', 'ADD_hl_de', 'LD_a_de', 'DEC_de', 'INC_e', 'DEC_e', 'LD_e_n', 'RRA',
  // 20
  'JRNZ_n', 'LD_hl_nn', 'LD_hl_inc_a', 'INC_hl', 'INC_h', 'DEC_h', 'LD_h_n', 'DAA',
  'JRZ_n', 'ADD_hl_hl', 'LD_a_hl_inc', 'DEC_hl', 'INC_l', 'DEC_l', 'LD_l_n', 'CPL',
  // 30
  'JRNC_n', 'LD_sp_nn', 'LD_hl_dec_a', 'INC_sp', 'INC_hlm', 'DEC_hlm', 'LD_hl_n', 'SCF',
  'JRC_n', 'ADD_hl_sp', 'LD_a_hl_dec', 'DEC_sp', 'INC_a', 'DEC_a', 'LD_a_n', 'CCF',
  // 40
  'LD_b_b', 'LD_b_c', 'LD_b_d', 'LD_b_e', 'LD_b_h', 'LD_b_l', 'LD_b_hl', 'LD_b_a',
  'LD_c_b', 'LD_c_c', 'LD_c_d', 'LD_c_e', 'LD_c_h', 'LD_c_l', 'LD_c_hl', 'LD_c_a',
  // 50
  'LD_d_b', 'LD_d_c', 'LD_d_d', 'LD_d_e', 'LD_d_h', 'LD_d_l', 'LD_d_hl', 'LD_d_a',
  'LD_e_b', 'LD_e_c', 'LD_e_d', 'LD_e_e', 'LD_e_h', 'LD_e_l', 'LD_e_hl', 'LD_e_a',
  // 60
  'LD_h_b', 'LD_h_c', 'LD_h_d', 'LD_h_e', 'LD_h_h', 'LD_h_l', 'LD_h_hl', 'LD_h_a',
  'LD_l_b', 'LD_l_c', 'LD_l_d', 'LD_l_e', 'LD_l_h', 'LD_l_l', 'LD_l_hl', 'LD_l_a',
  // 70
  'LD_hl_b', 'LD_hl_c', 'LD_hl_d', 'LD_hl_e', 'LD_hl_h', 'LD_hl_l', 'HALT', 'LD_hl_a',
  'LD_a_b', 'LD_a_c', 'LD_a_d', 'LD_a_e', 'LD_a_h', 'LD_a_l', 'LD_a_hl', 'LD_a_a',
  // 80
  'ADD_a_b', 'ADD_a_c', 'ADD_a_d', 'ADD_a_e', 'ADD_a_h', 'ADD_a_l', 'ADD_a_hl', 'ADD_a_a',
  'ADC_a_b', 'ADC_a_c', 'ADC_a_d', 'ADC_a_e', 'ADC_a_h', 'ADC_a_l', 'ADC_a_hl', 'ADC_a_a',
  // 90
  'SUB_a_b', 'SUB_a_c', 'SUB_a_d', 'SUB_a_e', 'SUB_a_h', 'SUB_a_l', 'SUB_a_hl', 'SUB_a_a',
  'SBC_a_b', 'SBC_a_c', 'SBC_a_d', 'SBC_a_e', 'SBC_a_h', 'SBC_a_l', 'SBC_a_hl', 'SBC_a_a',
  // A0
  'AND_a_b', 'AND_a_c', 'AND_a_d', 'AND_a_e', 'AND_a_h', 'AND_a_l', 'AND_a_hl', 'AND_a_a',
  'XOR_a_b', 'XOR_a_c', 'XOR_a_d', 'XOR_a_e', 'XOR_a_h', 'XOR_a_l', 'XOR_a_hl', 'XOR_a_a',
  // B0
  'OR_a_b', 'OR_a_c', 'OR_a_d', 'OR_a_e', 'OR_a_h', 'OR_a_l', 'OR_a_hl', 'OR_a_a',
  'CP_a_b', 'CP_a_c', 'CP_a_d', 'CP_a_e', 'CP_a_h', 'CP_a_l', 'CP_a_hl', 'CP_a_a',
  // C0
  'RETNZ', 'POP_bc', 'JPNZ_nn', 'JP_nn', 'CALLNZ_nn', 'PUSH_bc', 'ADD_a_n', 'RST00',
  'RETZ', 'RET', 'JPZ_nn', 'MAPcb', 'CALLZ_nn', 'CALL_nn', 'ADC_a_n', 'RST08',
  // D0
  'RETNC', 'POP_de', 'JPNC_nn', 'XX', 'CALLNC_nn', 'PUSH_de', 'SUB_a_n', 'RST10',
  'RETC', 'RETI', 'JPC_nn', 'XX', 'CALLC_nn', 'XX', 'SBC_a_n', 'RST18',
  // E0
  'LD_IO_n_a', 'POP_hl', 'LD_IO_c_a', 'XX', 'XX', 'PUSH_hl', 'AND_a_n', 'RST20',
  'ADD_sp_n', 'JP_hl', 'LD_nn_a', 'XX', 'XX', 'XX', 'OR_a_n', 'RST28',
  // F0
  'LD_a_IO_n', 'POP_af', 'LD_a_IO_c', 'DI', 'XX', 'PUSH_af', 'XOR_a_n', 'RST30',
  'LD_hl_sp_n', 'LD_sp_hl', 'LD_a_nn', 'EI', 'XX', 'XX', 'CP_a_n', 'RST38'
];

const cbops = [
  'RLC_b', 'RLC_c', 'RLC_d', 'RLC_e', 'RLC_h', 'RLC_l', 'RLC_hl', 'RLC_a',
  'RRC_b', 'RRC_c', 'RRC_d', 'RRC_e', 'RRC_h', 'RRC_l', 'RRC_hl', 'RRC_a',
  'RL_b', 'RL_c', 'RL_d', 'RL_e', 'RL_h', 'RL_l', 'RL_hl', 'RL_a',
  'RR_b', 'RR_c', 'RR_d', 'RR_e', 'RR_h', 'RR_l', 'RR_hl', 'RR_a',
  'SLA_b', 'SLA_c', 'SLA_d', 'SLA_e', 'SLA_h', 'SLA_l', 'SLA_hl', 'SLA_a',
  'SRA_b', 'SRA_c', 'SRA_d', 'SRA_e', 'SRA_h', 'SRA_l', 'SRA_hl', 'SRA_a',
  'SWAP_b', 'SWAP_c', 'SWAP_d', 'SWAP_e', 'SWAP_h', 'SWAP_l', 'SWAP_hl', 'SWAP_a',
  'SRL_b', 'SRL_c', 'SRL_d', 'SRL_e', 'SRL_h', 'SRL_l', 'SRL_hl', 'SRL_a',
  'BIT0_b', 'BIT0_c', 'BIT0_d', 'BIT0_e', 'BIT0_h', 'BIT0_l', 'BIT0_hl', 'BIT0_a',
  'BIT1_b', 'BIT1_c', 'BIT1_d', 'BIT1_e', 'BIT1_h', 'BIT1_l', 'BIT1_hl', 'BIT1_a',
  'BIT2_b', 'BIT2_c', 'BIT2_d', 'BIT2_e', 'BIT2_h', 'BIT2_l', 'BIT2_hl', 'BIT2_a',
  'BIT3_b', 'BIT3_c', 'BIT3_d', 'BIT3_e', 'BIT3_h', 'BIT3_l', 'BIT3_hl', 'BIT3_a',
  'BIT4_b', 'BIT4_c', 'BIT4_d', 'BIT4_e', 'BIT4_h', 'BIT4_l', 'BIT4_hl', 'BIT4_a',
  'BIT5_b', 'BIT5_c', 'BIT5_d', 'BIT5_e', 'BIT5_h', 'BIT5_l', 'BIT5_hl', 'BIT5_a',
  'BIT6_b', 'BIT6_c', 'BIT6_d', 'BIT6_e', 'BIT6_h', 'BIT6_l', 'BIT6_hl', 'BIT6_a',
  'BIT7_b', 'BIT7_c', 'BIT7_d', 'BIT7_e', 'BIT7_h', 'BIT7_l', 'BIT7_hl', 'BIT7_a',
  'RES0_b', 'RES0_c', 'RES0_d', 'RES0_e', 'RES0_h', 'RES0_l', 'RES0_hl', 'RES0_a',
  'RES1_b', 'RES1_c', 'RES1_d', 'RES1_e', 'RES1_h', 'RES1_l', 'RES1_hl', 'RES1_a',
  'RES2_b', 'RES2_c', 'RES2_d', 'RES2_e', 'RES2_h', 'RES2_l', 'RES2_hl', 'RES2_a',
  'RES3_b', 'RES3_c', 'RES3_d', 'RES3_e', 'RES3_h', 'RES3_l', 'RES3_hl', 'RES3_a',
  'RES4_b', 'RES4_c', 'RES4_d', 'RES4_e', 'RES4_h', 'RES4_l', 'RES4_hl', 'RES4_a',
  'RES5_b', 'RES5_c', 'RES5_d', 'RES5_e', 'RES5_h', 'RES5_l', 'RES5_hl', 'RES5_a',
  'RES6_b', 'RES6_c', 'RES6_d', 'RES6_e', 'RES6_h', 'RES6_l', 'RES6_hl', 'RES6_a',
  'RES7_b', 'RES7_c', 'RES7_d', 'RES7_e', 'RES7_h', 'RES7_l', 'RES7_hl', 'RES7_a',
  'SET0_b', 'SET0_c', 'SET0_d', 'SET0_e', 'SET0_h', 'SET0_l', 'SET0_hl', 'SET0_a',
  'SET1_b', 'SET1_c', 'SET1_d', 'SET1_e', 'SET1_h', 'SET1_l', 'SET1_hl', 'SET1_a',
  'SET2_b', 'SET2_c', 'SET2_d', 'SET2_e', 'SET2_h', 'SET2_l', 'SET2_hl', 'SET2_a',
  'SET3_b', 'SET3_c', 'SET3_d', 'SET3_e', 'SET3_h', 'SET3_l', 'SET3_hl', 'SET3_a',
  'SET4_b', 'SET4_c', 'SET4_d', 'SET4_e', 'SET4_h', 'SET4_l', 'SET4_hl', 'SET4_a',
  'SET5_b', 'SET5_c', 'SET5_d', 'SET5_e', 'SET5_h', 'SET5_l', 'SET5_hl', 'SET5_a',
  'SET6_b', 'SET6_c', 'SET6_d', 'SET6_e', 'SET6_h', 'SET6_l', 'SET6_hl', 'SET6_a',
  'SET7_b', 'SET7_c', 'SET7_d', 'SET7_e', 'SET7_h', 'SET7_l', 'SET7_hl', 'SET7_a'
];

// Check which cbops actually exist in cpu.ops
const content = fs.readFileSync('src/cpu.ts', 'utf8');
const final_cbops = cbops.map(op => {
  if (content.includes(op + ': () => {')) return op;
  return 'XX';
});

let res = 'cpu.map = [\n';
for (let i = 0; i < 256; i++) {
  let op = ops[i] || 'XX';
  res += `  cpu.ops.${op}${i < 255 ? ',' : ''}\n`;
}
res += '];\n\ncpu.cbmap = [\n';
for (let i = 0; i < 256; i++) {
  let op = final_cbops[i] || 'XX';
  res += `  cpu.ops.${op}${i < 255 ? ',' : ''}\n`;
}
res += '];';
console.log(res);
