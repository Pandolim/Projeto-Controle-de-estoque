import urllib.request
import csv
import random
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from models import engine

def executar_sincronizacao():
    # O link de exportação do CSV
    url_csv_google = "https://docs.google.com/spreadsheets/d/1QgYCpG8QggCz6voO1kDv1OEfaOjzpHhxagQf39_ARTM/export?format=csv&gid=1438917275"
    
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        print("📥 Baixando dados do Google Sheets (Modo Leve)...")
        # Acessa a internet usando a biblioteca nativa do Python
        req = urllib.request.Request(url_csv_google, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req)
        
        # Lê o arquivo e decodifica os acentos corretamente
        linhas_texto = [line.decode('utf-8') for line in response.readlines()]
        leitor_csv = csv.reader(linhas_texto)
        
        # Pega a primeira linha (cabeçalho) e converte tudo para minúsculo
        cabecalho = [str(c).strip().lower() for c in next(leitor_csv)]
        
        if 'código interno' not in cabecalho or 'qtd.' not in cabecalho:
            return {"status": "erro", "detalhes": "Colunas obrigatórias não encontradas na planilha."}, 400

        print(f"🔄 Processando linhas da receita...")
        contador_linhas = 0

        # Varre o resto da planilha linha por linha
        for row in leitor_csv:
            # Associa a linha atual com os nomes do cabeçalho
            dados_linha = dict(zip(cabecalho, row))
            
            codigo_sofa = str(dados_linha.get('código interno', '')).strip()
            ins_peca = str(dados_linha.get('ins', '')).strip().upper()
            mp_raw = str(dados_linha.get('matéria prima', '')).lower()
            
            try:
                # Trata possíveis vírgulas ao invés de pontos nos números
                qtd_str = str(dados_linha.get('qtd.', '0')).replace(',', '.')
                qtd_receita = int(float(qtd_str)) if qtd_str.strip() else 0
                
                d1_str = str(dados_linha.get('d1', '0')).replace(',', '.')
                d1 = int(float(d1_str)) if d1_str.strip() else 0
                
                d2_str = str(dados_linha.get('d2', '0')).replace(',', '.')
                d2 = int(float(d2_str)) if d2_str.strip() else 0
                
                d3_str = str(dados_linha.get('d3', '0')).replace(',', '.')
                d3 = int(float(d3_str)) if d3_str.strip() else 0
            except ValueError:
                continue
            
            # Pula linhas em branco ou sem medidas válidas
            if not codigo_sofa or d1 == 0 or d2 == 0 or qtd_receita <= 0:
                continue
                
            contador_linhas += 1

            # ==========================================
            # 1. A REGRA DE OURO (O Inspetor de Destino)
            # ==========================================
            destino_estoque = "Lidiane" if "-M" in ins_peca else "Mobly"

            prefixo = "Eucalipto"
            if "mdf" in mp_raw: prefixo = "MDF"
            elif "pinus" in mp_raw: prefixo = "Pinus"
            elif "papelão" in mp_raw: prefixo = "Papelão"
            
            nome_peca_final = f"{prefixo}- {d1}x{d2}"

            # ==========================================
            # 2. O BUSCA-PEÇAS E CRIAÇÃO AUTOMÁTICA
            # ==========================================
            sql_busca = text("""
                SELECT id_peca FROM estoque_pecas 
                WHERE comprimento_d1 = :d1 AND largura_d2 = :d2 AND espessura_d3 = :d3 AND estoque_destino = :destino 
                LIMIT 1
            """)
            resultado_peca = session.execute(sql_busca, {'d1': d1, 'd2': d2, 'd3': d3, 'destino': destino_estoque}).fetchone()

            if resultado_peca:
                peca_id_banco = str(resultado_peca[0])
            else:
                # Cadastra uma peça inédita automaticamente!
                peca_id_banco = f"PEC-{random.randint(10000, 99999)}"
                sql_insert_peca = text("""
                    INSERT INTO estoque_pecas (id_peca, nome, comprimento_d1, largura_d2, espessura_d3, estoque_destino, quantidade) 
                    VALUES (:id_peca, :nome, :d1, :d2, :d3, :destino, 0)
                """)
                session.execute(sql_insert_peca, {
                    'id_peca': peca_id_banco, 'nome': nome_peca_final, 
                    'd1': d1, 'd2': d2, 'd3': d3, 'destino': destino_estoque
                })

            # ==========================================
            # 3. ATUALIZA A RECEITA DO SOFÁ
            # ==========================================
            sql_delete = text("DELETE FROM receitas_sofa WHERE sofa_id = :sofa_id AND peca_id = :peca_id")
            session.execute(sql_delete, {'sofa_id': codigo_sofa, 'peca_id': peca_id_banco})
            
            sql_insert_receita = text("""
                INSERT INTO receitas_sofa (sofa_id, peca_id, quantidade) 
                VALUES (:sofa_id, :peca_id, :quantidade)
            """)
            session.execute(sql_insert_receita, {'sofa_id': codigo_sofa, 'peca_id': peca_id_banco, 'quantidade': qtd_receita})
            
        session.commit()
        return {"status": "sucesso", "mensagem": f"{contador_linhas} linhas lidas e sincronizadas!"}, 200

    except Exception as e:
        session.rollback()
        return {"status": "erro", "detalhes": str(e)}, 500
    finally:
        session.close()