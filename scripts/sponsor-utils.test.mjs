import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCampaign,summary,csvCell,todayLocal} from '../robosmdp/assets/sponsor-utils.mjs';

const campaign={
 cliente:'  Empresa ejemplo ',plan:' Campaña trimestral ',
 inicio:'2026-10-01',fin:'2026-12-31',
 importe_total:'1500000',cobrado_total:'700000',
 estado:'activa',nota:'Notas privadas',ubicaciones:'Portada',enlace:'https://example.org'
};
test('valida campaña y normaliza importes monetarios',()=>{
 const r=validateCampaign(campaign);
 assert.equal(r.cliente,'Empresa ejemplo');
 assert.equal(r.importe_total,1500000);
 assert.equal(r.cobrado_total,700000);
 assert.equal(r.inicio,'2026-10-01');
});
test('rechaza saldos negativos y cobros superiores a importe contratado',()=>{
 assert.throws(()=>validateCampaign({...campaign,cobrado_total:'1500001'}));
 assert.throws(()=>validateCampaign({...campaign,importe_total:'-1'}));
 assert.throws(()=>validateCampaign({...campaign,inicio:'2027-01-01'}));
 assert.throws(()=>validateCampaign({...campaign,enlace:'javascript:alert(1)'}));
});
test('calcula campañas vigentes y por vencer sin inventar facturación',()=>{
 const rows=[validateCampaign(campaign),validateCampaign({
 ...campaign,cliente:'Segundo sponsor',inicio:'2026-10-15',fin:'2026-10-20',
 importe_total:'100000',cobrado_total:'100000'
 })];
 const kpi=summary(rows,'2026-10-18');
 assert.equal(kpi.campanias,2);
 assert.equal(kpi.vigentes,2);
 assert.equal(kpi.por_vencer,1);
 assert.equal(kpi.contratado,1600000);
 assert.equal(kpi.cobrado,800000);
 assert.equal(kpi.saldo,800000);
});
test('exportación CSV inofensiva frente a fórmulas de hojas de cálculo',()=>{
 assert.equal(csvCell('=IMPORTXML("x")'),'"\'=IMPORTXML(""x"")"');
 assert.equal(csvCell('Empresa, SRL'),'"Empresa, SRL"');
 assert.equal(csvCell('Texto normal'),'"Texto normal"');
});
test('formatea fecha ISO local',()=>{
 assert.equal(todayLocal(new Date(2026,9,18,10,0)), '2026-10-18');
});
