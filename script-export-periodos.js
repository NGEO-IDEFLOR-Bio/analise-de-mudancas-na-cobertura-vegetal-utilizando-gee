// ============================================
// CONFIGURAÇÃO PRINCIPAL
// ============================================

// Área de Estudo - Defina sua camada de entrada aqui
var areaEstudo = ee.FeatureCollection("projects/sentinel-landsat-download/assets/gleba_sao_benedito");

// Margem em metros ao redor da área de estudo
var margemMetros = 1000; // 1 km de margem

// Criar geometria retangular com margem
var areaComMargem = areaEstudo.geometry().buffer(margemMetros).bounds();

// Período de exportação (padrão: 2000-2026, ajuste manualmente)
var anoInicio = 2000;
var anoFim = 2026;

// Tamanho do período em anos (3 anos por padrão)
var periodoAnos = 3;

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Função para mascarar nuvens Landsat
function maskLandsatSR(image) {
  var qa = image.select('QA_PIXEL');
  var cloudMask = qa.bitwiseAnd(1 << 3).eq(0);
  var shadowMask = qa.bitwiseAnd(1 << 4).eq(0);
  return image.updateMask(cloudMask).updateMask(shadowMask).divide(10000);
}

// Função para exportar mosaico de período
function exportPeriodMosaic(collection, periodoInicio, periodoFim, bands, description, scale, minImages) {
  var startDate = ee.Date.fromYMD(periodoInicio, 1, 1);
  var endDate = ee.Date.fromYMD(periodoFim, 12, 31);
  var filtered = collection.filterDate(startDate, endDate).select(bands);
  
  var count = filtered.size().getInfo();
  
  if (count < minImages) {
    print('Pulando ' + description + ' (apenas ' + count + ' imagens, mínimo: ' + minImages + ')');
    return;
  }
  
  var mosaic = filtered.median().clip(areaComMargem);
  
  // Adicionar banda de data (ano médio do período como valor constante)
  var anoMedio = Math.floor((periodoInicio + periodoFim) / 2);
  var dateBand = ee.Image.constant(anoMedio).rename('data').toInt16();
  
  var mosaicComData = mosaic.addBands(dateBand);
  
  Export.image.toDrive({
    image: mosaicComData,
    description: description,
    folder: 'GEE_Export_Periodos',
    region: areaComMargem.bounds(),
    scale: scale,
    maxPixels: 1e13,
    skipEmptyTiles: true
  });
  
  print(description + ' - ' + count + ' imagens, exportando...');
}

// ============================================
// SENTINEL-2 (2015-2026)
// ============================================

var s2Collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(areaComMargem)
  .filter(ee.Filter.lte('cloudcover', 20));

var s2Bands = ['B8', 'B4', 'B3']; // NIR, Red, Green

print('=== SENTINEL-2 PERÍODOS DE ' + periodoAnos + ' ANOS ===');
for (var inicio = Math.max(2015, anoInicio); inicio <= Math.min(anoFim, 2026); inicio += periodoAnos) {
  var fim = Math.min(inicio + periodoAnos - 1, 2026);
  var descricao = 'Sentinel2_' + inicio + '_' + fim;
  exportPeriodMosaic(s2Collection, inicio, fim, s2Bands, descricao, 10, 1); // Mínimo 1 imagem
}

// ============================================
// LANDSAT 5 (até 2011)
// ============================================

var lt5Collection = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
  .filterBounds(areaComMargem)
  .filter(ee.Filter.lte('CLOUD_COVER', 20))
  .map(maskLandsatSR);

var lt5Bands = ['SR_B5', 'SR_B4', 'SR_B3']; // NIR, Red, Green

print('=== LANDSAT 5 PERÍODOS DE ' + periodoAnos + ' ANOS ===');
for (var inicio = Math.max(1984, anoInicio); inicio <= Math.min(2011, anoFim); inicio += periodoAnos) {
  var fim = Math.min(inicio + periodoAnos - 1, 2011);
  var descricao = 'Landsat5_' + inicio + '_' + fim;
  exportPeriodMosaic(lt5Collection, inicio, fim, lt5Bands, descricao, 30, 1);
}

// ============================================
// LANDSAT 7 (2012-2013)
// ============================================

var lt7Collection = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
  .filterBounds(areaComMargem)
  .filter(ee.Filter.lte('CLOUD_COVER', 20))
  .map(maskLandsatSR);

var lt7Bands = ['SR_B4', 'SR_B3', 'SR_B2']; // NIR, Red, Green

print('=== LANDSAT 7 PERÍODOS DE ' + periodoAnos + ' ANOS ===');
for (var inicio = Math.max(2012, anoInicio); inicio <= Math.min(2013, anoFim); inicio += periodoAnos) {
  var fim = Math.min(inicio + periodoAnos - 1, 2013);
  var descricao = 'Landsat7_' + inicio + '_' + fim;
  exportPeriodMosaic(lt7Collection, inicio, fim, lt7Bands, descricao, 30, 1);
}

// ============================================
// LANDSAT 8 (2014-2021)
// ============================================

var lt8Collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(areaComMargem)
  .filter(ee.Filter.lte('CLOUD_COVER', 20))
  .map(maskLandsatSR);

var lt8Bands = ['SR_B6', 'SR_B5', 'SR_B4']; // NIR, Red, Green

print('=== LANDSAT 8 PERÍODOS DE ' + periodoAnos + ' ANOS ===');
for (var inicio = Math.max(2014, anoInicio); inicio <= Math.min(2021, anoFim); inicio += periodoAnos) {
  var fim = Math.min(inicio + periodoAnos - 1, 2021);
  var descricao = 'Landsat8_' + inicio + '_' + fim;
  exportPeriodMosaic(lt8Collection, inicio, fim, lt8Bands, descricao, 30, 1);
}

// ============================================
// LANDSAT 9 (2022 em diante)
// ============================================

var lt9Collection = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(areaComMargem)
  .filter(ee.Filter.lte('CLOUD_COVER', 20))
  .map(maskLandsatSR);

var lt9Bands = ['SR_B4', 'SR_B3', 'SR_B2']; // Red, Green, Blue

print('=== LANDSAT 9 PERÍODOS DE ' + periodoAnos + ' ANOS ===');
for (var inicio = Math.max(2022, anoInicio); inicio <= Math.min(anoFim, 2026); inicio += periodoAnos) {
  var fim = Math.min(inicio + periodoAnos - 1, 2026);
  var descricao = 'Landsat9_' + inicio + '_' + fim;
  exportPeriodMosaic(lt9Collection, inicio, fim, lt9Bands, descricao, 30, 1);
}

// ============================================
// SPOT 2008 - Mosaico Código Florestal
// ============================================

var spot2008 = ee.Image('GOOGLE/BRAZIL_FOREST_2008/V1/VISUAL')
  .select(['R', 'G', 'B'])
  .clip(areaComMargem);

// Para o SPOT 2008, adicionamos uma banda de data fixa (2008)
var dateBandSPOT = ee.Image.constant(2008).rename('data').toInt16();
var spot2008ComData = spot2008.addBands(dateBandSPOT);

Export.image.toDrive({
  image: spot2008ComData,
  description: 'SPOT_2008_Mosaico_Codigo_Florestal',
  folder: 'GEE_Export_Periodos',
  region: areaComMargem.bounds(),
  scale: 5,
  maxPixels: 1e13,
  skipEmptyTiles: true
});
print('SPOT 2008 exportando...');

// ============================================
// VISUALIZAÇÃO NO MAPA
// ============================================

Map.centerObject(areaEstudo, 10);

var visRGB = { min: 0, max: 0.3 };

Map.addLayer(areaEstudo.draw({ color: 'red', strokeWidth: 2 }), {}, 'Área de Estudo');
Map.addLayer(ee.FeatureCollection([areaComMargem]).draw({ color: 'yellow', strokeWidth: 1 }), {}, 'Área com Margem');
Map.addLayer(spot2008, visRGB, 'SPOT 2008 (2007-2009)', false);

print('Configuração concluída! Verifique as tarefas de exportação.');
