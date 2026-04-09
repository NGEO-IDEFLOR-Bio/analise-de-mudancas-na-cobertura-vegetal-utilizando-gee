/**
 * DOWNLOAD MAPBIOMAS COLEÇÃO 10 - DATASET OFICIAL
 */

// 1. ÁREA DE INTERESSE (Sem menção a nomes específicos)
var assetArea = "projects/sentinel-landsat-download/assets/gleba_sao_benedito"; 
var roi = ee.FeatureCollection(assetArea);
var bounds = roi.geometry().buffer(1000).bounds();

// 2. LEGENDA OFICIAL (Extraída do PDF da Coleção 10)
var classes = [1, 3, 4, 5, 6, 49, 10, 11, 12, 32, 29, 50, 14, 15, 18, 19, 39, 20, 40, 62, 41, 36, 46, 47, 35, 48, 9, 21, 22, 23, 24, 30, 75, 25, 26, 33, 31, 27];
var palette = ["#1f8d49", "#1f8d49", "#7dc975", "#04381d", "#007785", "#02d659", "#d6bc74", "#519799", "#d6bc74", "#fc8114", "#ffaa5f", "#ad5100", "#ffefc3", "#edde8e", "#E974ED", "#C27BA0", "#f5b3c8", "#db7093", "#c71585", "#ff69b4", "#f54ca9", "#d082de", "#d68fe2", "#9932cc", "#9065d0", "#e6ccff", "#7a5900", "#ffefc3", "#d4271e", "#ffa07a", "#d4271e", "#9c0027", "#c12100", "#db4d4f", "#2532e4", "#2532e4", "#091077", "#ffffff"];

// 3. ACESSO AO DATASET OFICIAL (Earth Engine Catalog)
// O MapBiomas agora usa uma coleção centralizada v1
var mapbiomasCollection = ee.ImageCollection("projects/mapbiomas-public/assets/brazil/lulc/v1")
  .filter(ee.Filter.eq('collection_id', 10.0)); // Filtra especificamente a Coleção 10

// 4. ANOS DESEJADOS
var anos = [2000, 2005, 2023];

// 5. PROCESSAMENTO E EXPORTAÇÃO
anos.map(function(ano) {
  // Filtra a imagem do ano específico dentro da coleção
  var classificacao = mapbiomasCollection
    .filter(ee.Filter.eq('year', ano))
    .first()
    .clip(bounds);
  
  // Converte para RGB usando a paleta do PDF
  var visualizada = classificacao.visualize({
    min: 0,
    max: 75, 
    palette: palette,
    forceRgbOutput: true
  });

  var nomeArquivo = 'Uso_Solo_C10_' + ano;
  
  Map.addLayer(visualizada, {}, 'Uso do Solo ' + ano);

  Export.image.toDrive({
    image: visualizada,
    description: nomeArquivo,
    folder: 'MAPBIOMAS_C10_SAIDA',
    region: bounds,
    scale: 30,
    maxPixels: 1e13
  });
});

Map.centerObject(roi, 12);