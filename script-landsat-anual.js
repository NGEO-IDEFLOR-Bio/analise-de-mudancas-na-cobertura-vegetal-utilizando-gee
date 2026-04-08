/**
 * PROCESSAMENTO MULTI-SATÉLITE: COMPOSIÇÃO PENETRAÇÃO ATMOSFÉRICA
 * Configuração: SWIR2, NIR, Green
 */

// 1. DEFINIÇÃO DA ÁREA E GEOMETRIA
var areaInteresse = ee.FeatureCollection("projects/sentinel-landsat-download/assets/gleba_sao_benedito");
var areaExport = areaInteresse.geometry().buffer(1000).bounds();

// 2. CONFIGURAÇÃO DO INTERVALO LANDSAT
var anoInicio = 2000;
var anoFim = 2008;

// 3. FUNÇÃO PARA SELECIONAR SATÉLITE E COMPOSIÇÃO SWIR (7-5-3 / 7-4-2)
var obterComposicaoSimulada = function(ano) {
  var colId, bandas;
  
  // Lógica de Bandas: [SWIR2, NIR, Green]
  if (ano >= 2013) {
    colId = "LANDSAT/LC08/C02/T1_L2"; // Landsat 8/9
    bandas = ['SR_B7', 'SR_B5', 'SR_B3']; // Equivalente a 7, 5, 3
  } else {
    colId = "LANDSAT/LT05/C02/T1_L2"; // Landsat 5
    bandas = ['SR_B7', 'SR_B4', 'SR_B2']; // Equivalente a 7, 4, 2
  }

  var dataInicio = ee.Date.fromYMD(ano, 1, 1);
  var dataFim = ee.Date.fromYMD(ano, 12, 31);

  var mosaico = ee.ImageCollection(colId)
    .filterBounds(areaExport)
    .filterDate(dataInicio, dataFim)
    .filter(ee.Filter.lt('CLOUD_COVER', 40))
    .median()
    .clip(areaExport);

  // Padroniza os nomes das bandas e aplica fator de escala da Coleção 2
  var final = mosaico.select(bandas, ['swir2', 'nir', 'green'])
    .multiply(0.0000275).add(-0.2)
    .float(); // Garante consistência de tipo de dado
    
  return final.set('year', ano);
};

// 4. PROCESSAMENTO E EXPORTAÇÃO LANDSAT
for (var ano = anoInicio; ano <= anoFim; ano++) {
  var imgFinal = obterComposicaoSimulada(ano);
  
  if (imgFinal.bandNames().size().gt(0)) {
    var descExport = 'Mosaico_Simulado_' + ano;
    
    // Visualização: Verde (Mata), Magenta (Solo Exposto), Preto (Água)
    Map.addLayer(imgFinal, {bands:['swir2', 'nir', 'green'], min: 0, max: 0.35}, 'Simulada ' + ano);
    
    Export.image.toDrive({
      image: imgFinal,
      description: descExport,
      folder: 'GEE_Saida_Analise',
      region: areaExport,
      scale: 30,
      maxPixels: 1e13
    });
  }
}

// 5. INCLUSÃO DO MOSAICO SPOT 2008 (ALTA RESOLUÇÃO)
var spot2008 = ee.Image("GOOGLE/BRAZIL_FOREST_2008/V1/VISUAL")
  .select(['R', 'G', 'B']) // Isola as bandas de imagem para evitar erros de metadados
  .clip(areaExport)
  .float(); // Padroniza para Float32 para compatibilidade total

Map.addLayer(spot2008, {min: 0, max: 255}, 'SPOT_2008_Referencia');

Export.image.toDrive({
  image: spot2008,
  description: 'SPOT_2008_Referencia_Processada',
  folder: 'GEE_Saida_Analise',
  region: areaExport,
  scale: 2.5,
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
});

// Centralizar Mapa
Map.centerObject(areaInteresse, 12);