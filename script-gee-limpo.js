// CONFIGURAÇÃO: Área de Estudo
var areaEstudo = ee.FeatureCollection("projects/ee-samuelsantosambientalcourse/assets/flota_iriri");

// 1. Períodos Temporais
var hoje = ee.Date(new Date());
var seisMesesAtras = hoje.advance(-6, 'month');
var umAnoAtras = hoje.advance(-12, 'month');

// 2. Função de Limpeza de Dados (Nuvens e Sombras)
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

// 3. Coleções Sentinel-2 (Harmonized SR)
var s2Atual = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(areaEstudo)
  .filterDate(seisMesesAtras, hoje)
  .map(cleanMask);

var s2Passado = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(areaEstudo)
  .filterDate(umAnoAtras, seisMesesAtras)
  .map(cleanMask);

// 4. Mosaicos (Mediana para remoção de artefatos)
var mosAtual = s2Atual.median().clip(areaEstudo);
var mosPassado = s2Passado.median().clip(areaEstudo);

// 5. Índices de Vegetação e Umidade
var ndviAtual = mosAtual.normalizedDifference(['B8', 'B4']).rename('ndvi_atual');
var ndviPassado = mosPassado.normalizedDifference(['B8', 'B4']).rename('ndvi_passado');

var mviAtual = mosAtual.normalizedDifference(['B8A', 'B11']).rename('mvi_atual');
var mviPassado = mosPassado.normalizedDifference(['B8A', 'B11']).rename('mvi_passado');

// 6. Detecção de Mudanças (Perda de Vegetação)
var alertaPerda = ndviAtual.subtract(ndviPassado).lt(-0.2);
var alertaPerdaMasked = alertaPerda.updateMask(alertaPerda);

// 7. Parâmetros de Visualização
var visNatural = { bands: ['B4', 'B3', 'B2'], min: 0.02, max: 0.2, gamma: 1.2 };
var visFalsaCor = { bands: ['B12', 'B8', 'B4'], min: 0.05, max: 0.4, gamma: 1.1 };
var visNdvi = { min: 0.5, max: 0.9, palette: ['white', 'yellow', 'green', 'darkgreen'] };
var visMvi = { min: -0.1, max: 0.5, palette: ['brown', 'white', 'blue'] };

// Configuração do Mapa
Map.centerObject(areaEstudo, 10);

// Adição de Camadas ao Mapa
Map.addLayer(mosPassado, visNatural, '1a. Cor Natural (Passado)', false);
Map.addLayer(mosAtual, visNatural, '1b. Cor Natural (Atual)', false);

// Nova Camada Solicitada: Falsa Cor B12-B8-B4
Map.addLayer(mosPassado, visFalsaCor, '1c. Falsa Cor B12-B8-B4 (Passado)', false);
Map.addLayer(mosAtual, visFalsaCor, '1d. Falsa Cor B12-B8-B4 (Atual)');

Map.addLayer(ndviPassado, visNdvi, '2a. NDVI (Passado)', false);
Map.addLayer(ndviAtual, visNdvi, '2b. NDVI (Atual)', false);

Map.addLayer(mviPassado, visMvi, '3a. MVI/Umidade (Passado)', false);
Map.addLayer(mviAtual, visMvi, '3b. MVI/Umidade (Atual)', false);

Map.addLayer(alertaPerdaMasked, { palette: ['#FF00FF'] }, '!!! ALERTA DE PERDA DE VEGETAÇÃO');
Map.addLayer(areaEstudo.draw({ color: 'red', strokeWidth: 2 }), {}, 'Limite da Área de Estudo');

// 8. Exportações (Com Simbologia aplicada via .visualize())

// Exportação Falsa Cor (Atual)
Export.image.toDrive({
  image: mosAtual.visualize(visFalsaCor),
  description: 'FalsaCor_B12B8B4_Atual_AreaEstudo',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 10,
  maxPixels: 1e13
});

// Exportação Falsa Cor (Passado)
Export.image.toDrive({
  image: mosPassado.visualize(visFalsaCor),
  description: 'FalsaCor_B12B8B4_Passado_AreaEstudo',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 10,
  maxPixels: 1e13
});

// Exportação Cor Natural (Atual)
Export.image.toDrive({
  image: mosAtual.visualize(visNatural),
  description: 'Cor_Natural_Atual_AreaEstudo',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 10,
  maxPixels: 1e13
});

// Exportação Cor Natural (Passado)
Export.image.toDrive({
  image: mosPassado.visualize(visNatural),
  description: 'Cor_Natural_Passado_AreaEstudo',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 10,
  maxPixels: 1e13
});

// Exportação NDVI (Atual)
Export.image.toDrive({
  image: ndviAtual.visualize(visNdvi),
  description: 'NDVI_Simbologia_Atual',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 10,
  maxPixels: 1e13
});

// Exportação MVI (Atual)
Export.image.toDrive({
  image: mviAtual.visualize(visMvi),
  description: 'MVI_Simbologia_Atual',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 20,
  maxPixels: 1e13
});

// Exportação Alerta de Perda
Export.image.toDrive({
  image: alertaPerdaMasked.visualize({ palette: ['#FF00FF'] }),
  description: 'Alerta_Mudanca_Simbologia',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 10,
  maxPixels: 1e13
});

// Exportação NDVI (Passado)
Export.image.toDrive({
  image: ndviPassado.visualize(visNdvi),
  description: 'NDVI_Simbologia_Passado',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 10,
  maxPixels: 1e13
});

// Exportação MVI (Passado)
Export.image.toDrive({
  image: mviPassado.visualize(visMvi),
  description: 'MVI_Simbologia_Passado',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 20, // Mantendo a escala de 20m conforme o seu MVI atual
  maxPixels: 1e13
});