from flask import Flask, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import sys
import os

# FORÇA a Vercel a olhar para a pasta 'api' para achar o models.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import engine, PaletePai, EstoquePeca

# A Vercel precisa EXATAMENTE desta linha no nível zero do arquivo para funcionar
app = Flask(__name__)

# ==========================================
# ROTA DE TESTE (DIAGNÓSTICO)
# ==========================================
@app.route('/api/ping', methods=['GET'])
def ping():
    return jsonify({"status": "ok", "mensagem": "A API PYTHON ESTÁ VIVA E NA NUVEM!"}), 200

# ==========================================
# ROTA 1: PALETES (ENTRADA)
# ==========================================
@app.route('/api/paletes', methods=['POST'])
def registrar_palete():
    try:
        dados = request.json
        id_palete = dados.get('id_palete', '')
        quantidade = int(dados.get('quantidade')) if dados.get('quantidade') else 0
        espessura = int(dados.get('espessura')) if dados.get('espessura') else 0
        largura = int(dados.get('largura')) if dados.get('largura') else 0
        comprimento = int(float(dados.get('comprimento')) * 1000) if dados.get('comprimento') else 0
        estoque_destino = dados.get('estoqueDestino', 'Lidiane')
        
        Session = sessionmaker(bind=engine)
        session = Session()
        
        novo_lote = PaletePai(
            id_palete=id_palete,
            comprimento_d1=comprimento,
            largura_d2=largura,
            espessura_d3=espessura,
            quantidade_tabuas=quantidade,
            estoque_destino=estoque_destino
        )
        session.add(novo_lote)
        session.commit()
        session.close()
        return jsonify({"status": "sucesso", "mensagem": "Palete registrado no pátio com sucesso!"}), 201
    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)}), 400

# ==========================================
# ROTAS 2: CATÁLOGO E ESTOQUE DE PEÇAS
# ==========================================
@app.route('/api/pecas', methods=['GET'])
def listar_pecas():
    try:
        Session = sessionmaker(bind=engine)
        session = Session()
        pecas = session.query(EstoquePeca).all()
        lista = [{"id": p.id_peca, "nome": p.nome, "d1": p.comprimento_d1, "d2": p.largura_d2, "d3": p.espessura_d3, "estoqueDestino": p.estoque_destino, "qtd": p.quantidade} for p in pecas]
        session.close()
        return jsonify(lista), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 400

@app.route('/api/pecas', methods=['POST'])
def cadastrar_peca():
    try:
        dados = request.json
        Session = sessionmaker(bind=engine)
        session = Session()
        nova_peca = EstoquePeca(
            id_peca=dados['id'], 
            nome=dados['nome'], 
            comprimento_d1=dados['d1'],
            largura_d2=dados['d2'], 
            espessura_d3=dados['d3'],
            estoque_destino=dados['estoqueDestino'], 
            quantidade=dados['qtd']
        )
        session.add(nova_peca)
        session.commit()
        session.close()
        return jsonify({"status": "sucesso"}), 201
    except Exception as e:
        return jsonify({"erro": str(e)}), 400

@app.route('/api/pecas/movimentar', methods=['POST'])
def movimentar_peca():
    try:
        dados = request.json
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # 1. Atualiza o saldo no estoque
        peca = session.query(EstoquePeca).filter_by(id_peca=dados['id']).first()
        if not peca:
            return jsonify({"erro": "Peça não encontrada"}), 404
        
        if dados['tipo'] == 'entrada':
            peca.quantidade += int(dados['quantidade'])
        else:
            if int(dados['quantidade']) > peca.quantidade:
                return jsonify({"erro": "Estoque insuficiente"}), 400
            peca.quantidade -= int(dados['quantidade'])
            
        # 2. NOVO: Salva o log de auditoria
        usuario_logado = dados.get('usuario', 'Não Registrado')
        sql_log = text("""
            INSERT INTO historico_movimentacoes (usuario, peca, tipo, quantidade, estoque_destino) 
            VALUES (:usuario, :peca, :tipo, :quantidade, :estoque_destino)
        """)
        session.execute(sql_log, {
            'usuario': usuario_logado,
            'peca': peca.nome,
            'tipo': dados['tipo'],
            'quantidade': int(dados['quantidade']),
            'estoque_destino': peca.estoque_destino
        })
        
        session.commit()
        session.close()
        return jsonify({"status": "sucesso"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 400

@app.route('/api/pecas/<id_peca>', methods=['DELETE'])
def deletar_peca(id_peca):
    try:
        Session = sessionmaker(bind=engine)
        session = Session()
        peca = session.query(EstoquePeca).filter_by(id_peca=id_peca).first()
        if peca:
            session.delete(peca)
            session.commit()
        session.close()
        return jsonify({"status": "sucesso"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 400
    
# ==========================================
# ROTAS PARA O HISTÓRICO DE ENVIOS (NUVEM)
# ==========================================
@app.route('/api/envios', methods=['GET', 'POST'])
def gerenciar_envios():
    if request.method == 'POST':
        dados = request.json
        try:
            Session = sessionmaker(bind=engine)
            session = Session()
            
            sql = text("""
                INSERT INTO historico_envios (data_envio, linha, peca, quantidade, is_extra, usuario) 
                VALUES (:data_envio, :linha, :peca, :quantidade, :is_extra, :usuario)
            """)
            session.execute(sql, {
                'data_envio': dados['data_envio'],
                'linha': dados['linha'],
                'peca': dados['peca'],
                'quantidade': dados['quantidade'],
                'is_extra': dados.get('is_extra', False),
                'usuario': dados.get('usuario', 'Não Registrado') # <-- Pegando o usuário
            })
            session.commit()
            session.close()
            return jsonify({'status': 'sucesso'}), 201
        except Exception as e:
            return jsonify({'erro': str(e)}), 500

    elif request.method == 'GET':
        try:
            Session = sessionmaker(bind=engine)
            session = Session()
            
            # Trazendo o usuário na busca
            sql = text("SELECT id, data_envio, linha, peca, quantidade, is_extra, usuario FROM historico_envios ORDER BY id DESC")
            resultados = session.execute(sql).fetchall()
            
            lista_envios = []
            for linha in resultados:
                lista_envios.append({
                    'id': linha[0],
                    'data_envio': str(linha[1]) if linha[1] else None,
                    'linha': linha[2],
                    'peca': linha[3],
                    'quantidade': linha[4],
                    'is_extra': linha[5],
                    'usuario': linha[6] # <-- Adicionando no retorno da API
                })
            
            session.close()
            return jsonify(lista_envios), 200
        except Exception as e:
            return jsonify({'erro': str(e)}), 500

@app.route('/api/envios/<int:id_envio>', methods=['DELETE'])
def deletar_envio(id_envio):
    try:
        Session = sessionmaker(bind=engine)
        session = Session()
        
        sql = text("DELETE FROM historico_envios WHERE id = :id")
        session.execute(sql, {'id': id_envio})
        session.commit()
        session.close()
        return jsonify({'status': 'sucesso'})
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/api/movimentacoes', methods=['GET'])
def listar_movimentacoes():
    try:
        Session = sessionmaker(bind=engine)
        session = Session()
        
        sql = text("SELECT id, data_movimento, usuario, peca, tipo, quantidade, estoque_destino FROM historico_movimentacoes ORDER BY data_movimento DESC")
        resultados = session.execute(sql).fetchall()
        
        lista = []
        for linha in resultados:
            lista.append({
                'id': linha[0],
                'data_movimento': str(linha[1]) if linha[1] else None,
                'usuario': linha[2],
                'peca': linha[3],
                'tipo': linha[4],
                'quantidade': linha[5],
                'estoque_destino': linha[6]
            })
            
        session.close()
        return jsonify(lista), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

# ==========================================
# ROTAS DO PCP (CATÁLOGO DE SOFÁS E RECEITAS)
# ==========================================
@app.route('/api/sofas', methods=['GET'])
def listar_sofas():
    try:
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Busca os nomes e códigos únicos dos sofás direto da tabela de receitas
        sql = text("SELECT DISTINCT codigo_interno, produto FROM receitas_sofa WHERE codigo_interno IS NOT NULL ORDER BY produto")
        resultados = session.execute(sql).fetchall()
        
        lista_sofas = [{"id": str(linha[0]), "nome": str(linha[1])} for linha in resultados]
        
        session.close()
        return jsonify(lista_sofas), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

@app.route('/api/receitas/<id_sofa>', methods=['GET'])
def obter_receita(id_sofa):
    try:
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Puxa a receita do sofá e cruza com o catálogo de peças usando o "peca_id"
        sql = text("""
            SELECT r.peca_id, r.qtd, e.nome, e.comprimento_d1, e.largura_d2, e.espessura_d3 
            FROM receitas_sofa r
            LEFT JOIN estoque_pecas e ON r.peca_id = e.id_peca
            WHERE r.codigo_interno = :id_sofa
        """)
        resultados = session.execute(sql, {'id_sofa': id_sofa}).fetchall()
        
        receita = []
        for linha in resultados:
            receita.append({
                "peca_id": linha[0],
                "qtd": linha[1],
                "nome_peca": linha[2] or "Peça não encontrada no catálogo",
                "d1": linha[3] or 0,
                "d2": linha[4] or 0,
                "d3": linha[5] or 0
            })
            
        session.close()
        return jsonify(receita), 200
    except Exception as e:
        return jsonify({'erro': str(e)}), 500

if __name__ == '__main__':
    app.run()