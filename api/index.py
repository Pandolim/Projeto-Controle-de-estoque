from flask import Flask, request, jsonify
from sqlalchemy.orm import sessionmaker
import sys
import os

# FORÇA a Vercel a olhar para a pasta 'api' (onde este arquivo está) para achar o models.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import engine, PaletePai, EstoquePeca

app = Flask(__name__)

# ... (MANTENHA TODO O RESTO DO CÓDIGO INTACTO ABAIXO DISSO) ...

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
        peca = session.query(EstoquePeca).filter_by(id_peca=dados['id']).first()
        if not peca:
            return jsonify({"erro": "Peça não encontrada"}), 404
        
        if dados['tipo'] == 'entrada':
            peca.quantidade += int(dados['quantidade'])
        else:
            if int(dados['quantidade']) > peca.quantidade:
                return jsonify({"erro": "Estoque insuficiente"}), 400
            peca.quantidade -= int(dados['quantidade'])
        
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
# ROTA DE TESTE (DIAGNÓSTICO)
# ==========================================
@app.route('/api/ping', methods=['GET'])
def ping():
    return jsonify({"status": "ok", "mensagem": "A API PYTHON ESTÁ VIVA E NA NUVEM!"}), 200

if __name__ == '__main__':
    app.run()