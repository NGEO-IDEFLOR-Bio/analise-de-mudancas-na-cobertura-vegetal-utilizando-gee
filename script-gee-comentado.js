/**
 * Script de Análise de Mudanças na Cobertura Vegetal
 * Utiliza dados Sentinel-2 para detecção de desmatamento em áreas de conservação
 * 
 * CONFIGURAÇÃO INICIAL:
 * Altere a linha abaixo para apontar para seu próprio asset (unidade de conservação)
 * Formato: ee.FeatureCollection("projects/seu-projeto/assets/seu-asset")
 */

var areaEstudo = ee.FeatureCollection("projects/ee-samuelsantosambientalcourse/assets/flota_iriri");

/**
 * 1. DEFINIÇÃO DOS PERÍODOS TEMPORAIS
 * 
 * Utiliza-se uma janela de 6 meses para maximizar a cobertura de imagens sem nuvens
 * e capturar tendências sazonais. A comparação entre dois períodos permite detectar
 * mudanças significativas na cobertura vegetal.
 */
var hoje = ee.Date(new Date());
var seisMesesAtras = hoje.advance(-6, 'month');
var umAnoAtras = hoje.advance(-12, 'month');

/**
 * 2. FUNÇÃO DE LIMPEZA E PRÉ-PROCESSAMENTO DE IMAGENS
 * 
 * Aplica múltiplas máscaras para remover interferências atmosféricas e ruído:
 * - SCL (Scene Classification Layer): mantém apenas pixels classificados como
 *   vegetação (4), solo (5) ou água (6)
 * - QA60: filtra nuvens e aerossol usando flags de qualidade
 * - Filtro de brilho: remove pixels com valores anormalmente altos que indicam
 *   reflexos de nuvens ou ruído radiométrico
 * - Normalização: divide valores por 10000 para obter reflectância calibrada
 */
function cleanMask(img) {
  var scl = img.select('SCL');
  var qa = img.select('QA60');
  
  // Máscara SCL: seleciona categorias de interesse (vegetação, solo, água)
  var maskScl = scl.eq(4).or(scl.eq(5)).or(scl.eq(6));
  
  // Máscara QA60: remove nuvens (bit 10) e aerossol (bit 11)
  var maskQa = qa.bitwiseAnd(1 << 10).eq(0).and(qa.bitwiseAnd(1 << 11).eq(0));
  
  // Máscara de brilho: remove pixels com reflectância anômala no azul (banda 2)
  var maskBright = img.select('B2').lt(2000);
  
  // Aplicação sequencial de máscaras e normalização radiométrica
  return img.updateMask(maskScl).updateMask(maskQa).updateMask(maskBright)
            .divide(10000)
            .copyProperties(img, ["system:time_start"]);
}

/**
 * 3. PROCESSAMENTO E FILTRAGEM DAS COLEÇÕES SENTINEL-2
 * 
 * Cria duas coleções de imagens para períodos distintos, ambas submetidas
 * à função de limpeza. O produto SR_HARMONIZED garante consistência espectral
 * entre órbitas do satélite Sentinel-2.
 */

// Período atual: últimos 6 meses
var s2Atual = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(areaEstudo)
    .filterDate(seisMesesAtras, hoje)
    .map(cleanMask);

// Período anterior: 6-12 meses atrás
var s2Passado = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(areaEstudo)
    .filterDate(umAnoAtras, seisMesesAtras)
    .map(cleanMask);

/**
 * 4. GERAÇÃO DE MOSAICOS
 * 
 * Combina imagens de múltiplas datas em um único mosaico usando a mediana.
 * A mediana é mais robusta que a média para reduzir ruído remanescente e valores
 * atípicos. Todos os pixels são recortados para os limites da área de estudo.
 */
var mosAtual = s2Atual.median().clip(areaEstudo);
var mosPassado = s2Passado.median().clip(areaEstudo);

/**
 * 5. CÁLCULO DOS ÍNDICES DE VEGETAÇÃO
 * 
 * NDVI (Normalized Difference Vegetation Index):
 * (NIR - RED) / (NIR + RED) = (B8 - B4) / (B8 + B4)
 * Amplitude: -1 a 1. Valores > 0.5 indicam vegetação densa.
 * 
 * MVI/NDMI (Moisture Vegetation Index ou Normalized Difference Moisture Index):
 * (NIR - SWIR) / (NIR + SWIR) = (B8A - B11) / (B8A + B11)
 * Amplitude: -1 a 1. Valores > 0.3 indicam alta umidade/vegetação saudável.
 */

// NDVI: detecta presença e vigor da vegetação
var ndviAtual = mosAtual.normalizedDifference(['B8', 'B4']).rename('ndvi_atual');
var ndviPassado = mosPassado.normalizedDifference(['B8', 'B4']).rename('ndvi_passado');

// MVI: complementa NDVI ao avaliar conteúdo de água nas plantas
var mviAtual = mosAtual.normalizedDifference(['B8A', 'B11']).rename('mvi_atual');
var mviPassado = mosPassado.normalizedDifference(['B8A', 'B11']).rename('mvi_passado');

/**
 * 6. DETECÇÃO DE MUDANÇAS
 * 
 * Calcula a diferença de NDVI entre os períodos. Uma queda > 0.2 no NDVI
 * indica provável perda de cobertura vegetal (desmatamento ou degradação).
 * O limiar pode ser ajustado conforme a sensibilidade desejada.
 */
var alertaPerda = ndviAtual.subtract(ndviPassado).lt(-0.2);
var alertaPerdaMasked = alertaPerda.updateMask(alertaPerda);

/**
 * 7. VISUALIZAÇÃO NO MAPA
 * 
 * Exibe as camadas processadas no mapa interativo do Google Earth Engine.
 * As camadas podem ser ativadas/desativadas no painel de controle.
 */

// Centraliza o mapa na área de estudo com zoom apropriado
Map.centerObject(areaEstudo, 10);

/**
 * CAMADAS DE CORES NATURAIS (RGB)
 * Composição: Bandas Vermelho (B4), Verde (B3), Azul (B2)
 * Simula a visão humana e permite interpretação visual de alterações
 */
Map.addLayer(mosPassado, 
  {bands:['B4','B3','B2'], min:0.02, max:0.2, gamma:1.2}, 
  '1a. Cor Natural (Passado)', 
  false);

Map.addLayer(mosAtual, 
  {bands:['B4','B3','B2'], min:0.02, max:0.2, gamma:1.2}, 
  '1b. Cor Natural (Atual)');

/**
 * CAMADAS DE NDVI
 * Paleta: branco (sem vegetação) → verde escuro (vegetação densa)
 */
var visNdvi = {min: 0.5, max: 0.9, palette: ['white', 'yellow', 'green', 'darkgreen']};
Map.addLayer(ndviPassado, visNdvi, '2a. NDVI (Passado)', false);
Map.addLayer(ndviAtual, visNdvi, '2b. NDVI (Atual)', false);

/**
 * CAMADAS DE MVI/UMIDADE
 * Paleta: marrom (seco) → branco (neutro) → azul (úmido)
 */
var visMvi = {min: -0.1, max: 0.5, palette: ['brown', 'white', 'blue']};
Map.addLayer(mviPassado, visMvi, '3a. MVI/Umidade (Passado)', false);
Map.addLayer(mviAtual, visMvi, '3b. MVI/Umidade (Atual)', false);

/**
 * CAMADA DE ALERTAS
 * Pixels em magenta indicam áreas com queda significativa de NDVI
 */
Map.addLayer(alertaPerdaMasked, {palette: ['#FF00FF']}, '!!! ALERTA DE PERDA DE VEGETAÇÃO');

/**
 * CONTORNO DA ÁREA DE ESTUDO
 * Linha vermelha delineando os limites da unidade de conservação ou área monitorada
 */
Map.addLayer(areaEstudo.draw({color: 'red', strokeWidth: 2}), {}, 'Limite da Área de Estudo');

/**
 * 8. EXPORTAÇÃO DE RESULTADOS
 * 
 * Exporta todas as camadas processadas para o Google Drive para análise posterior
 * e integração em sistemas de informação geográfica (SIG) como ArcGIS ou QGIS.
 * 
 * CONFIGURAÇÃO:
 * - folder: Nome da pasta no Google Drive onde os arquivos serão salvos
 * - scale: Resolução espacial em metros (10m para NDVI, 20m para MVI)
 * - maxPixels: Limite de processamento (1e13 = sem limite prático)
 */

/**
 * Exportação de NDVI: Dados brutos para análise quantitativa
 * Formato: GeoTIFF com valores de -1 a 1
 */
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

/**
 * Exportação de MVI: Índice de umidade para análise de saúde vegetal
 * Formato: GeoTIFF com valores de -1 a 1
 */
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

/**
 * Exportação de Cores Naturais: Imagens compostas RGB para apresentações
 * Formato: GeoTIFF com valores de reflectância normalizada (0-255 após visualização)
 */
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

/**
 * Exportação de Alertas: Mapa binário de detecção de mudanças
 * Formato: GeoTIFF com valores 0 (sem mudança) e 1 (perda de vegetação)
 */
Export.image.toDrive({
  image: alertaPerda.uint8(),
  description: 'Alerta_Mudanca_AreaEstudo',
  folder: 'GEE_Analise_Cobertura',
  region: areaEstudo.geometry(),
  scale: 10,
  maxPixels: 1e13
});