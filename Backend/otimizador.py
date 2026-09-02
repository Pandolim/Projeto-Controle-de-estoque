from collections import Counter

def calcular_cortes_1d(demandas, retalhos_disponiveis=None, tamanho_tabua_bruta=2500, perda_desponte=300, espessura_serra=3, limite_util=400):
    if retalhos_disponiveis is None:
        retalhos_disponiveis = []
        
    area_util_nova = tamanho_tabua_bruta - perda_desponte
    
    pecas = []
    for comp, qtd in demandas.items():
        pecas.extend([comp] * qtd)
    pecas.sort(reverse=True) # Ordena as maiores peças primeiro
    
    # "Caixas" de madeira disponíveis. Começa pelas sobras antigas (da maior para a menor)
    bins = [{'tipo': 'Retalho do Banco', 'tamanho_original': r, 'pecas': []} 
            for r in sorted(retalhos_disponiveis, reverse=True)]
    
    # Processo de alocação das peças
    for peca in pecas:
        alocada = False
        for b in bins:
            # Calcula espaço já ocupado na madeira + a espessura da serra a cada corte
            espaco_usado = sum(b['pecas']) + (len(b['pecas']) * espessura_serra) if b['pecas'] else 0
            
            if espaco_usado + peca <= b['tamanho_original']:
                b['pecas'].append(peca)
                alocada = True
                break
                
        if not alocada:
            # Se não couber em nenhum retalho nem nas tábuas já abertas, pega uma nova no pátio
            if peca <= area_util_nova:
                bins.append({'tipo': 'Tábua Nova', 'tamanho_original': area_util_nova, 'pecas': [peca]})
            else:
                print(f"🚨 ALERTA: Peça de {peca}mm é maior que a área útil de {area_util_nova}mm!")

    # ==========================================
    # PROCESSAMENTO DOS RESULTADOS
    # ==========================================
    padroes_novas = []
    instrucoes_retalhos = []
    novos_retalhos_gerados = []
    refugo_mm = 0
    
    for b in bins:
        if not b['pecas']:
            # Se um retalho do banco foi puxado mas não precisou ser usado, ele volta inteiro
            novos_retalhos_gerados.append(b['tamanho_original'])
            continue
            
        espaco_usado = sum(b['pecas']) + ((len(b['pecas']) - 1) * espessura_serra)
        sobra = b['tamanho_original'] - espaco_usado
        
        # Classifica a sobra final deste pedaço
        if sobra >= limite_util:
            novos_retalhos_gerados.append(sobra)
        elif sobra > 0:
            refugo_mm += sobra
            
        # Separa as instruções de retalho vs tábua nova
        if b['tipo'] == 'Tábua Nova':
            padroes_novas.append(tuple(b['pecas']))
        else:
            instrucoes_retalhos.append({'tamanho': b['tamanho_original'], 'cortes': b['pecas'], 'sobra': sobra})
            
    padroes_consolidados = Counter(padroes_novas)
    total_tabuas_novas = len(padroes_novas)
    
    stats = {
        'novos_retalhos': novos_retalhos_gerados,
        'refugo_lixo_m': refugo_mm / 1000,
    }
    
    return padroes_consolidados, total_tabuas_novas, instrucoes_retalhos, stats