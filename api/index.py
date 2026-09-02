from flask import Flask, request, jsonify
from sqlalchemy.orm import sessionmaker
import sys
import os

# Aponta para a pasta onde está o seu models.py
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from Backend.models import engine, PaletePai

app = Flask(__name__)

@app.route('/api/paletes', methods=['POST'])
def registrar_palete():
    try:
        dados = request.json
        id_palete = dados.get('id_palete')
        quantidade = int(dados.get('quantidade'))
        espessura = int(dados.get('espessura'))
        largura = int(dados.get('largura'))
        # Converte o comprimento de metros (ex: 2.5) para milímetros (2500)
        comprimento = int(float(dados.get('comprimento')) * 1000)
        
        Session = sessionmaker(bind=engine)
        session = Session()
        
        novo_lote = PaletePai(
            id_palete=id_palete,
            comprimento_d1=comprimento,
            largura_d2=largura,
            espessura_d3=espessura,
            quantidade_tabuas=quantidade
        )
        session.add(novo_lote)
        session.commit()
        session.close()
        
        return jsonify({"status": "sucesso", "mensagem": "Palete registrado no pátio!"}), 201
    
    except Exception as e:
        return jsonify({"status": "erro", "mensagem": str(e)}), 400

# Exigência da Vercel para rodar o Flask
if __name__ == '__main__':
    app.run()