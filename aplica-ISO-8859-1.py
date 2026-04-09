from qgis.utils import iface
from qgis.core import QgsProject

prefixo = "MapBiomas_"
nova_codificacao = "ISO-8859-1"

for layer in QgsProject.instance().mapLayers().values():
    if layer.name().startswith(prefixo):
        # 1. Ajusta a codificação (Trabalho inteligente)
        layer.dataProvider().setEncoding(nova_codificacao)
        
        # 2. Força a leitura do arquivo com o novo encoding
        layer.reload() 
        
        # 3. Avisa o Canvas e a Legenda que a porra toda mudou
        layer.triggerRepaint()
        iface.layerTreeView().refreshLayerSymbology(layer.id())
        
        print(f"Camada {layer.name()} corrigida para {nova_codificacao}")

# Refresh total no canvas pra garantir
iface.mapCanvas().refreshAllLayers()
print("Finalizado sem erros.")