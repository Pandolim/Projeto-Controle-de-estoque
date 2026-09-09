import pandas as pd
import numpy as np
import random
import sys
import os

caminho_api = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'api'))
sys.path.append(caminho_api)

from sqlalchemy.orm import sessionmaker
from models import engine, Sofa, ReceitaSofa, EstoquePeca

def carregar_dados():
    Session = sessionmaker(bind=engine)
    session = Session()

    print("1. Lendo o relatório de estoque para capturar os nomes dos sofás...")
    df_estoque = pd.read_excel('estoque.xlsx', sheet_name=0)
    df_estoque['Código do Item'] = df_estoque['Código do Item'].astype(str).str.strip()
    
    dicionario_nomes = {}
    for _, row in df_estoque.iterrows():
        codigo_completo = row['Código do Item']
        nome = row['Descrição do Item']
        codigo_base = ".".join(codigo_completo.split('.')[:3]) 
        dicionario_nomes[codigo_base] = nome

    print("2. Lendo e limpando as planilhas de receita (BOM)...")
    xls_receitas = pd.ExcelFile('receitas.xlsx')
    
    lista_abas = []
    for aba in xls_receitas.sheet_names:
        if "Tabela dinâmica" in aba or aba == "Página11":
            continue
            
        df_aba = pd.read_excel('receitas.xlsx', sheet_name=aba)
        df_aba.columns = [str(c).strip().upper() for c in df_aba.columns]
        
        for col in ['CÓDIGO INTERNO S/ COR', 'CÓDIGO INTERNO', 'MATÉRIA PRIMA', 'QTD.', 'D1', 'D2', 'D3']:
            if col not in df_aba.columns:
                df_aba[col] = np.nan
                
        lista_abas.append(df_aba)
    
    df_receitas = pd.concat(lista_abas, ignore_index=True)

    print("3. Cruzando os dados e extraindo apenas as peças de madeira...")
    df_receitas['CÓDIGO FINAL'] = df_receitas['CÓDIGO INTERNO S/ COR'].fillna(df_receitas['CÓDIGO INTERNO'])
    df_receitas = df_receitas.dropna(subset=['CÓDIGO FINAL'])
    df_receitas['CÓDIGO FINAL'] = df_receitas['CÓDIGO FINAL'].astype(str).str.strip()
    df_receitas['CÓDIGO FINAL'] = df_receitas['CÓDIGO FINAL'].apply(lambda x: x[:-2] if x.endswith('.0') else x)
    
    df_madeira = df_receitas[df_receitas['MATÉRIA PRIMA'].astype(str).str.contains('Madeira', case=False, na=False)]
    df_madeira = df_madeira.dropna(subset=['D1', 'D2', 'QTD.'])

    print("4. Mapeando o catálogo atual de peças do Supabase...")
    pecas_bd = session.query(EstoquePeca).all()
    mapa_pecas = {}
    
    # LISTA MESTRA DE IDs (Evita clonagem de códigos)
    todos_ids_existentes = set()
    
    for p in pecas_bd:
        chave = (p.comprimento_d1, p.largura_d2, p.espessura_d3)
        mapa_pecas[chave] = p.id_peca
        todos_ids_existentes.add(p.id_peca)

    sofas_agrupados = df_madeira.groupby('CÓDIGO FINAL')
    contador_sofas = 0
    contador_pecas = 0
    novas_pecas_criadas = 0

    print("5. Limpando receitas antigas e injetando as novas no Banco de Dados...")
    session.query(ReceitaSofa).delete()
    session.commit()

    # Desativa o autoflush temporariamente para o banco não tentar salvar pela metade
    with session.no_autoflush:
        for codigo_str, pecas in sofas_agrupados:
            
            nome_sofa = dicionario_nomes.get(codigo_str, f"Modelo {codigo_str} (Nome não cadastrado)")
            novo_sofa = Sofa(id_codigo=codigo_str, nome=nome_sofa, linha_producao="Geral")
            session.merge(novo_sofa) 
            contador_sofas += 1
            
            for _, peca in pecas.iterrows():
                d1_val = int(float(peca['D1']))
                d2_val = int(float(peca['D2']))
                d3_val = int(float(peca['D3'])) if not pd.isna(peca['D3']) else 25
                
                chave_busca = (d1_val, d2_val, d3_val)
                
                if chave_busca not in mapa_pecas:
                    novo_id = f"PEC-{random.randint(1000, 9999)}"
                    # Fica sorteando até achar um que NÃO esteja na lista mestra
                    while novo_id in todos_ids_existentes:
                        novo_id = f"PEC-{random.randint(1000, 9999)}"
                    
                    nova_peca_catalogo = EstoquePeca(
                        id_peca=novo_id,
                        nome=f"{d1_val}x{d2_val}", 
                        comprimento_d1=d1_val,
                        largura_d2=d2_val,
                        espessura_d3=d3_val,
                        estoque_destino="Lidiane",
                        quantidade=0
                    )
                    session.add(nova_peca_catalogo)
                    
                    # Salva no mapa e na lista mestra
                    mapa_pecas[chave_busca] = novo_id
                    todos_ids_existentes.add(novo_id)
                    novas_pecas_criadas += 1

                peca_id_correto = mapa_pecas[chave_busca]
                
                nova_receita = ReceitaSofa(
                    sofa_id=codigo_str,
                    peca_id=peca_id_correto,
                    quantidade=int(float(peca['QTD.']))
                )
                session.add(nova_receita)
                contador_pecas += 1

    session.commit()
    session.close()
    
    print("-" * 50)
    print("🚀 CARGA DE DADOS CONCLUÍDA COM SUCESSO!")
    print(f"Total de Sofás mapeados: {contador_sofas}")
    print(f"Total de Peças na Receita: {contador_pecas}")
    print(f"Peças ausentes adicionadas ao Catálogo (novos PECs): {novas_pecas_criadas}")
    print("-" * 50)

if __name__ == '__main__':
    carregar_dados()