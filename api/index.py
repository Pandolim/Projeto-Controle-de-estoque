from flask import Flask, request, jsonify
from sqlalchemy.orm import sessionmaker
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from Backend.models import engine, PaletePai

app = Flask(__name__)

@app.route('/api/paletes', methods=['POST'])
def registrar_palete():
    try:
        dados = request.json
        id_palete = dados.get('id_palete', '')
        quantidade = int(dados.get('quantidade')) if dados.get('quantidade') else 0
        espessura = int(dados.get('espessura')) if dados.get('espessura') else 0
        largura = int(dados.get('largura')) if dados.get('largura') else 0
        comprimento_val = dados.get('comprimento')
        comprimento = int(float(comprimento_val) * 1000) if comprimento_val else 0
        
        # Captura o destino do estoque (Lidiane/Mobly)
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

if __name__ == '__main__':
    app.run()