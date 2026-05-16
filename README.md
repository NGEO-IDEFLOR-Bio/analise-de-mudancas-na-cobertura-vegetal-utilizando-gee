# Análise de Cobertura Vegetal com Google Earth Engine

## Resumo

Este repositório contém scripts em JavaScript para processamento de imagens de satélite no Google Earth Engine, voltados à análise de cobertura vegetal e detecção de mudanças em unidades de conservação e áreas sob monitoramento ambiental. Inclui scripts para mosaicos Sentinel-2 e Landsat, dados MapBiomas, referência SPOT 2008 e ferramentas para QGIS.

## Scripts Disponíveis

### Análise de Cobertura Vegetal (Sentinel-2)

| Script | Descrição |
|--------|-----------|
| [script-gee-comentado.js](script-gee-comentado.js) | Detecção de mudanças na cobertura vegetal via NDVI e MVI com documentação completa. Recomendado para aprendizado. |
| [script-gee-limpo.js](script-gee-limpo.js) | Versão otimizada do script acima com comentários mínimos. Para uso operacional. |

### Download de Mosaicos

| Script | Descrição |
|--------|-----------|
| [download-mosaico-sentinel.js](download-mosaico-sentinel.js) | Gera mosaico Sentinel-2 (cor natural e falsa cor B12-B8-B4) para um período configurável, com opção de exportar recorte do polígono ou extensão (bounding box). |
| [script-export-periodos.js](script-export-periodos.js) | Exporta mosaicos em períodos fixos (padrão: 3 anos) cobrindo de 1984 a 2026, combinando Landsat 5/7/8/9, Sentinel-2 e SPOT 2008. Inclui banda de data e buffer com margem ao redor da área. |
| [script-landsat-anual.js](script-landsat-anual.js) | Composições anuais Landsat (2000-2008) em SWIR2-NIR-Green com mosaico SPOT 2008 como referência histórica (2.5m). |
| [script-spot.js](script-spot.js) | Download do mosaico SPOT 2008 de alta resolução (2.5m) como referência histórica. |

### MapBiomas

| Script | Descrição |
|--------|-----------|
| [script-mapbiomas-raster.js](script-mapbiomas-raster.js) | Download de dados MapBiomas Coleção 10 em formato raster (GeoTIFF) com composição colorida por classe. |
| [script-mapbiomas-shape.js](script-mapbiomas-shape.js) | Exporta dados MapBiomas Coleção 10 em formato vetorial (shapefile) com legenda completa de nomes e cores. |

### Processamento QGIS

| Script | Descrição |
|--------|-----------|
| [aplica-ISO-8859-1.py](aplica-ISO-8859-1.py) | Corrige codificação de caracteres (acentos e especiais) nas camadas importadas. |
| [aplica-simbologia-pyqgis.py](aplica-simbologia-pyqgis.py) | Aplica simbologia categorizada automaticamente às camadas MapBiomas. |

## Detalhes dos Scripts de Análise (Sentinel-2)

Os scripts `script-gee-comentado.js` e `script-gee-limpo.js` utilizam imagens Sentinel-2 Surface Reflectance Harmonized (COPERNICUS/S2_SR_HARMONIZED) para detectar mudanças na cobertura vegetal.

### Processamento e Limpeza de Dados

Protocolo multi-etapas para garantir qualidade radiométrica:

1. **Filtragem SCL**: Mantém apenas pixels de vegetação (4), solo (5) e água (6).
2. **Filtragem QA60**: Remove nuvens (bit 10) e aerossóis (bit 11).
3. **Filtro de Brilho**: Remove reflexos especulares na banda azul (B2 < 2000).
4. **Normalização**: Converte valores digitais para reflectância (divide por 10.000).

### Períodos Temporais

A análise compara dois períodos de 6 meses (atual e anterior), balanceando cobertura de imagens e sensibilidade a mudanças.

### Índices de Vegetação

#### NDVI (Normalized Difference Vegetation Index)

$$NDVI = \frac{NIR - RED}{NIR + RED} = \frac{B8 - B4}{B8 + B4}$$

Valores > 0.5 indicam vegetação densa; próximos de zero ou negativos indicam ausência de vegetação.

#### MVI/NDMI (Moisture Vegetation Index)

$$MVI = \frac{NIR - SWIR}{NIR + SWIR} = \frac{B8A - B11}{B8A + B11}$$

Valores > 0.3 indicam vegetação bem hidratada. Complementa o NDVI na avaliação de umidade.

### Detecção de Mudanças

$$\Delta NDVI = NDVI_{Atual} - NDVI_{Passado}$$

Áreas com $\Delta NDVI < -0.2$ são sinalizadas como possível desmatamento ou degradação.

## Detalhes do Script de Exportação por Períodos

O `script-export-periodos.js` gera mosaicos contínuos cobrindo toda a série histórica:

- **Landsat 5** (1984-2011): bandas NIR, Red, Green, resolução 30m
- **Landsat 7** (2012-2013): bandas NIR, Red, Green, resolução 30m
- **Landsat 8** (2014-2021): bandas SWIR2, NIR, Red, resolução 30m
- **Landsat 9** (2022-2026): bandas Red, Green, Blue, resolução 30m
- **Sentinel-2** (2015-2026): bandas NIR, Red, Green, resolução 10m
- **SPOT 2008**: composição RGB, resolução 5m

Cada mosaico inclui banda de data (ano médio do período) e aplica buffer de 1 km ao redor da área de estudo.

## Configuração e Uso

### Pré-requisitos

1. Conta ativa no Google Earth Engine (https://earthengine.google.com)
2. Acesso ao asset com a geometria da área de estudo
3. Autenticação configurada no projeto Google Cloud

### Adaptação para Diferentes Áreas

Altere o asset da área de estudo em cada script:

```javascript
var areaEstudo = ee.FeatureCollection("projects/seu-projeto/assets/seu-asset");
```

### Parâmetros Configuráveis

| Script | Parâmetro | Descrição |
|--------|-----------|-----------|
| download-mosaico-sentinel.js | `tipoExportacao` | `'recorte'` (clip no polígono) ou `'extensao'` (bounding box) |
| download-mosaico-sentinel.js | `dataInicio` / `dataFim` | Período do mosaico |
| download-mosaico-sentinel.js | `nuvensMax` | Cobertura máxima de nuvens (%) |
| script-export-periodos.js | `anoInicio` / `anoFim` | Intervalo de anos |
| script-export-periodos.js | `periodoAnos` | Tamanho de cada período em anos |
| script-export-periodos.js | `margemMetros` | Buffer ao redor da área (m) |
| script-gee-comentado.js / limpo.js | Períodos | Janela temporal (padrão: 6 meses) |
| script-gee-comentado.js / limpo.js | Limiar NDVI | Sensibilidade do alerta (padrão: -0.2) |

### Execução

1. Acesse https://code.earthengine.google.com
2. Cole o conteúdo do script desejado
3. Clique em "Run" para visualizar as camadas no mapa
4. Na aba "Tasks", clique em "Run" para cada exportação desejada

## Saídas Geradas

### script-gee-comentado.js / limpo.js

| Saída | Descrição | Resolução |
|-------|-----------|-----------|
| Cor Natural (Atual/Passado) | Composição RGB | 10 m |
| Falsa Cor B12-B8-B4 (Atual/Passado) | Composição infravermelho | 10 m |
| NDVI (Atual/Passado) | Índice de vegetação | 10 m |
| MVI (Atual/Passado) | Índice de umidade | 20 m |
| Alerta de Mudança | Mapa binário de perda vegetativa | 10 m |

### download-mosaico-sentinel.js

| Saída | Descrição | Resolução |
|-------|-----------|-----------|
| Mosaico Cor Natural | Composição B4-B3-B2 (RGB) | 10 m |
| Mosaico Falsa Cor | Composição B12-B8-B4 | 10 m |

### script-export-periodos.js

Mosaicos por período (padrão: 3 anos) para cada satélite, mais SPOT 2008, todos com banda de data. Resolução varia entre 5m (SPOT), 10m (Sentinel-2) e 30m (Landsat).

## Interpretação de Resultados

- **Cores Naturais**: Simula a visão humana. Útil para identificação visual de mudanças de uso do solo.
- **Falsa Cor (B12-B8-B4)**: Realça umidade (SWIR), vegetação (NIR) e solo (Red).
- **NDVI**: Gradiente de vigor vegetativo. Verde escuro = vegetação densa; branco = ausência.
- **MVI/Umidade**: Gradiente seco-úmido.Útil para identificar stress hídrico.
- **Alerta de Mudança**: Pixels em magenta indicam queda significativa de NDVI.

### Integração em SIG

Os GeoTIFFs podem ser importados em QGIS/ArcGIS para cálculo de áreas, análise espacial e relatórios cartográficos.

## Limitações

1. **Cobertura de Nuvem**: Regiões com nuvens persistentes podem ter dados insuficientes.
2. **Variabilidade Sazonal**: Mudanças fenológicas podem gerar falsos positivos em NDVI.
3. **Resolução Espacial**: Sentinel-2 (10m) limita detecção em áreas < 1 hectare.
4. **Degradação Gradual**: Perda abrupta de NDVI é detectada, mas degradação gradual pode não ser.
5. **Validação**: Resultados remotos devem ser validados com dados de campo.

## Referências

- European Commission, ESA. (2015). Sentinel-2 User Handbook. https://sentinel.esa.int/
- Rouse, J. W. et al. (1974). Monitoring vegetation systems in the Great Plains with ERTS. NASA SP, 351(1), 309-317.
- Gorelick, N. et al. (2017). Google Earth Engine: Planetary-scale geospatial analysis for everyone. Remote Sensing of Environment, 202, 18-27.

## Autoria e Contribuições

Script desenvolvido para análise de mudanças na cobertura vegetal em unidades de conservação. Contribuições são bem-vindas via issues ou pull requests.

## Licença

Este projeto está disponível sob licença aberta para fins acadêmicos e de pesquisa.