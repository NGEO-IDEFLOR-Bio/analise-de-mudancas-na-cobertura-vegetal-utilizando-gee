from qgis.core import (
    QgsProject,
    QgsCategorizedSymbolRenderer,
    QgsRendererCategory,
    QgsSymbol
)
from qgis.utils import iface
from PyQt5.QtGui import QColor
from PyQt5.QtCore import Qt
import unicodedata

# --- Parâmetros ---
PREFIXO = "MapBiomas_"
ENCODING = "ISO-8859-1"

def remover_acentos(texto):
    if not texto: return ""
    return "".join(c for c in unicodedata.normalize('NFD', texto)
                  if unicodedata.category(c) != 'Mn').lower()

def smart_symbology_v4():
    project = QgsProject.instance()
    
    for layer in project.mapLayers().values():
        if layer.name().startswith(PREFIXO):
            print(f"\n--- Processando: {layer.name()} ---")
            
            # 1. Ajuste de Codificação (Trabalho inteligente)
            layer.dataProvider().setEncoding(ENCODING)
            layer.reload()

            # 2. Identificação dos Campos detectados no seu log
            fields = layer.fields()
            idx_id = -1
            idx_nome = -1
            idx_hex = -1
            
            for i, f in enumerate(fields):
                fname = remover_acentos(f.name())
                if 'id_cl' in fname: idx_id = i
                if 'nome_cl' in fname: idx_nome = i
                if 'cor_he' in fname: idx_hex = i

            if idx_id == -1 or idx_hex == -1:
                print(f"ERRO: Colunas essenciais não encontradas em {layer.name()}")
                continue

            # 3. Mapear Categorias (ID -> Nome e Cor)
            classification_map = {}
            for feature in layer.getFeatures():
                cid = str(feature[idx_id])
                c_nome = str(feature[idx_nome]) if idx_nome != -1 else cid
                hex_code = str(feature[idx_hex]).strip()
                
                if cid not in classification_map:
                    if not hex_code.startswith('#'): hex_code = '#' + hex_code
                    classification_map[cid] = (c_nome, hex_code)

            # 4. Criar Simbologia sem a "piroca" do erro de borda
            categories = []
            for cid, (nome, cor) in classification_map.items():
                symbol = QgsSymbol.defaultSymbol(layer.geometryType())
                symbol.setColor(QColor(cor))
                
                # CORREÇÃO DO ERRO: Acessa a camada do símbolo para tirar a borda
                if symbol.symbolLayerCount() > 0:
                    symbol.symbolLayer(0).setStrokeStyle(Qt.NoPen)
                
                # Valor (ID), Símbolo, Rótulo (Nome com acento corrigido)
                category = QgsRendererCategory(cid, symbol, nome)
                categories.append(category)

            # 5. Aplicar e atualizar interface
            renderer = QgsCategorizedSymbolRenderer(fields[idx_id].name(), categories)
            layer.setRenderer(renderer)
            layer.triggerRepaint()
            
            iface.layerTreeView().refreshLayerSymbology(layer.id())
            print(f"Simbologia aplicada com sucesso!")

    iface.mapCanvas().refresh()
    print("\n--- Processo Concluído com Sucesso ---")

smart_symbology_v4()