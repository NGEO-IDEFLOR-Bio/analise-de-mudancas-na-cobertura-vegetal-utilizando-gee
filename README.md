# Análise de Mudanças na Cobertura Vegetal Utilizando Google Earth Engine

## Resumo

Este repositório contém um script em JavaScript para processamento de imagens de satélite Sentinel-2 voltado à detecção de mudanças na cobertura vegetal em unidades de conservação e áreas sob monitoramento ambiental. O script utiliza a plataforma Google Earth Engine para acesso aos dados e processamento em nuvem, possibilitando análises em larga escala com recursos computacionais otimizados.

## Scripts Disponíveis

### Análise de Cobertura Vegetal (Sentinel-2)

| Script | Descrição |
|--------|-----------|
| [script-gee-comentado.js](script-gee-comentado.js) | Script principal com documentação completa. Utiliza imagens Sentinel-2 para detectar mudanças na cobertura vegetal através de NDVI e MVI. Recomendado para aprendizado. |
| [script-gee-limpo.js](script-gee-limpo.js) | Versão otimizada do script acima com comentários mínimos. Para uso operacional após configuração. |

### MapBiomas

| Script | Descrição |
|--------|-----------|
| [script-mapbiomas-raster.js](script-mapbiomas-raster.js) | Download de dados MapBiomas Coleção 10 em formato raster (GeoTIFF). Exporta composição colorida por classe de uso do solo. |
| [script-mapbiomas-shape.js](script-mapbiomas-shape.js) | Exporta dados MapBiomas Coleção 10 em formato vetorial (shapefile). Realiza vetorização do raster classifying e inclui legenda completa com nomes e cores. |

### Landsat e SPOT

| Script | Descrição |
|--------|-----------|
| [script-landsat-anual.js](script-landsat-anual.js) | Gera composições anuais Landsat (2000-2008) utilizando composição SWIR2-NIR-Green (7-5-3). Inclui mosaico SPOT 2008 como referência histórica de alta resolução (2.5m). |
| [script-spot.js](script-spot.js) | Download do mosaico SPOT 2008 de alta resolução (2.5m) para a área de estudo. Útil como referência histórica para detecção de mudanças. |

### Processamento QGIS

| Script | Descrição |
|--------|-----------|
| [aplica-ISO-8859-1.py](aplica-ISO-8859-1.py) | Script Python para QGIS que corrige a codificação de caracteres das camadas importadas (acentos e caracteres especiais). |
| [aplica-simbologia-pyqgis.py](aplica-simbologia-pyqgis.py) | Aplica symbologia categorizada automaticamente às camadas MapBiomas, utilizando as cores e nomes das classes definidos na vetorização. |

## Versões Disponíveis

- [script-gee-comentado.js](script-gee-comentado.js): Versão comentada com documentação completa de cada seção. Recomendada para aprendizado e compreensão dos fundamentos metodológicos.
- [script-gee-limpo.js](script-gee-limpo.js): Versão otimizada com comentários mínimos. Recomendada para uso operacional após configuração inicial.

## Contextualização Científica

A degradação e conversão de habitats naturais constituem uma das principais ameaças à biodiversidade global. O monitoramento contínuo de áreas protegidas e ecossistemas sensíveis é fundamental para subsidiar políticas de conservação e ações de fiscalização. Os sensores multiespectrais a bordo do satélite Sentinel-2 permitem quantificar alterações na cobertura vegetal através de índices espectrais de alta resolução temporal e espacial.

## Fundamentos Metodológicos

### Dados Utilizados

O script utiliza imagens do produto Sentinel-2 Surface Reflectance Harmonized (COPERNICUS/S2_SR_HARMONIZED), que fornece reflectância de superfície em dez bandas espectrais com resolução de 10 a 60 metros. Este produto já apresenta correções atmosféricas e radiométricas, reduzindo a necessidade de pré-processamento adicional.

### Processamento e Limpeza de Dados

O script implementa um protocolo multi-etapas para garantir qualidade radiométrica:

1. **Filtragem pela Scene Classification Layer (SCL)**: Remove pixels classificados como nuvens, sombras ou neve, mantendo apenas aqueles associados a vegetação, solo exposto e corpos hídricos.

2. **Filtragem pela camada QA60**: Aplica máscaras binárias para eliminar interferência atmosférica (aerossóis) e cobertura nuvosa residual.

3. **Filtro de Brilho**: Remove artefatos de reflexão especular (fantasmas de nuvem) através de limiar aplicado à banda azul (banda 2).

4. **Normalização Radiométrica**: Converte valores digitais brutos para reflectância de superfície (escala 0-1) dividindo por 10.000.

### Períodos Temporais

A análise compara dois períodos de 6 meses:
- **Período Atual**: últimos 6 meses
- **Período Anterior**: 6-12 meses atrás

Esta janela temporal equilibra duas necessidades: maximizar a cobertura de imagens livres de nuvens (comum em regiões tropicais) e manter sensibilidade a mudanças entre períodos.

### Índices de Vegetação

#### NDVI (Normalized Difference Vegetation Index)

$$NDVI = \frac{NIR - RED}{NIR + RED} = \frac{B8 - B4}{B8 + B4}$$

Amplitude: -1 a 1. Valores superiores a 0,5 indicam presença de vegetação densa, enquanto valores próximos a zero ou negativos sugerem ausência de vegetação ou superfícies impermeáveis.

#### MVI/NDMI (Moisture Vegetation Index / Normalized Difference Moisture Index)

$$MVI = \frac{NIR - SWIR}{NIR + SWIR} = \frac{B8A - B11}{B8A + B11}$$

Amplitude: -1 a 1. Este índice é particularmente sensível ao conteúdo de água nas folhas e solo, complementando o NDVI na avaliação de saúde e vigor vegetativo. Valores superiores a 0,3 indicam vegetação bem hidratada.

### Detecção de Mudanças

A mudança na cobertura vegetal é quantificada pela variação temporal de NDVI:

$$\Delta NDVI = NDVI_{Atual} - NDVI_{Passado}$$

Considera-se como alerta de possível desmatamento ou degradação aquelas áreas onde $\Delta NDVI < -0,2$. Este limiar representa uma queda significativa no vigor vegetativo e foi selecionado para balancear sensibilidade com redução de falsos positivos associados a variações sazonais.

## Configuração e Uso

### Pré-requisitos

1. Conta ativa no Google Earth Engine (inscrição em https://earthengine.google.com)
2. Acesso aos dados de asset do Google Cloud Storage contendo a geometria da área de estudo
3. Autenticação configurada no seu projeto Google Cloud

### Adaptação para Diferentes Áreas

A principal modificação necessária é a definição do asset que contém a geometria da área de estudo. Esta modificação é idêntica em ambas as versões:

**Em script-gee-comentado.js (linha 9):**
```javascript
var areaEstudo = ee.FeatureCollection("projects/seu-projeto/assets/seu-asset");
```

**Em script-gee-limpo.js (linha 1):**
```javascript
var areaEstudo = ee.FeatureCollection("projects/seu-projeto/assets/seu-asset");
```

Substitua `seu-projeto` e `seu-asset` pelos identificadores do seu projeto e asset no Google Earth Engine.

### Ajustes Opcionais

Parâmetros que podem ser ajustados conforme necessário:

1. **Períodos Temporais** (linhas 14-16):
   ```javascript
   var seisMesesAtras = hoje.advance(-6, 'month');
   var umAnoAtras = hoje.advance(-12, 'month');
   ```
   Altere os valores numéricos para períodos diferentes.

2. **Limiar de Alerta** (linha 63):
   ```javascript
   var alertaPerda = ndviAtual.subtract(ndviPassado).lt(-0.2);
   ```
   Ajuste o valor -0.2 para maior ou menor sensibilidade. Valores mais negativos (ex: -0.1) aumentam sensibilidade.

3. **Índices Espectrais**: As bandas espectrais podem ser alteradas (ver tabela de bandas do Sentinel-2).

4. **Pasta de Exportação** (linhas 113, 125, 137, etc.):
   ```javascript
   folder: 'GEE_Analise_Cobertura',
   ```

### Execução

1. Acesse https://code.earthengine.google.com
2. Cole o conteúdo do arquivo `script-gee-comentado.js` (para versão comentada) ou `script-gee-limpo.js` (para versão otimizada)
3. Clique em "Run" para visualizar as camadas no mapa
4. Na aba "Tasks", clique em "Run" para cada exportação desejada

## Saídas Geradas

O script produz as seguintes camadas exportáveis:

| Saída | Descrição | Resolução | Formato |
|-------|-----------|-----------|---------|
| NDVI_Atual_AreaEstudo | Índice de vegetação atual | 10 m | GeoTIFF |
| NDVI_Passado_AreaEstudo | Índice de vegetação período anterior | 10 m | GeoTIFF |
| MVI_Atual_AreaEstudo | Índice de umidade atual | 20 m | GeoTIFF |
| MVI_Passado_AreaEstudo | Índice de umidade período anterior | 20 m | GeoTIFF |
| Cor_Natural_Atual_AreaEstudo | Composição RGB falsa-cor período atual | 10 m | GeoTIFF |
| Cor_Natural_Passado_AreaEstudo | Composição RGB falsa-cor período anterior | 10 m | GeoTIFF |
| Alerta_Mudanca_AreaEstudo | Mapa binário de perda vegetativa | 10 m | GeoTIFF |

## Interpretação de Resultados

### Visualização no Mapa

O script disponibiliza múltiplas camadas para interpretação visual:

- **Cores Naturais**: Composição RGB que simula a visão humana. Útil para identificação de mudanças evidentes de uso do solo.
- **NDVI**: Código de cores mostra gradiente de vigor vegetativo. Áreas verdes escuras representam vegetação densa; áreas brancas representam ausência de vegetação.
- **MVI/Umidade**: Gradiente marrom-branco-azul indicando umidade relativa. Útil para identificar stress hídrico.
- **Alerta de Mudança**: Pixels em magenta destacam áreas com queda significativa de NDVI.

### Integração em SIG

Os arquivos GeoTIFF exportados podem ser importados em software de análise geoespacial (QGIS, ArcGIS) para:

1. Cálculo de áreas afetadas (rasterização e tabulação cruzada)
2. Análise espacial e correlação com fatores socioeconômicos
3. Sobreposição com limites administrativos e camadas temáticas
4. Relatórios cartográficos para fins de monitoramento e fiscalização

## Limitações e Considerações

1. **Cobertura de Nuvem**: Regiões com cobertura nuvosa persistente podem apresentar dados insuficientes, mesmo após filtragem. Períodos em estação seca geralmente oferecem melhor qualidade.

2. **Variabilidade Sazonal**: Mudanças sazonais em fenologia vegetativa podem produzir variações em NDVI não associadas a desmatamento real. Comparações multi-anuais aumentam confiabilidade.

3. **Resolução Espacial**: A resolução de 10 metros do Sentinel-2 limita a detecção de conversões em áreas muito pequenas (<1 hectare).

4. **Detecção de Degradação**: O script detecta perda abrupta de NDVI. Degradação gradual ou alterações em composição florestal sem redução significativa de NDVI podem não ser capturadas.

5. **Validação em Campo**: Interpretação remota deve ser validada com dados de levantamento em campo para avaliação de acurácia.

## Referências

European Commission, ESA. (2015). Sentinel-2 User Handbook. Available at: https://sentinel.esa.int/

Rouse, J. W., Haas, R. H., Schell, J. A., & Deering, D. W. (1974). Monitoring vegetation systems in the Great Plains with ERTS. NASA Special Publication, 351(1), 309-317.

Gorelick, N., Hancher, M., Dixon, M., Ilyushchenko, S., Thau, D., & Moore, R. (2017). Google Earth Engine: Planetary-scale geospatial analysis for everyone. Remote Sensing of Environment, 202, 18-27.

## Autoria e Contribuições

Script desenvolvido para análise de mudanças na cobertura vegetal em unidades de conservação. Contribuições e melhorias são bem-vindas mediante submissão de issues ou pull requests.

## Licença

Este projeto está disponível sob licença aberta para fins acadêmicos e de pesquisa.
