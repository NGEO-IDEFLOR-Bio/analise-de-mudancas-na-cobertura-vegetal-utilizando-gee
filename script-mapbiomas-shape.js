/**
 * EXPORTAÇÃO COMPLETA MAPBIOMAS C10 - LEGENDA INTEGRAL
 */

// 1. CONFIGURAÇÃO DA ÁREA
var assetArea = "projects/sentinel-landsat-download/assets/gleba_sao_benedito"; 
var anoDesejado = 2023;
var roi = ee.FeatureCollection(assetArea);
var bounds = roi.geometry().buffer(1000).bounds();

// 2. ACESSO AO DATASET OFICIAL
var classificacao = ee.ImageCollection("projects/mapbiomas-public/assets/brazil/lulc/v1")
  .filter(ee.Filter.eq('collection_id', 10.0))
  .filter(ee.Filter.eq('year', anoDesejado))
  .first()
  .clip(bounds);

// 3. VETORIZAÇÃO (Raster -> Polígono)
var vetor = classificacao.reduceToVectors({
  geometry: bounds,
  scale: 30,
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'class_id',
  maxPixels: 1e13
});

// 4. DICIONÁRIO COMPLETO - LEGENDA COLEÇÃO 10 
var legendaDict = ee.Dictionary({
  '1': {n: 'Floresta', h: '#1f8d49'},
  '3': {n: 'Formacao Florestal', h: '#1f8d49'},
  '4': {n: 'Formacao Savanica', h: '#7dc975'},
  '5': {n: 'Mangue', h: '#04381d'},
  '6': {n: 'Floresta Alagavel', h: '#007785'},
  '49': {n: 'Restinga Arborea', h: '#02d659'},
  '10': {n: 'Veg Herbacea e Arbustiva', h: '#d6bc74'},
  '11': {n: 'Campo Alagado e Pantanosa', h: '#519799'},
  '12': {n: 'Formacao Campestre', h: '#d6bc74'},
  '32': {n: 'Apicum', h: '#fc8114'},
  '29': {n: 'Afloramento Rochoso', h: '#ffaa5f'},
  '50': {n: 'Restinga Herbacea', h: '#ad5100'},
  '14': {n: 'Agropecuaria', h: '#ffefc3'},
  '15': {n: 'Pastagem', h: '#edde8e'},
  '18': {n: 'Agricultura', h: '#E974ED'},
  '19': {n: 'Lavoura Temporaria', h: '#C27BA0'},
  '39': {n: 'Soja', h: '#f5b3c8'},
  '20': {n: 'Cana', h: '#db7093'},
  '40': {n: 'Arroz', h: '#c71585'},
  '62': {n: 'Algodao (beta)', h: '#ff69b4'},
  '41': {n: 'Outras Lavouras Temp', h: '#f54ca9'},
  '36': {n: 'Lavoura Perene', h: '#d082de'},
  '46': {n: 'Cafe', h: '#d68fe2'},
  '47': {n: 'Citrus', h: '#9932cc'},
  '35': {n: 'Dende', h: '#9065d0'},
  '48': {n: 'Outras Lavouras Perenes', h: '#e6ccff'},
  '9': {n: 'Silvicultura', h: '#7a5900'},
  '21': {n: 'Mosaico de Usos', h: '#ffefc3'},
  '22': {n: 'Area nao Vegetada', h: '#d4271e'},
  '23': {n: 'Praia Duna e Areal', h: '#ffa07a'},
  '24': {n: 'Area Urbanizada', h: '#d4271e'},
  '30': {n: 'Mineracao', h: '#9c0027'},
  '75': {n: 'Usina Fotovoltaica (beta)', h: '#c12100'},
  '25': {n: 'Outras Areas nao Veg', h: '#db4d4f'},
  '26': {n: 'Corpo Dagua', h: '#2532e4'},
  '33': {n: 'Rio Lago e Oceano', h: '#2532e4'},
  '31': {n: 'Aquicultura', h: '#091077'},
  '27': {n: 'Nao observado', h: '#ffffff'}
});

// 5. MAPEAMENTO DE ATRIBUTOS
var vetorComAtributos = vetor.map(function(feature) {
  var id = ee.String(ee.Number(feature.get('class_id')).toInt());
  var info = ee.Dictionary(legendaDict.get(id, {n: 'Nao Mapeado', h: '#cccccc'}));
  
  return feature.set({
    'id_classe': feature.get('class_id'),
    'nome_class': info.get('n'), // Nome com 10 chars para não truncar
    'cor_hex': info.get('h')
  });
});

// 6. EXPORTAÇÃO
Export.table.toDrive({
  collection: vetorComAtributos,
  description: 'MapBiomas_C10_Vetor_' + anoDesejado,
  folder: 'MAPBIOMAS_EXPORT_FINAL',
  fileFormat: 'SHP'
});

print('Vetorização concluída. Verifique a aba Tasks.');