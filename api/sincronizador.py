import pandas as pd
import random
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from models import engine

def executar_sincronizacao():
    url_csv_google = "https://docs.google.com/spreadsheets/d/1QgYCpG8QggCz6voO1kDv1OEfaOjzpHhxagQf39_ARTM/export?format=csv&gid=1438917275"
    
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        print("📥 Baixando dados do Google Sheets...")
        df = pd.read_csv(url_csv_google).fillna('')
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        # Mapeamento das colunas da sua planilha
        col_codigo = 'código interno'
        col_ins = 'ins'
        col_qtd = 'qtd.'
        col_d1 = 'd1'
        col_d2 = 'd2'
        col_d3 = 'd3'
        col_mp = 'matéria prima'

        if col_codigo not in df.columns or col_qtd not in df.columns:
            return {"status": "erro", "detalhes": "Colunas obrigatórias não encontradas na planilha."}, 400

        print(f"🔄 Processando {len(df)} linhas da receita...")

        for index, row in df.iterrows():
            codigo_sofa = str(row.get(col_codigo, '')).strip()
            ins_peca = str(row.get(col_ins, '')).strip().upper()
            mp_raw = str(row.get(col_mp, '')).lower()
            
            try:
                qtd_receita = int(float(row.get(col_qtd, 0)))
                d1 = int(float(row.get(col_d1, 0)))
                d2 = int(float(row.get(col_d2, 0)))
                
                # Se não houver espessura, assume 0
                val_d3 = row.get(col_d3, 0)
                d3 = int(float(val_d3)) if str(val_d3).strip() != '' else 0
            except ValueError:
                continue
            
            # Pula linhas em branco ou sem medidas válidas
            if not codigo_sofa or d1 == 0 or d2 == 0 or qtd_receita <= 0:
                continue

            # ==========================================
            # 1. A REGRA DE OURO (O Inspetor de Destino)
            # ==========================================
            destino_estoque = "Lidiane" if "-M" in ins_peca else "Mobly"

            # Formata o nome do material (Antecipando o futuro!)
            prefixo = "Eucalipto"
            if "mdf" in mp_raw: prefixo = "MDF"
            elif "pinus" in mp_raw: prefixo = "Pinus"
            elif "papelão" in mp_raw: prefixo = "Papelão"
            
            nome_peca_final = f"{prefixo}- {d1}x{d2}"

            # ==========================================
            # 2. O BUSCA-PEÇAS (Verifica pelo d1, d2, d3 e Destino)
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
                # Se não achou, cadastra uma peça inédita automaticamente!
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
        print("✅ Sincronização concluída com sucesso!")
        return {"status": "sucesso", "mensagem": "Planilha sincronizada e receitas atualizadas!"}, 200

    except Exception as e:
        session.rollback()
        print(f"❌ Erro na sincronização: {str(e)}")
        return {"status": "erro", "detalhes": str(e)}, 500
    finally:
        session.close()