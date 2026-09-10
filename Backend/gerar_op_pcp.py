import sys
import os
import pandas as pd
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# ==========================================
# TRUQUE DE ROTEAMENTO (Para achar a pasta API)
# ==========================================
# Pega o caminho da pasta atual (Backend)
diretorio_atual = os.path.dirname(os.path.abspath(__file__))
# Volta uma pasta para trás (Projeto Controle de estoque)
diretorio_pai = os.path.dirname(diretorio_atual)
# Entra na pasta 'api'
pasta_api = os.path.join(diretorio_pai, 'api')

# Adiciona a pasta 'api' no radar do Python
if pasta_api not in sys.path:
    sys.path.append(pasta_api)

# Agora ele consegue achar o models perfeitamente!
from models import engine, Sofa, ReceitaSofa, EstoqueRetalhos
from otimizador import calcular_cortes_1d

def processar_pcp_universal(arquivo_excel, linha_padrao="Geral"):
    Session = sessionmaker(bind=engine)
    session = Session()

    print(f"Lendo arquivo PCP: {arquivo_excel}\n")
    
    df_raw = pd.read_excel(arquivo_excel, sheet_name=0, header=None)
    linha_cabecalho = 0
    for idx, row in df_raw.iterrows():
        if str(row[0]).strip().lower() in ['cod', 'cód', 'código']:
            linha_cabecalho = idx
            break
            
    df_pcp = pd.read_excel(arquivo_excel, sheet_name=0, header=linha_cabecalho)
    df_pcp.columns = [str(c).strip().lower() for c in df_pcp.columns]
    
    col_codigo = next((c for c in df_pcp.columns if 'cód' in c or 'cod' in c), None)
    col_qtd = next((c for c in df_pcp.columns if 'quant' in c or 'qtd' in c), None)
    col_linha = next((c for c in df_pcp.columns if 'linha' in c), None)
    
    if not col_codigo or not col_qtd:
        print("ERRO: O arquivo não possui as colunas obrigatórias de Código e Quantidade.")
        return

    df_pcp = df_pcp.dropna(subset=[col_codigo, col_qtd])
    df_pcp = df_pcp[~df_pcp[col_codigo].astype(str).str.lower().str.contains('total')]

    tradutor_linhas = {
        'LINECO': 'Econômica',
        'LINEST1': 'Estilo 1.0',
        'LINEST4': 'Estilo 4.0',
        'LINHIB': 'Híbrida'
    }

    if not col_linha:
        col_linha = 'linha_virtual'
        df_pcp[col_linha] = linha_padrao

    agrupamento_linhas = df_pcp.groupby(col_linha)

    for sigla_linha, dados_linha in agrupamento_linhas:
        nome_real_linha = tradutor_linhas.get(str(sigla_linha).strip().upper(), sigla_linha)
        
        necessidade_corte = {}
        total_sofas_linha = 0
        total_pecas_cortadas = 0

        for index, row in dados_linha.iterrows():
            codigo_completo = str(row[col_codigo]).strip()
            if codigo_completo.lower() == 'nan': continue
                
            try:
                qtd_sofa = int(float(row[col_qtd]))
            except ValueError:
                continue
                
            codigo_base = ".".join(codigo_completo.split('.')[:3])
            
            # Valida se o sofá existe no banco
            sofa_db = session.query(Sofa).filter_by(id_codigo=codigo_base).first()
            if not sofa_db:
                continue
                
            total_sofas_linha += qtd_sofa
            
            # ==========================================
            # AQUI ESTÁ A MÁGICA DA NOVA ESTRUTURA
            # ==========================================
            sql = text("""
                SELECT r.peca_id, r.quantidade, e.nome, e.comprimento_d1, e.largura_d2, e.espessura_d3 
                FROM receitas_sofa r
                LEFT JOIN estoque_pecas e ON r.peca_id = e.id_peca
               WHERE r.sofa_id = :id_sofa
            """)
            receitas = session.execute(sql, {'id_sofa': codigo_base}).fetchall()
            
            for linha in receitas:
                qtd_na_receita = int(linha[1] or 0)
                qtd_total_peca = qtd_na_receita * qtd_sofa
                total_pecas_cortadas += qtd_total_peca
                
                # Resgata as medidas cruzadas do banco de estoque
                comprimento_d1 = int(linha[3] or 0)
                largura_d2 = int(linha[4] or 0)
                espessura_d3 = int(linha[5] or 0)
                
                bitola = f"{largura_d2}x{espessura_d3}mm"
                
                if bitola not in necessidade_corte:
                    necessidade_corte[bitola] = {}
                if comprimento_d1 not in necessidade_corte[bitola]:
                    necessidade_corte[bitola][comprimento_d1] = 0
                    
                necessidade_corte[bitola][comprimento_d1] += qtd_total_peca

        # =========================================================
        # EXIBIÇÃO DA O.P. USANDO O BANCO DE RETALHOS (Mantido intacto)
        # =========================================================
        if total_sofas_linha > 0:
            print(f"==========================================")
            print(f" 🏭 O.P. OTIMIZADA PARA A SERRA: {str(nome_real_linha).upper()} ")
            print(f" Total de Sofás: {total_sofas_linha}")
            print(f"==========================================")
            
            for bitola, comprimentos in necessidade_corte.items():
                print(f"\n🪵 BITOLA: {bitola}")
                
                # 1. SAQUE DO BANCO: Puxa todos os retalhos desta bitola
                retalhos_bd = session.query(EstoqueRetalhos).filter_by(bitola=bitola).all()
                lista_retalhos_disponiveis = [r.comprimento for r in retalhos_bd]
                
                # Limpa o banco temporariamente
                session.query(EstoqueRetalhos).filter_by(bitola=bitola).delete()
                
                # 2. Roda a Otimização
                padroes, total_tabuas, info_retalhos, stats = calcular_cortes_1d(
                    comprimentos, 
                    retalhos_disponiveis=lista_retalhos_disponiveis,
                    tamanho_tabua_bruta=2500
                )
                
                # 3. EXIBE INSTRUÇÕES DOS RETALHOS (Se houver)
                if info_retalhos:
                    print(f"♻️  PEGAR NO ALMOXARIFADO OS SEGUINTES RETALHOS:")
                    for r in info_retalhos:
                        print(f"   ↳ Pegar pedaço de {r['tamanho']}mm | Fatiar: {r['cortes']} (Retalho: {r['sobra']}mm)")
                    print("-" * 40)
                
                # 4. EXIBE INSTRUÇÕES DAS TÁBUAS NOVAS
                if total_tabuas > 0:
                    print(f"📦 PEGAR NO PÁTIO: {total_tabuas} tábuas brutas (2.5m)")
                    contador = 1
                    for padrao, repeticoes in padroes.items():
                        espaco = sum(padrao) + ((len(padrao)-1)*3)
                        sobra = 2200 - espaco # 2200 = 2500 - 300
                        print(f"   Padrão {contador} (Repetir {repeticoes}x): Fatiar {list(padrao)} | (Retalho: {sobra}mm)")
                        contador += 1
                
                # 5. DEPÓSITO NO BANCO: Salva as novas sobras geradas
                for nova_sobra in stats['novos_retalhos']:
                    novo_registro = EstoqueRetalhos(bitola=bitola, comprimento=int(nova_sobra))
                    session.add(novo_registro)
                    
                print(f"   📉 Resumo de Desperdício: {stats['refugo_lixo_m']:.2f} metros de serragem/refugo (< 400mm)")
                print("-" * 40)
                
            print("\n")
            session.commit()

    session.close()

if __name__ == '__main__':
    # Testando com a planilha que divide as linhas (pode testar com as outras também)
    processar_pcp_universal('PCP Linhas - 04-09-26.xlsx')