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

// Função para exportar mosaico anual (verifica se há imagens antes)
function exportAnnualMosaic(collection, year, bands, description, scale) {
  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = ee.Date.fromYMD(year, 12, 31);
  var filtered = collection.filterDate(startDate, endDate).select(bands);
  
  var count = filtered.size().getInfo();
  
  if (count === 0) {
    print('Pulando ' + description + ' (0 imagens)');
    return;
  }
  
  var mosaic = filtered.median().clip(areaComMargem);
  
  Export.image.toDrive({
    image: mosaic,
    description: description,
    folder: 'GEE_Export_Anual',
    region: areaComMargem.bounds(),
    scale: scale,
    maxPixels: 1e13,
    skipEmptyTiles: true
  });
  print(description + ' - ' + count + ' imagens, exportando...');
}

// ============================================
// DEBUG: Verificar se as coleções têm imagens
// ============================================

print('=== DEBUG: Contagem total de imagens por coleção ===');
print('Sentinel-2 total:', ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').filterBounds(areaComMargem).size().getInfo());
print('Landsat 5 total:', ee.ImageCollection('LANDSAT/LT05/C02/T1_L2').filterBounds(areaComMargem).size().getInfo());
print('Landsat 7 total:', ee.ImageCollection('LANDSAT/LE07/C02/T1_L2').filterBounds(areaComMargem).size().getInfo());
print('Landsat 8 total:', ee.ImageCollection('LANDSAT/LC08/C02/T1_L2').filterBounds(areaComMargem).size().getInfo());
print('Landsat 9 total:', ee.ImageCollection('LANDSAT/LC09/C02/T1_L2').filterBounds(areaComMargem).size().getInfo());
print('Área com margem:', areaComMargem);

// Teste de filtro de data para um ano específico
print('--- DEBUG: Filtro de data para Sentinel-2 em 2020 ---');
var s2Test1 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(areaComMargem)
  .filterDate('2020-01-01', '2020-12-31');
print('Sentinel-2 2020 (sem filtro de nuvens):', s2Test1.size().getInfo());

var s2Test2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(areaComMargem)
  .filterDate('2020-01-01', '2020-12-31')
  .filter(ee.Filter.lte('cloudcover', 20));
print('Sentinel-2 2020 (com filtro de nuvens <=20):', s2Test2.size().getInfo());

// Verificar o range de datas disponíveis
var s2Test3 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(areaComMargem);
print('Sentinel-2 date range:', s2Test3.aggregate_array('system:time_start')
  .map(function(t) { return ee.Date(t).format('YYYY'); })
  .distinct()
  .sort()
  .getInfo());

// ============================================
// SENTINEL-2 (2015-2026)
// ============================================

var s2Collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(areaComMargem)
  .filter(ee.Filter.lte('cloudcover', 20));

var s2Bands = ['B8', 'B4', 'B3']; // NIR, Red, Green

print('--- SENTINEL-2 EXPORTS ---');
for (var year = Math.max(2015, anoInicio); year <= Math.min(anoFim, 2026); year++) {
  var startDate = ee.Date.fromYMD(year, 1, 1);
  var endDate = ee.Date.fromYMD(year, 12, 31);
  var filtered = s2Collection.filterDate(startDate, endDate);
  var count = filtered.size().getInfo();
  print('Sentinel-2 ' + year + ': ' + count + ' imagens');
  if (count > 0) {
    var mosaic = filtered.median().clip(areaComMargem);
    exportAnnualMosaic(s2Collection, year, s2Bands, 'Sentinel2_' + year, 10);
  }
}

// ============================================
// LANDSAT 5 (até 2011)
// ============================================

var lt5Collection = ee.ImageCollection('LANDSAT/LT05/C02/T1_L2')
  .filterBounds(areaComMargem)
  .filter(ee.Filter.lte('CLOUD_COVER', 20))
  .map(maskLandsatSR);

var lt5Bands = ['SR_B5', 'SR_B4', 'SR_B3']; // NIR, Red, Green

for (var year = Math.max(1984, anoInicio); year <= Math.min(2011, anoFim); year++) {
  exportAnnualMosaic(lt5Collection, year, lt5Bands, 'Landsat5_' + year, 30);
}

// ============================================
// LANDSAT 7 (2012-2013)
// ============================================

var lt7Collection = ee.ImageCollection('LANDSAT/LE07/C02/T1_L2')
  .filterBounds(areaComMargem)
  .filter(ee.Filter.lte('CLOUD_COVER', 20))
  .map(maskLandsatSR);

var lt7Bands = ['SR_B4', 'SR_B3', 'SR_B2']; // NIR, Red, Green

for (var year = Math.max(2012, anoInicio); year <= Math.min(2013, anoFim); year++) {
  exportAnnualMosaic(lt7Collection, year, lt7Bands, 'Landsat7_' + year, 30);
}

// ============================================
// LANDSAT 8 (2014-2021)
// ============================================

var lt8Collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(areaComMargem)
  .filter(ee.Filter.lte('CLOUD_COVER', 20))
  .map(maskLandsatSR);

var lt8Bands = ['SR_B6', 'SR_B5', 'SR_B4']; // NIR, Red, Green

for (var year = Math.max(2014, anoInicio); year <= Math.min(2021, anoFim); year++) {
  exportAnnualMosaic(lt8Collection, year, lt8Bands, 'Landsat8_' + year, 30);
}

// ============================================
// LANDSAT 9 (2022 em diante)
// ============================================

var lt9Collection = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterBounds(areaComMargem)
  .filter(ee.Filter.lte('CLOUD_COVER', 20))
  .map(maskLandsatSR);

var lt9Bands = ['SR_B4', 'SR_B3', 'SR_B2']; // Red, Green, Blue

for (var year = Math.max(2022, anoInicio); year <= Math.min(anoFim, 2026); year++) {
  exportAnnualMosaic(lt9Collection, year, lt9Bands, 'Landsat9_' + year, 30);
}

// ============================================
// SPOT 2008 - Mosaico Código Florestal
// ============================================

var spot2008 = ee.Image('GOOGLE/BRAZIL_FOREST_2008/V1/VISUAL')
  .select(['R', 'G', 'B'])
  .clip(areaComMargem);

Export.image.toDrive({
  image: spot2008,
  description: 'SPOT_2008_Mosaico_Codigo_Florestal',
  folder: 'GEE_Export_Anual',
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
