// Rescisão e contagem de datas — regras oficiais, contas feitas à mão.
//
// Regras:
//  - Aviso prévio: 30 dias + 3 por ano completo de serviço, no máximo 90 (Lei 12.506/2011).
//    Indenizado, ele conta como tempo de serviço e "projeta" a data de saída para os avos
//    (CLT, art. 487, § 1º; OJ 82 da SDI-1 do TST). No pedido de demissão sem cumprir o aviso,
//    a empresa pode descontar 30 dias de salário (CLT, art. 487, § 2º).
//  - 13º proporcional: mês do calendário com 15 dias ou mais conta 1/12 (Lei 4.090/1962,
//    art. 1º, § 2º). Não é devido na justa causa.
//  - Férias proporcionais: 1/12 por mês de serviço, contado do início do período aquisitivo,
//    ou fração superior a 14 dias (CLT, art. 146, parágrafo único). Devidas também no pedido
//    de demissão (Súmula 261 do TST); não na justa causa (Súmula 171). Vencidas: sempre.
//  - FGTS: multa de 40% e saque total na dispensa sem justa causa (Lei 8.036/1990, art. 18 e
//    20); no acordo, multa de 20% e saque de até 80% (CLT, art. 484-A); nada na justa causa
//    nem no pedido de demissão.
//  - INSS/IRRF incidem sobre o saldo de salário e o 13º (em separado). Aviso indenizado,
//    férias indenizadas + 1/3 e multa do FGTS não pagam INSS nem IR.
//
// Datas e salários foram escolhidos para que o INSS caia nas faixas 1, 3 ou 4 (veja a dúvida
// de 1 centavo da faixa 2 em inss-irrf.test.cjs).
const test = require('node:test');
const assert = require('node:assert/strict');
const { motor, ferramentas } = require('./carregar.cjs');

const E = motor();
const D = (s) => E.parseDate(s);
const valor = (lista, prefixo) => (lista.find((l) => l.nome.startsWith(prefixo)) || {}).valor;

test('contarAvos (13º): mês com 15 dias ou mais conta', () => {
  assert.equal(E.contarAvos(D('2026-01-01'), D('2026-12-31')), 12);
  assert.equal(E.contarAvos(D('2026-03-17'), D('2026-12-31')), 10); // 17 a 31/03 = 15 dias → conta
  assert.equal(E.contarAvos(D('2026-03-18'), D('2026-12-31')), 9);  // 18 a 31/03 = 14 dias → não conta
  assert.equal(E.contarAvos(D('2026-01-01'), D('2026-06-14')), 5);  // junho com 14 dias
  assert.equal(E.contarAvos(D('2026-01-01'), D('2026-06-15')), 6);  // junho com 15 dias
  assert.equal(E.contarAvos(D('2026-02-14'), D('2026-02-28')), 1);  // fevereiro: 14 a 28 = 15 dias
  assert.equal(E.contarAvos(D('2025-01-01'), D('2026-12-31')), 12); // nunca passa de 12
  assert.equal(E.contarAvos(D('2026-05-10'), D('2026-05-01')), 0);  // datas invertidas
});

test('contarAvosFerias: 1/12 por mês de serviço ou fração acima de 14 dias', () => {
  // 10/01 → 09/02 (1), 10/02 → 09/03 (2), sobra 10/03 a 24/03 = 15 dias → 3
  assert.equal(E.contarAvosFerias(D('2026-01-10'), D('2026-03-24')), 3);
  // sobra 10/03 a 23/03 = 14 dias → não conta
  assert.equal(E.contarAvosFerias(D('2026-01-10'), D('2026-03-23')), 2);
  // período aquisitivo completo
  assert.equal(E.contarAvosFerias(D('2025-03-01'), D('2026-02-28')), 12);
  // 04/09/2025 a 25/06/2026: 9 meses até 03/06 + 22 dias → 10
  assert.equal(E.contarAvosFerias(D('2025-09-04'), D('2026-06-25')), 10);
});

test('anosCompletos: só conta o ano fechado', () => {
  assert.equal(E.anosCompletos(D('2023-09-04'), D('2026-05-20')), 2);
  assert.equal(E.anosCompletos(D('2023-09-04'), D('2026-09-04')), 3);
  assert.equal(E.anosCompletos(D('2023-09-04'), D('2026-09-02')), 2);
  assert.equal(E.anosCompletos(D('2026-05-20'), D('2023-09-04')), 0);
});

test('aviso prévio proporcional: 30 + 3 por ano, limite de 90 dias', () => {
  const base = { bruto: 3000, motivo: 'sem_justa_causa', aviso: 'indenizado', saldoFGTS: 0 };
  assert.equal(E.rescisao({ ...base, admissao: '2026-01-05', desligamento: '2026-06-10' }).diasAviso, 30);
  assert.equal(E.rescisao({ ...base, admissao: '2025-03-20', desligamento: '2026-03-20' }).diasAviso, 33);
  assert.equal(E.rescisao({ ...base, admissao: '2000-01-10', desligamento: '2026-03-20' }).diasAviso, 90);
});

test('rescisão sem justa causa com aviso indenizado', () => {
  // 6.000; admissão 04/09/2023; saída 20/05/2026; saldo de FGTS 10.000.
  // 2 anos completos → aviso de 36 dias → projeção até 25/06/2026.
  // saldo: 20 dias × 200 = 4.000 | aviso: 36 × 200 = 7.200
  // 13º: jan a mai + 25 dias de junho = 6/12 → 3.000
  // férias: de 04/09/2025 a 25/06/2026 = 10/12 → 5.000 + 1/3 = 1.666,67
  // proventos: 4.000 + 7.200 + 3.000 + 5.000 + 1.666,67 = 20.866,67
  // descontos: INSS saldo (4.000) 368,60 + INSS 13º (3.000) 248,60 = 617,20; IR zero (até 5.000)
  // líquido: 20.249,47 | FGTS: saque 10.000 + multa 40% 4.000 → total 34.249,47
  const r = E.rescisao({ bruto: 6000, admissao: '2023-09-04', desligamento: '2026-05-20',
    motivo: 'sem_justa_causa', aviso: 'indenizado', saldoFGTS: 10000 });
  assert.equal(r.anos, 2);
  assert.equal(r.diasAviso, 36);
  assert.equal(r.avos13, 6);
  assert.equal(r.avosFerias, 10);
  assert.equal(valor(r.proventos, 'Saldo de salário'), 4000);
  assert.equal(valor(r.proventos, 'Aviso prévio'), 7200);
  assert.equal(valor(r.proventos, '13º'), 3000);
  assert.equal(valor(r.proventos, 'Férias proporcionais'), 5000);
  assert.equal(valor(r.proventos, '1/3 sobre férias proporcionais'), 1666.67);
  assert.equal(r.totalProventos, 20866.67);
  assert.equal(valor(r.descontos, 'INSS sobre saldo'), 368.60);
  assert.equal(valor(r.descontos, 'INSS sobre 13º'), 248.60);
  assert.equal(r.totalDescontos, 617.20);
  assert.equal(r.liquidoRescisao, 20249.47);
  assert.equal(r.fgts.multa, 4000);
  assert.equal(r.fgts.saque, 10000);
  assert.equal(r.totalGeral, 34249.47);
  assert.equal(r.seguroDesemprego, true);
});

test('rescisão sem justa causa com aviso trabalhado (sem projeção)', () => {
  // 6.000; 04/09/2023 a 20/07/2026. Aviso trabalhado: não paga aviso nem projeta.
  // saldo 20 dias = 4.000 | 13º: jan a jun + 20 dias de julho = 7/12 → 3.500
  // férias: 10 meses até 03/07 + 17 dias = 11/12 → 5.500 + 1/3 = 1.833,33
  // INSS saldo 368,60; INSS 13º (3.500): 236,9406 + 597,16 × 12% = 308,5998 → 308,60
  // líquido: 14.833,33 − 677,20 = 14.156,13; FGTS 10.000 + multa 4.000 → 28.156,13
  const r = E.rescisao({ bruto: 6000, admissao: '2023-09-04', desligamento: '2026-07-20',
    motivo: 'sem_justa_causa', aviso: 'trabalhado', saldoFGTS: 10000 });
  assert.equal(r.projeta, false);
  assert.equal(valor(r.proventos, 'Aviso prévio'), undefined);
  assert.equal(r.avos13, 7);
  assert.equal(r.avosFerias, 11);
  assert.equal(r.totalProventos, 14833.33);
  assert.equal(valor(r.descontos, 'INSS sobre 13º'), 308.60);
  assert.equal(r.liquidoRescisao, 14156.13);
  assert.equal(r.totalGeral, 28156.13);
});

test('pedido de demissão com aviso cumprido', () => {
  // mesmas verbas do caso anterior, mas sem saque nem multa do FGTS e sem seguro-desemprego
  const r = E.rescisao({ bruto: 6000, admissao: '2023-09-04', desligamento: '2026-07-20',
    motivo: 'pedido', aviso: 'trabalhado', saldoFGTS: 10000 });
  assert.equal(r.totalProventos, 14833.33);
  assert.equal(r.liquidoRescisao, 14156.13);
  assert.equal(r.fgts.multa, 0);
  assert.equal(r.fgts.saque, 0);
  assert.equal(r.totalGeral, 14156.13);
  assert.equal(r.seguroDesemprego, false);
});

test('pedido de demissão sem cumprir o aviso: desconto de 30 dias', () => {
  // 14.156,13 − 6.000 (30 dias de salário) = 8.156,13
  const r = E.rescisao({ bruto: 6000, admissao: '2023-09-04', desligamento: '2026-07-20',
    motivo: 'pedido', aviso: 'nao_cumprido', saldoFGTS: 10000 });
  assert.equal(valor(r.descontos, 'Aviso prévio não cumprido'), 6000);
  assert.equal(r.liquidoRescisao, 8156.13);
});

test('justa causa: só saldo de salário e férias vencidas + 1/3', () => {
  // saldo 4.000 (INSS 368,60) + férias vencidas 6.000 + 1/3 2.000 = 12.000
  // sem 13º, sem férias proporcionais, sem aviso, sem FGTS → líquido 11.631,40
  const r = E.rescisao({ bruto: 6000, admissao: '2023-09-04', desligamento: '2026-07-20',
    motivo: 'justa_causa', temFeriasVencidas: true, diasFeriasVencidas: 30, saldoFGTS: 10000 });
  assert.equal(valor(r.proventos, '13º'), undefined);
  assert.equal(valor(r.proventos, 'Férias proporcionais'), undefined);
  assert.equal(valor(r.proventos, 'Férias vencidas'), 6000);
  assert.equal(valor(r.proventos, '1/3 sobre férias vencidas'), 2000);
  assert.equal(r.totalProventos, 12000);
  assert.equal(r.liquidoRescisao, 11631.40);
  assert.equal(r.fgts.multa, 0);
  assert.equal(r.fgts.saque, 0);
  assert.equal(r.totalGeral, 11631.40);
});

test('acordo (CLT, art. 484-A): metade do aviso, multa de 20%, saque de 80%', () => {
  // 7.200; 04/09/2023 a 02/05/2026; FGTS 10.000. Aviso de 36 dias pago pela metade:
  // 7.200 ÷ 30 × 36 = 8.640 ÷ 2 = 4.320.
  // Projetando 36 ou 18 dias, os avos são os mesmos: 13º 5/12 = 3.000; férias 9/12 = 5.400 + 1.800.
  // saldo 2 dias = 480 (INSS 7,5% = 36,00); INSS 13º 248,60.
  // proventos 15.000; descontos 284,60; líquido 14.715,40; saque 8.000 + multa 2.000 → 24.715,40
  const r = E.rescisao({ bruto: 7200, admissao: '2023-09-04', desligamento: '2026-05-02',
    motivo: 'acordo', saldoFGTS: 10000 });
  assert.equal(valor(r.proventos, 'Aviso prévio'), 4320);
  assert.equal(r.avos13, 5);
  assert.equal(r.avosFerias, 9);
  assert.equal(r.totalProventos, 15000);
  assert.equal(r.totalDescontos, 284.60);
  assert.equal(r.liquidoRescisao, 14715.40);
  assert.equal(r.fgts.multa, 2000);
  assert.equal(r.fgts.saque, 8000);
  assert.equal(r.totalGeral, 24715.40);
  assert.equal(r.seguroDesemprego, false);
});

test('saldo de salário quando a admissão foi no mesmo mês da saída', () => {
  // entrou em 11/05/2026 e saiu em 20/05/2026: trabalhou 10 dias → 3.000 ÷ 30 × 10 = 1.000
  // (menos de 15 dias: nenhum avo de 13º nem de férias)
  const r = E.rescisao({ bruto: 3000, admissao: '2026-05-11', desligamento: '2026-05-20',
    motivo: 'pedido', aviso: 'trabalhado', saldoFGTS: 0 });
  assert.equal(r.detalhe.saldoSalario, 1000);
  assert.equal(r.avos13, 0);
  assert.equal(r.avosFerias, 0);
  assert.equal(r.totalProventos, 1000);
});

test('FGTS estimado quando o saldo não é informado', () => {
  const r = E.rescisao({ bruto: 3000, admissao: '2024-01-02', desligamento: '2026-01-10', motivo: 'sem_justa_causa' });
  assert.equal(r.fgts.estimado, true);
  assert.ok(r.fgts.base > 0);
  assert.equal(r.fgts.multa, Math.round(r.fgts.base * 0.40 * 100) / 100);
});

test('datas inválidas devolvem mensagem de erro', () => {
  const r = E.rescisao({ bruto: 3000, admissao: '2026-05-10', desligamento: '2026-01-10', motivo: 'pedido' });
  assert.match(r.erro, /datas/i);
});

test('término de contrato de experiência', {
  todo: 'FALTA NO MOTOR: a calculadora de rescisão não tem o motivo "fim do contrato de experiência". '
    + 'Na data prevista: saldo, 13º e férias proporcionais + 1/3, saque do FGTS, sem aviso e sem multa.',
}, () => {
  // 3.000; 02/03/2026 a 30/05/2026 (90 dias). Saldo 30 dias = 3.000; 13º 3/12 = 750;
  // férias: 02/03 a 30/05 = 2 meses + 29 dias → 3/12 = 750 + 250.
  const r = E.rescisao({ bruto: 3000, admissao: '2026-03-02', desligamento: '2026-05-30',
    motivo: 'termino_experiencia', saldoFGTS: 720 });
  assert.equal(r.fgts.multa, 0);
  assert.equal(r.fgts.saque, 720);
  assert.equal(valor(r.proventos, 'Aviso prévio'), undefined);
});

test('aviso indenizado que projeta a saída para o ano seguinte', {
  todo: 'DÚVIDA: saída em 20/12/2026 com 36 dias de aviso projeta até 25/01/2027. O código para em 12/12; '
    + 'pela projeção (OJ 82), janeiro/2027 daria mais 1/12 do 13º de 2027. Não alterado.',
}, () => {
  const r = E.rescisao({ bruto: 6000, admissao: '2023-09-04', desligamento: '2026-12-20',
    motivo: 'sem_justa_causa', aviso: 'indenizado', saldoFGTS: 0 });
  assert.equal(r.avos13, 13);
});

test('guia de demissão: fim de contrato por prazo determinado', () => {
  const g = ferramentas().dismissalGuide({ reason: 'fixed_term', endDate: '2026-05-30' });
  const status = (texto) => g.rights.find((x) => x.label.includes(texto)).status;
  assert.equal(g.title, 'Término de contrato por prazo determinado');
  assert.equal(status('Multa de 40%'), 'no');
  assert.equal(status('Aviso prévio'), 'no');
  assert.equal(status('Saque do FGTS'), 'yes');
  assert.equal(g.timeline[0].date, '2026-06-09'); // pagamento em até 10 dias (CLT, art. 477, § 6º)
});

test('guia de demissão: acordo e justa causa', () => {
  const T = ferramentas();
  const acordo = T.dismissalGuide({ reason: 'agreement' });
  assert.ok(acordo.rights.some((x) => x.label.includes('20%') && x.status === 'yes'));
  assert.ok(acordo.rights.some((x) => x.label.includes('80%') && x.status === 'yes'));
  assert.ok(acordo.rights.some((x) => x.label.includes('Seguro') && x.status === 'no'));
  const justa = T.dismissalGuide({ reason: 'for_cause' });
  assert.ok(justa.rights.some((x) => x.label.includes('13º e férias proporcionais') && x.status === 'no'));
  assert.ok(justa.rights.some((x) => x.label.includes('Férias vencidas') && x.status === 'yes'));
});
