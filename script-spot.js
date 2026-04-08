/**
 * PROCESSAMENTO SPOT 2008: ALTA RESOLUÇÃO (RGB)
 */

// 1. INPUTS DE CONFIGURAÇÃO
var assetCaminho = "projects/sentinel-landsat-download/assets/gleba_sao_benedito"; 
var bufferDistancia = 1000;

// Geometria
var roi = ee.FeatureCollection(assetCaminho);
var areaExport = roi.geometry().buffer(bufferDistancia).bounds();

// 2. TRATAMENTO DO SPOT
// Selecionamos apenas R, G, B para descartar a banda UInt32 de máscara que causa erro
var spot = ee.Image("GOOGLE/BRAZIL_FOREST_2008/V1/VISUAL")
  .select(['R', 'G', 'B'])
  .clip(areaExport)
  .float(); // Converte para Float32 para ser compatível com exportação padrão

// 3. VISUALIZAÇÃO E EXPORT
Map.addLayer(spot, {min: 0, max: 255}, 'SPOT_2008_Referencia');

Export.image.toDrive({
  image: spot,
  description: 'SPOT_2008_Referencia_AltaRes',
  folder: 'GEE_Raster_Saida',
  region: areaExport,
  scale: 2.5, // Mantém a nitidez total do SPOT
  maxPixels: 1e13
});

Map.centerObject(roi, 12);