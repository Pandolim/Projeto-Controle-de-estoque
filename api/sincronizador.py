import urllib.request
import csv
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
        req = urllib.request.Request(url_csv_google, headers={'User-Agent': 'Mozilla/5.0'})
        response = urllib.request.urlopen(req)
        
        linhas_texto = [line.decode('utf-8') for line in response.readlines()]
        leitor_csv = csv.reader(linhas_texto)
        cabecalho = [str(c).strip().lower() for c in next(leitor_csv)]
        
        if 'código interno' not in cabecalho or 'qtd.' not in cabecalho:
            return {"status": "erro", "detalhes": "Colunas obrigatórias não encontradas na planilha."}, 400

        print("⚡ Carregando catálogo do banco para a memória...")
        todas_pecas = session.execute(text("SELECT id_peca, comprimento_d1, largura_d2, espessura_d3, estoque_destino FROM estoque_pecas")).fetchall()
        todos_sofas = session.execute(text("SELECT id_codigo FROM sofas")).fetchall()
        
        sofas_conhecidos = {str(s[0]) for s in todos_sofas}
        catalogo_memoria = {(p[1], p[2], p[3], p[4]): str(p[0]) for p in todas_pecas}
        ids_usados = {str(p[0]) for p in todas_pecas} 
        
        pecas_novas = []
        sofas_novos = [] 
        receitas_novas = []
        sofas_afetados = set()
        contador_linhas = 0

        print("🔄 Cruzando dados em lote (Lendo TODOS os materiais)...")
        for row in leitor_csv:
            dados = dict(zip(cabecalho, row))
            codigo_sofa = str(dados.get('código interno', '')).strip()
            ins_peca = str(dados.get('ins', '')).strip().upper()
            mp_raw = str(dados.get('matéria prima', '')).lower()
            
            try:
                qtd = int(float(str(dados.get('qtd.', '0')).replace(',', '.')))
                d1 = int(float(str(dados.get('d1', '0')).replace(',', '.')))
                d2 = int(float(str(dados.get('d2', '0')).replace(',', '.')))
                d3 = int(float(str(dados.get('d3', '0')).replace(',', '.')))
            except ValueError:
                continue
            
            if not codigo_sofa or d1 == 0 or d2 == 0 or qtd <= 0:
                continue
                
            contador_linhas += 1
            destino_estoque = "Lidiane" if "-M" in ins_peca else "Mobly"
            
            # Dinâmica de nomes de materiais!
            prefixo = "Eucalipto"
            if "mdf" in mp_raw: prefixo = "MDF"
            elif "pinus" in mp_raw: prefixo = "Pinus"
            elif "papelão" in mp_raw: prefixo = "Papelão"
            
            nome_peca_final = f"{prefixo}- {d1}x{d2}"

            if codigo_sofa not in sofas_conhecidos:
                sofas_conhecidos.add(codigo_sofa)
                sofas_novos.append({'id_codigo': codigo_sofa, 'nome': f"Sofá {codigo_sofa} (Importado)"})

            chave_busca = (d1, d2, d3, destino_estoque)
            
            if chave_busca in catalogo_memoria:
                peca_id = catalogo_memoria[chave_busca]
            else:
                peca_id = f"PEC-{random.randint(10000, 99999)}"
                while peca_id in ids_usados:
                    peca_id = f"PEC-{random.randint(10000, 99999)}"
                
                ids_usados.add(peca_id)
                catalogo_memoria[chave_busca] = peca_id
                pecas_novas.append({
                    'id_peca': peca_id, 'nome': nome_peca_final, 
                    'd1': d1, 'd2': d2, 'd3': d3, 'destino': destino_estoque
                })

            sofas_afetados.add(codigo_sofa)
            receitas_novas.append({'sofa_id': codigo_sofa, 'peca_id': peca_id, 'quantidade': qtd})

        print("🚀 Enviando atualizações para o banco de dados...")
        
        if sofas_novos:
            session.execute(text("""
                INSERT INTO sofas (id_codigo, nome) 
                VALUES (:id_codigo, :nome)
            """), sofas_novos)

        if pecas_novas:
            session.execute(text("""
                INSERT INTO estoque_pecas (id_peca, nome, comprimento_d1, largura_d2, espessura_d3, estoque_destino, quantidade) 
                VALUES (:id_peca, :nome, :d1, :d2, :d3, :destino, 0)
            """), pecas_novas)

        if sofas_afetados:
            sofas_formatados = ", ".join([f"'{s}'" for s in sofas_afetados])
            sql_delete_lote = f"DELETE FROM receitas_sofa WHERE sofa_id IN ({sofas_formatados})"
            session.execute(text(sql_delete_lote))
            
            session.execute(text("""
                INSERT INTO receitas_sofa (sofa_id, peca_id, quantidade) 
                VALUES (:sofa_id, :peca_id, :quantidade)
            """), receitas_novas)

        session.commit()
        return {"status": "sucesso", "mensagem": f"{contador_linhas} itens (Todos os Materiais) sincronizados. {len(sofas_novos)} novos sofás e {len(pecas_novas)} peças criadas!"}, 200

    except Exception as e:
        session.rollback()
        return {"status": "erro", "detalhes": str(e)}, 500
    finally:
        session.close()

if __name__ == "__main__":
    resultado, status = executar_sincronizacao()
    print("\n--- RESUMO DA SINCRONIZAÇÃO ---")
    print(f"Status Code: {status}")
    print(f"Retorno: {resultado}")