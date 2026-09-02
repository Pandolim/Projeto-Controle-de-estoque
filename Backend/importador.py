import pandas as pd
import numpy as np
from sqlalchemy.orm import sessionmaker
from models import engine, Sofa, ReceitaSofa

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
    
    # Unifica a coluna de código
    df_receitas['CÓDIGO FINAL'] = df_receitas['CÓDIGO INTERNO S/ COR'].fillna(df_receitas['CÓDIGO INTERNO'])
    
    # Remove as linhas que ficaram sem nenhum código
    df_receitas = df_receitas.dropna(subset=['CÓDIGO FINAL'])
    
    # A CORREÇÃO: Força a coluna inteira a ser lida como TEXTO, ignorando as datas/números do Excel
    df_receitas['CÓDIGO FINAL'] = df_receitas['CÓDIGO FINAL'].astype(str).str.strip()
    
    # Remove o ".0" do final dos códigos se o Excel tiver lido algum número como quebrado (float)
    df_receitas['CÓDIGO FINAL'] = df_receitas['CÓDIGO FINAL'].apply(lambda x: x[:-2] if x.endswith('.0') else x)
    
    # Filtra só madeira e remove linhas com dimensões faltando
    df_madeira = df_receitas[df_receitas['MATÉRIA PRIMA'].astype(str).str.contains('Madeira', case=False, na=False)]
    df_madeira = df_madeira.dropna(subset=['D1', 'D2', 'QTD.'])

    # Agora o agrupamento vai funcionar perfeitamente
    sofas_agrupados = df_madeira.groupby('CÓDIGO FINAL')

    contador_sofas = 0
    contador_pecas = 0

    print("4. Injetando as receitas no Banco de Dados (SQLAlchemy)...")
    for codigo_str, pecas in sofas_agrupados:
        
        nome_sofa = dicionario_nomes.get(codigo_str, f"Modelo {codigo_str} (Nome não cadastrado)")
        
        novo_sofa = Sofa(
            id_codigo=codigo_str,
            nome=nome_sofa,
            linha_producao="Geral" 
        )
        session.merge(novo_sofa) 
        contador_sofas += 1
        
        for _, peca in pecas.iterrows():
            d3_val = peca['D3']
            if pd.isna(d3_val): d3_val = 25
            
            nova_peca = ReceitaSofa(
                sofa_id=codigo_str,
                comprimento_d1=int(float(peca['D1'])),
                largura_d2=int(float(peca['D2'])),
                espessura_d3=int(float(d3_val)),
                quantidade=int(float(peca['QTD.']))
            )
            session.add(nova_peca)
            contador_pecas += 1

    session.commit()
    session.close()
    
    print("-" * 50)
    print("🚀 CARGA DE DADOS CONCLUÍDA COM SUCESSO!")
    print(f"Total de Sofás mapeados: {contador_sofas}")
    print(f"Total de Peças processadas: {contador_pecas}")
    print("-" * 50)

if __name__ == '__main__':
    carregar_dados()