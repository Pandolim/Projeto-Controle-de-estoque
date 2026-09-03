from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()

# ==========================================
# BLOCO 1: DICIONÁRIO ESTÁTICO (Catálogo e Engenharia)
# ==========================================
class Sofa(Base):
    __tablename__ = 'sofas'
    id_codigo = Column(String, primary_key=True) 
    nome = Column(String, nullable=False)        
    linha_producao = Column(String)              
    receita_pecas = relationship("ReceitaSofa", back_populates="sofa", cascade="all, delete-orphan")

class ReceitaSofa(Base):
    __tablename__ = 'receitas_sofa'
    id = Column(Integer, primary_key=True, autoincrement=True)
    sofa_id = Column(String, ForeignKey('sofas.id_codigo'))
    comprimento_d1 = Column(Integer, nullable=False)
    largura_d2 = Column(Integer, nullable=False)     
    espessura_d3 = Column(Integer, default=25)       
    quantidade = Column(Integer, nullable=False)     
    sofa = relationship("Sofa", back_populates="receita_pecas")

# ==========================================
# BLOCO 2: OPERAÇÃO DINÂMICA (Chão de Fábrica)
# ==========================================
class PaletePai(Base):
    __tablename__ = 'paletes_pai'
    id_palete = Column(String, primary_key=True) 
    comprimento_d1 = Column(Integer, nullable=False)
    largura_d2 = Column(Integer, nullable=False)     
    espessura_d3 = Column(Integer, default=25)
    quantidade_tabuas = Column(Integer, nullable=False)
    estoque_destino = Column(String(50), default='Lidiane') 
    status = Column(String, default='No Pátio') 
    data_entrada = Column(DateTime, default=datetime.utcnow)

# AQUI ESTÁ A CLASSE QUE ESTAVA FALTANDO!
class EstoquePeca(Base):
    __tablename__ = 'estoque_pecas'
    id_peca = Column(String, primary_key=True)
    nome = Column(String, nullable=False)
    comprimento_d1 = Column(Integer, nullable=False)
    largura_d2 = Column(Integer, nullable=False)
    espessura_d3 = Column(Integer, default=25)
    estoque_destino = Column(String(50), default='Lidiane')
    quantidade = Column(Integer, default=0)

class OrdemProducao(Base):
    __tablename__ = 'ordens_producao'
    id_op = Column(String, primary_key=True)
    sofa_id = Column(String, ForeignKey('sofas.id_codigo'))
    quantidade_sofas = Column(Integer, nullable=False)
    status = Column(String, default='Pendente no PCP') 
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_entrega = Column(DateTime, nullable=True)

class PedidoExtra(Base):
    __tablename__ = 'pedidos_extras'
    id_pedido = Column(String, primary_key=True)
    linha_solicitante = Column(String, nullable=False)
    peca_desc = Column(String, nullable=False) 
    quantidade = Column(Integer, nullable=False)
    motivo = Column(String, nullable=False)    
    status = Column(String, default='Pendente no Estoque')
    data_solicitacao = Column(DateTime, default=datetime.utcnow)

class EstoqueRetalhos(Base):
    __tablename__ = 'estoque_retalhos'
    id = Column(Integer, primary_key=True, autoincrement=True)
    bitola = Column(String, nullable=False)        
    comprimento = Column(Integer, nullable=False)  
    data_geracao = Column(DateTime, default=datetime.utcnow)

# ==========================================
# SETUP DE CONEXÃO (NUVEM - SUPABASE)
# ==========================================
import os
from sqlalchemy import create_engine

# URL construída com o Transaction Pooler (porta 6543)
DATABASE_URL = "postgresql+pg8000://postgres.wybtpfasrzthorkomlsd:Pandolim17k@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
#comentario teste