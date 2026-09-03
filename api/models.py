from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

# ==========================================
# BLOCO 1: DICIONÁRIO ESTÁTICO (Catálogo e Engenharia)
# ==========================================

class Sofa(Base):
    """Armazena o catálogo cruzado entre a planilha BNF e o Estoque."""
    __tablename__ = 'sofas'
    
    id_codigo = Column(String, primary_key=True) # Ex: '393.08.288' (Código s/ cor)
    nome = Column(String, nullable=False)        # Nome amigável para a tela da Serra
    linha_producao = Column(String)              # Ex: 'Stilo 1.0'
    
    # Relação 1 para N: Um sofá tem várias peças na receita
    receita_pecas = relationship("ReceitaSofa", back_populates="sofa", cascade="all, delete-orphan")

class ReceitaSofa(Base):
    """Armazena a explosão de materiais (BOM). Cada linha aqui é uma peça do sofá."""
    __tablename__ = 'receitas_sofa'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    sofa_id = Column(String, ForeignKey('sofas.id_codigo'))
    
    comprimento_d1 = Column(Integer, nullable=False) # em mm
    largura_d2 = Column(Integer, nullable=False)     # em mm
    espessura_d3 = Column(Integer, default=25)       # Cravado em 25mm
    quantidade = Column(Integer, nullable=False)     # Qtd desta peça para 1 sofá
    
    sofa = relationship("Sofa", back_populates="receita_pecas")

# ==========================================
# BLOCO 2: OPERAÇÃO DINÂMICA (Chão de Fábrica)
# ==========================================

class PaletePai(Base):
    """Estoque de matéria-prima bruta aguardando corte ou em uso."""
    __tablename__ = 'paletes_pai'
    
    id_palete = Column(String, primary_key=True) # Lida com o bip da etiqueta (Ex: PAI-045)
    comprimento_d1 = Column(Integer, nullable=False) # 2300 ou 3000
    largura_d2 = Column(Integer, nullable=False)     # 50, 70, 100, etc.
    espessura_d3 = Column(Integer, default=25)
    quantidade_tabuas = Column(Integer, nullable=False)
    
    # NOVA COLUNA: Define se pertence à Lidiane ou Mobly
    estoque_destino = Column(String(50), default='Lidiane') 
    
    status = Column(String, default='No Pátio') # 'No Pátio', 'Na Serra', 'Finalizado'
    data_entrada = Column(DateTime, default=datetime.utcnow)

class OrdemProducao(Base):
    """As OPs geradas pelo PCP para o dia."""
    __tablename__ = 'ordens_producao'
    
    id_op = Column(String, primary_key=True) # Ex: OP-20260902-01
    sofa_id = Column(String, ForeignKey('sofas.id_codigo'))
    quantidade_sofas = Column(Integer, nullable=False)
    
    status = Column(String, default='Pendente no PCP') 
    # Status possíveis: 'Pendente no PCP', 'Na Serra', 'Entregue na Linha'
    
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_entrega = Column(DateTime, nullable=True) # O timestamp do "Aperto de Mão Digital"

class PedidoExtra(Base):
    """Fluxo de urgência: Produção -> Estoque -> Serra."""
    __tablename__ = 'pedidos_extras'
    
    id_pedido = Column(String, primary_key=True)
    linha_solicitante = Column(String, nullable=False)
    peca_desc = Column(String, nullable=False) # Dimensões ou nome da peça
    quantidade = Column(Integer, nullable=False)
    motivo = Column(String, nullable=False)    # A trava da justificativa
    
    status = Column(String, default='Pendente no Estoque')
    # Status: 'Pendente no Estoque', 'Atendido pelo Estoque', 'Enviado para Serra', 'Entregue'
    
    data_solicitacao = Column(DateTime, default=datetime.utcnow)

class EstoqueRetalhos(Base):
    """Armazena as sobras limpas e úteis das operações de corte anteriores."""
    __tablename__ = 'estoque_retalhos'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    bitola = Column(String, nullable=False)        # Ex: '80x25mm'
    comprimento = Column(Integer, nullable=False)  # Ex: 1831 (em mm)
    data_geracao = Column(DateTime, default=datetime.utcnow)

# ==========================================
# SETUP DE CONEXÃO (NUVEM - SUPABASE)
# ==========================================
import os
from sqlalchemy import create_engine

# URL construída com o Transaction Pooler (porta 6543) e o seu usuário correto
DATABASE_URL = "postgresql://postgres.wybtpfasrzthorkomlsd:Pandolim17k@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Cria todas as tabelas na nuvem (incluindo EstoqueRetalhos)
Base.metadata.create_all(engine)
print("✅ Tabelas criadas com sucesso no Supabase usando rede IPv4!")