// ============================================
// CONFIGURAÇÃO
// ============================================

var areaEstudo = ee.FeatureCollection("projects/sentinel-landsat-download/assets/pesam");

// Tipo de exportação: 'recorte' (clip no polígono) ou 'extensao' (bounding box)
var tipoExportacao = 'recorte';

// Período do mosaico
var dataInicio = '2024-01-01';
var dataFim = '2025-12-31';

// Cobertura máxima de nuvens (%)
var nuvensMax = 20;

// Escala de exportação (metros)
var escala = 10;

// Pasta no Google Drive
var pasta = 'GEE_Mosaico_Sentinel';

// ============================================
// PROCESSAMENTO
// ============================================

var geometria = tipoExportacao === 'recorte'
  ? areaEstudo.geometry()
  : areaEstudo.geometry().bounds();

function cleanMask(img) {
  var scl = img.select('SCL');
  var qa = img.select('QA60');
  var maskScl = scl.eq(4).or(scl.eq(5)).or(scl.eq(6));
  var maskQa = qa.bitwiseAnd(1 << 10).eq(0).and(qa.bitwiseAnd(1 << 11).eq(0));
  var maskBright = img.select('B2').lt(2000);
  return img.updateMask(maskScl).updateMask(maskQa).updateMask(maskBright)
    .divide(10000)
    .copyProperties(img, ['system:time_start']);
}

var colecao = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(geometria)
  .filterDate(dataInicio, dataFim)
  .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', nuvensMax))
  .map(cleanMask);

var mosaico = colecao
  .median()
  .clip(geometria);

var visNatural = { bands: ['B4', 'B3', 'B2'], min: 0.02, max: 0.2, gamma: 1.2 };
var visFalsaCor = { bands: ['B12', 'B8', 'B4'], min: 0.05, max: 0.4, gamma: 1.1 };

var sufixo = tipoExportacao === 'recorte' ? 'Recorte' : 'Extensao';

// ============================================
// VISUALIZAÇÃO
// ============================================

Map.centerObject(areaEstudo, 10);
Map.addLayer(mosaico, visNatural, 'Mosaico Cor Natural');
Map.addLayer(mosaico, visFalsaCor, 'Mosaico Falsa Cor B12-B8-B4', false);
Map.addLayer(areaEstudo.draw({ color: 'red', strokeWidth: 2 }), {}, 'Área de Estudo');

// ============================================
// EXPORTAÇÃO
// ============================================

Export.image.toDrive({
  image: mosaico.visualize(visNatural),
  description: 'Mosaico_Sentinel2_CorNatural_' + sufixo,
  folder: pasta,
  region: geometria,
  scale: escala,
  maxPixels: 1e13,
  skipEmptyTiles: true
});

Export.image.toDrive({
  image: mosaico.visualize(visFalsaCor),
  description: 'Mosaico_Sentinel2_FalsaCor_' + sufixo,
  folder: pasta,
  region: geometria,
  scale: escala,
  maxPixels: 1e13,
  skipEmptyTiles: true
});

print('Exportação: ' + sufixo + ' | Período: ' + dataInicio + ' a ' + dataFim);