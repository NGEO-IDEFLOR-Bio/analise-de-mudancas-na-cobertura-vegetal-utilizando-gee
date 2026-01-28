// CONFIGURAÇÃO: Altere o asset abaixo para sua área de estudo
var areaEstudo = ee.FeatureCollection("projects/ee-samuelsantosambientalcourse/assets/flota_iriri");

// 1. Períodos Temporais
var hoje = ee.Date(new Date());
var seisMesesAtras = hoje.advance(-6, 'month');
var umAnoAtras = hoje.advance(-12, 'month');

// 2. Função de Limpeza de Dados
function cleanMask(img) {
  var scl = img.select('SCL');
  var qa = img.select('QA60');
  var maskScl = scl.eq(4).or(scl.eq(5)).or(scl.eq(6));
  var maskQa = qa.bitwiseAnd(1 << 10).eq(0).and(qa.bitwiseAnd(1 << 11).eq(0));
  var maskBright = img.select('B2').lt(2000);
  
  return img.updateMask(maskScl).updateMask(maskQa).updateMask(maskBright)
            .divide(10000)
            .copyProperties(img, ["system:time_start"]);
}

// 3. Coleções Sentinel-2
var s2Atual = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(areaEstudo)
    .filterDate(seisMesesAtras, hoje)
    .map(cleanMask);

var s2Passado = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(areaEstudo)
    .filterDate(umAnoAtras, seisMesesAtras)
    .map(cleanMask);

// 4. Mosaicos
var mosAtual = s2Atual.median().clip(areaEstudo);
var mosPassado = s2Passado.median().clip(areaEstudo);

// 5. Índices de Vegetação
var ndviAtual = mosAtual.normalizedDifference(['B8', 'B4']).rename('ndvi_atual');
var ndviPassado = mosPassado.normalizedDifference(['B8', 'B4']).rename('ndvi_passado');

var mviAtual = mosAtual.normalizedDifference(['B8A', 'B11']).rename('mvi_atual');
var mviPassado = mosPassado.normalizedDifference(['B8A', 'B11']).rename('mvi_passado');

// 6. Detecção de Mudanças
var alertaPerda = ndviAtual.subtract(ndviPassado).lt(-0.2);
var alertaPerdaMasked = alertaPerda.updateMask(alertaPerda);

// 7. Visualização
Map.centerObject(areaEstudo, 10);

Map.addLayer(mosPassado, {bands:['B4','B3','B2'], min:0.02, max:0.2, gamma:1.2}, 
  '1a. Cor Natural (Passado)', false);
Map.addLayer(mosAtual, {bands:['B4','B3','B2'], min:0.02, max:0.2, gamma:1.2}, 
  '1b. Cor Natural (Atual)');

var visNdvi = {min: 0.5, max: 0.9, palette: ['white', 'yellow', 'green', 'darkgreen']};
Map.addLayer(ndviPassado, visNdvi, '2a. NDVI (Passado)', false);
Map.addLayer(ndviAtual, visNdvi, '2b. NDVI (Atual)', false);

var visMvi = {min: -0.1, max: 0.5, palette: ['brown', 'white', 'blue']};
Map.addLayer(mviPassado, visMvi, '3a. MVI/Umidade (Passado)', false);
Map.addLayer(mviAtual, visMvi, '3b. MVI/Umidade (Atual)', false);

Map.addLayer(alertaPerdaMasked, {palette: ['#FF00FF']}, '!!! ALERTA DE PERDA DE VEGETAÇÃO');
Map.addLayer(areaEstudo.draw({color: 'red', strokeWidth: 2}), {}, 'Limite da Área de Estudo');

// 8. Exportações
Export.image.toDrive({
  image: ndviAtual,
  description: 'NDVI_Atual_AreaEstudo',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: ndviPassado,
  description: 'NDVI_Passado_AreaEstudo',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: mviAtual,
  description: 'MVI_Atual_AreaEstudo',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 20,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: mviPassado,
  description: 'MVI_Passado_AreaEstudo',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 20,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: mosAtual.visualize({bands: ['B4', 'B3', 'B2'], min: 0.02, max: 0.2, gamma: 1.2}),
  description: 'Cor_Natural_Atual_AreaEstudo',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: mosPassado.visualize({bands: ['B4', 'B3', 'B2'], min: 0.02, max: 0.2, gamma: 1.2}),
  description: 'Cor_Natural_Passado_AreaEstudo',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: alertaPerda.uint8(),
  description: 'Alerta_Mudanca_AreaEstudo',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 10,
  maxPixels: 1e13
});
