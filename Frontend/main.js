// ==========================================
// LÓGICA DE LOGIN
// ==========================================
const formLogin = document.getElementById('formLogin');

// O IF precisa envolver tudo para proteger o código nas outras telas
if (formLogin) {
    formLogin.addEventListener('submit', function(event) {
        event.preventDefault();

        // Agora buscando pelos IDs 'usuario' e 'senha'
        const usuario = document.getElementById('usuario').value.trim().toLowerCase();
        const senha = document.getElementById('senha').value;

        if (usuario === 'kennedy' && senha === '123') {
            // Acesso total - Direciona para o Hub
            window.location.href = 'admin.html';
        } else if (usuario === 'pcp' && senha === '123') {
            // Acesso restrito da equipe de planejamento
            window.location.href = 'pcp.html';
        } else if (usuario === 'serra' && senha === '123') {
            // Acesso restrito do operador da máquina
            window.location.href = 'serra.html';
        } else if (usuario === 'almoxarifado' && senha === '123') {
            window.location.href = 'almoxarifado.html';
        } else if (usuario === 'producao' && senha === '123') {
            // NOVO: Acesso da linha de produção para pedir peças extras
            window.location.href = 'producao.html';
        } else {
            alert('Usuário incorreto! Teste com: kennedy, pcp, serra, almoxarifado ou producao (senha: 123).');
        }
    });
}

// ==========================================
// LÓGICA DO PAINEL DA SERRA (Por Palete)
// ==========================================
const formEntrada = document.getElementById('formEntrada');
const formConsumo = document.getElementById('formConsumo');
const tabelaPaletes = document.getElementById('tabelaPaletes');

// Simulação de um Banco de Dados no frontend para testar a lógica
let estoquePaletes = [
    { id: 'PAL-001', espessura: 25, largura: 150, comprimento: 3.0, pecas: 800 }
];

if (formEntrada && formConsumo) {
    
    // Atualiza a tabela assim que a página carrega
    renderizarTabela();

    // 1. Lógica para Registrar Novo Palete
    formEntrada.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const novoPalete = {
            id: document.getElementById('entID').value.trim().toUpperCase(),
            pecas: parseInt(document.getElementById('entQtd').value),
            espessura: document.getElementById('entEsp').value,
            largura: document.getElementById('entLar').value,
            comprimento: document.getElementById('entCom').value
        };
        
        // Verifica se o ID já existe
        const existe = estoquePaletes.find(p => p.id === novoPalete.id);
        if (existe) {
            alert("Este ID de Palete já está cadastrado!");
            return;
        }

        estoquePaletes.push(novoPalete);
        renderizarTabela();
        formEntrada.reset();
    });

    // 2. Lógica para Consumir Peças
    formConsumo.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const idBusca = document.getElementById('consID').value.trim().toUpperCase();
        const qtdRetirada = parseInt(document.getElementById('consQtd').value);
        
        // Procura o palete no nosso array
        let paleteEncontrado = estoquePaletes.find(p => p.id === idBusca);
        
        if (!paleteEncontrado) {
            alert("Palete não encontrado no estoque!");
            return;
        }
        
        if (qtdRetirada > paleteEncontrado.pecas) {
            alert(`Quantidade inválida! O palete ${idBusca} tem apenas ${paleteEncontrado.pecas} peças.`);
            return;
        }

        // Subtrai as peças
        paleteEncontrado.pecas -= qtdRetirada;
        
        alert(`Sucesso! ${qtdRetirada} peças retiradas do palete ${idBusca}.`);
        renderizarTabela();
        formConsumo.reset();
    });
}

// Função para desenhar a tabela na tela com base no nosso array
function renderizarTabela() {
    if (!tabelaPaletes) return;
    tabelaPaletes.innerHTML = ''; // Limpa a tabela antes de desenhar
    
    estoquePaletes.forEach(palete => {
        const tr = document.createElement('tr');
        
        // Se as peças chegarem a zero, o status muda e a linha fica cinza
        const status = palete.pecas === 0 
            ? '<span style="color: red; font-weight: bold;">Finalizado</span>' 
            : '<span style="color: green; font-weight: bold;">Em Uso</span>';
            
        if(palete.pecas === 0) tr.style.opacity = '0.5';

        tr.innerHTML = `
            <td><strong>${palete.id}</strong></td>
            <td>${palete.espessura}mm x ${palete.largura}mm x ${palete.comprimento}m</td>
            <td><strong style="font-size: 18px;">${palete.pecas}</strong></td>
            <td>${status}</td>
        `;
        tabelaPaletes.appendChild(tr);
    });
}

// ==========================================
// NOVO: LÓGICA DE OPs NA SERRA
// ==========================================
const tabelaOpsSerra = document.getElementById('tabelaOpsSerra');

if (tabelaOpsSerra) {
    // Puxa as OPs do localStorage
    let opsNaSerra = JSON.parse(localStorage.getItem('ops_salvas')) || [];
    renderizarOpsSerra();

    function renderizarOpsSerra() {
        tabelaOpsSerra.innerHTML = '';
        
        opsNaSerra.forEach((op, index) => {
            const tr = document.createElement('tr');
            
            // Cores dinâmicas para o status
            let corStatus = '#e74c3c'; // Vermelho (Pendente)
            if (op.status === 'Cortado (Aguardando Envio)') corStatus = '#f39c12'; // Laranja
            if (op.status === 'Enviado para Linha') corStatus = '#2ecc71'; // Verde

            // Botões dinâmicos dependendo do status
            let botoesAcao = '';
            if (op.status === 'Pendente na Serra') {
                botoesAcao = `<button class="btn-primary" style="padding: 6px 12px; margin: 0;" onclick="atualizarStatusOP(${index}, 'Cortado (Aguardando Envio)')">Concluir Corte</button>`;
            } else if (op.status === 'Cortado (Aguardando Envio)') {
                botoesAcao = `<button class="btn-primary" style="background-color: #3498db; padding: 6px 12px; margin: 0;" onclick="atualizarStatusOP(${index}, 'Enviado para Linha')">Enviar p/ ${op.linha}</button>`;
            } else {
                botoesAcao = `<span style="color: #7f8c8d;">Finalizado</span>`;
                tr.style.opacity = '0.6';
            }

            tr.innerHTML = `
                <td><strong>${op.numero}</strong></td>
                <td><span style="background: #ecf0f1; padding: 4px 8px; border-radius: 4px;">${op.linha}</span></td>
                <td>${op.produto}</td>
                <td><strong style="font-size: 16px;">${op.pecas}</strong></td>
                <td style="color: ${corStatus}; font-weight: bold;">${op.status}</td>
                <td>${botoesAcao}</td>
            `;
            tabelaOpsSerra.appendChild(tr);
        });
    }

    // Função global para clicar nos botões da tabela
    window.atualizarStatusOP = function(index, novoStatus) {
        opsNaSerra[index].status = novoStatus;
        localStorage.setItem('ops_salvas', JSON.stringify(opsNaSerra));
        renderizarOpsSerra();
    };
}

// ==========================================
// LÓGICA DO PAINEL PCP (Ordens de Produção)
// ==========================================
const formOP = document.getElementById('formOP');
const tabsLinhas = document.getElementById('tabsLinhas');
const opProduto = document.getElementById('opProduto');
const opQtd = document.getElementById('opQtd');
const linhaSelecionadaTexto = document.getElementById('linhaSelecionadaTexto');

const linhasProducao = ["Stilo 1.0", "Stilo 2.0", "Stilo 3.0", "Economica", "Hibrida", "Desenvolvimento", "BUX"];

const catalogoProdutos = {
    "Economica": [
        { id: "31.08.37.30", nome: "Amsterdã 1,80m (Suede Cinza)", pecasPorSofa: 42, receita: null },
        { id: "31.08.37.33", nome: "Amsterdã 1,80m (Linho Bege)", pecasPorSofa: 42, receita: null }
    ],
    "Stilo 1.0": [
        { id: "15.99.01.00", nome: "Beegees 2,20m", pecasPorSofa: 65, receita: null },
        { 
            id: "302.139.488.", 
            nome: "SOLOMONS SOFÁ-CAMA 4L 214cm BIPARTIDO", 
            pecasPorSofa: 130,
            receita: [
                { qtd: 4, d1: 600, d2: 70 }, { qtd: 4, d1: 1010, d2: 70 },
                { qtd: 4, d1: 970, d2: 50 }, { qtd: 4, d1: 590, d2: 70 },
                { qtd: 4, d1: 550, d2: 70 }, { qtd: 2, d1: 1000, d2: 40 },
                { qtd: 2, d1: 1020, d2: 40 }, { qtd: 2, d1: 975, d2: 50 },
                { qtd: 2, d1: 195, d2: 50 }, { qtd: 2, d1: 175, d2: 50 },
                { qtd: 2, d1: 980, d2: 30 }, { qtd: 2, d1: 420, d2: 50 },
                { qtd: 4, d1: 590, d2: 50 }, { qtd: 2, d1: 1050, d2: 50 },
                { qtd: 2, d1: 1020, d2: 70 }, { qtd: 4, d1: 600, d2: 50 },
                { qtd: 4, d1: 150, d2: 50 }, { qtd: 2, d1: 610, d2: 50 },
                { qtd: 2, d1: 930, d2: 50 }, { qtd: 8, d1: 880, d2: 90 },
                { qtd: 14, d1: 880, d2: 70 }, { qtd: 4, d1: 450, d2: 90 },
                { qtd: 4, d1: 450, d2: 30 }, { qtd: 4, d1: 280, d2: 30 },
                { qtd: 4, d1: 590, d2: 30 }, { qtd: 4, d1: 760, d2: 30 },
                { qtd: 4, d1: 760, d2: 90 }, { qtd: 8, d1: 170, d2: 70 },
                { qtd: 4, d1: 250, d2: 50 }, { qtd: 4, d1: 300, d2: 40 },
                { qtd: 4, d1: 980, d2: 40 }, { qtd: 4, d1: 380, d2: 30 },
                { qtd: 4, d1: 150, d2: 40 }, { qtd: 2, d1: 980, d2: 40 }
            ]
        }
    ],
    "Hibrida": [
        { id: "42.11.22.99", nome: "Athena Retrátil", pecasPorSofa: 88, receita: null }
    ]
};
let linhaAtual = "";
// NOVO: Busca do localStorage ou inicia vazio
let listaOPs = JSON.parse(localStorage.getItem('ops_salvas')) || []; 

if (formOP && tabsLinhas) {
    // Renderiza ao carregar a página
    renderizarTabelaOPs();

    linhasProducao.forEach(linha => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.textContent = linha;
        
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selecionarLinha(linha);
        });
        
        tabsLinhas.appendChild(btn);
    });

    function selecionarLinha(linha) {
        linhaAtual = linha;
        linhaSelecionadaTexto.textContent = linha;
        
        opProduto.disabled = false;
        opQtd.disabled = false;
        document.getElementById('opData').disabled = false;
        document.getElementById('btnGerarOP').disabled = false;
        
        opProduto.innerHTML = '<option value="">Selecione um modelo...</option>';
        const produtosDaLinha = catalogoProdutos[linha] || [];
        
        if (produtosDaLinha.length === 0) {
            opProduto.innerHTML = '<option value="">Nenhum produto cadastrado nesta linha</option>';
            opProduto.disabled = true;
            return;
        }

        produtosDaLinha.forEach(prod => {
            const opt = document.createElement('option');
            opt.value = prod.id;
            opt.dataset.pecas = prod.pecasPorSofa;
            opt.textContent = `${prod.id} - ${prod.nome}`;
            opProduto.appendChild(opt);
        });
    }

    opQtd.addEventListener('input', calcularPreview);
    opProduto.addEventListener('change', calcularPreview);

    function calcularPreview() {
        const qtdSofas = parseInt(opQtd.value) || 0;
        const select = opProduto.options[opProduto.selectedIndex];
        
        if (qtdSofas > 0 && select && select.value !== "") {
            // Busca os dados completos do produto no catálogo
            const linhaSelecionada = catalogoProdutos[linhaAtual];
            const produtoCompleto = linhaSelecionada.find(p => p.id === select.value);
            
            const pecasPorSofa = produtoCompleto.pecasPorSofa;
            const total = pecasPorSofa * qtdSofas;
            
            document.getElementById('previewBOM').classList.replace('resultado-oculto', 'resultado-visivel');
            
            // Se o sofá tiver a receita detalhada (como o Solomons)
            if (produtoCompleto.receita) {
                // Cria uma lista rolável para não quebrar a tela com 34 linhas
                let htmlReceita = `<ul style="max-height: 200px; overflow-y: auto; padding-left: 20px; font-size: 14px; color: #34495e;">`;
                
                produtoCompleto.receita.forEach(item => {
                    const qtdTotal = item.qtd * qtdSofas;
                    htmlReceita += `<li style="margin-bottom: 4px;"><strong>${qtdTotal}x</strong> - Peça ${item.d1}mm x ${item.d2}mm</li>`;
                });
                
                htmlReceita += `</ul>`;
                document.getElementById('listaPecasPreview').innerHTML = htmlReceita;
            
            } else {
                // Se não tiver receita, mostra a simulação genérica
                document.getElementById('listaPecasPreview').innerHTML = `
                    <li><strong>Caixas:</strong> ${(total * 0.4).toFixed(0)} peças</li>
                    <li><strong>Encostos:</strong> ${(total * 0.3).toFixed(0)} peças</li>
                    <li><strong>Assentos:</strong> ${(total * 0.3).toFixed(0)} peças</li>
                `;
            }
            
            document.getElementById('totalPecasPreview').textContent = total;
        } else {
            document.getElementById('previewBOM').classList.replace('resultado-visivel', 'resultado-oculto');
        }
    }
    
    // BLOCO RESTAURADO: A lógica de envio do formulário do PCP
    formOP.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const select = opProduto.options[opProduto.selectedIndex];
        const qtdSofas = parseInt(opQtd.value);
        const totalPecas = parseInt(select.dataset.pecas) * qtdSofas;
        
        const novaOP = {
            numero: `OP-${Math.floor(Math.random() * 10000)}`,
            linha: linhaAtual,
            produto: select.textContent,
            quantidade: qtdSofas,
            pecas: totalPecas,
            status: 'Pendente na Serra'
        };
        
        listaOPs.unshift(novaOP);
        
        // NOVO: Salva no localStorage para a Serra enxergar
        localStorage.setItem('ops_salvas', JSON.stringify(listaOPs));
        
        renderizarTabelaOPs();
        alert(`Sucesso! ${novaOP.numero} enviada para a Serra.`);
        formOP.reset();
        document.getElementById('previewBOM').classList.replace('resultado-visivel', 'resultado-oculto');
    });

    function renderizarTabelaOPs() {
        const tbody = document.getElementById('tabelaOPs');
        tbody.innerHTML = '';
        
        listaOPs.forEach(op => {
            const corStatus = op.status === 'Pendente na Serra' ? '#e74c3c' : (op.status === 'Enviado para Linha' ? '#2ecc71' : '#f39c12');
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${op.numero}</strong></td>
                <td><span class="tab-btn active" style="padding: 4px 8px; font-size: 12px;">${op.linha}</span></td>
                <td>${op.produto}</td>
                <td>${op.quantidade}</td>
                <td>${op.pecas}</td>
                <td style="color: ${corStatus}; font-weight: bold;">${op.status}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// ==========================================
// LÓGICA DO PAINEL ALMOXARIFADO
// ==========================================
const tabelaPais = document.getElementById('tabelaPais');
const tabelaFilhos = document.getElementById('tabelaFilhos');

// Dados simulados para o Almoxarifado
let estoquePais = [
    { id: 'PAL-001', material: 'Madeira Inteira - Eucalipto (INS-01086/50mm)', dimensoes: '1760mm x 50mm x 25mm', qtd: 800 },
    { id: 'PAL-002', material: 'MDF (INS-01002)', dimensoes: '1480mm x 50mm x 15mm', qtd: 500 }
];

let estoqueFilhos = [
    { id: 'COR-001', origem: 'PAL-001', peca: 'Caixa (Amsterdã 1,80)', qtd: 200, destino: 'Não definido' },
    { id: 'COR-002', origem: 'PAL-002', peca: 'Encosto (Amsterdã 1,80)', qtd: 150, destino: 'Não definido' }
];

// Só executa se estivermos na página do Almoxarifado
if (tabelaPais && tabelaFilhos) {
    
    function renderizarAlmoxarifado() {
        // Renderiza Pais
        tabelaPais.innerHTML = '';
        estoquePais.forEach((pai, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${pai.id}</strong></td>
                <td>${pai.material}</td>
                <td>${pai.dimensoes}</td>
                <td><strong style="font-size: 16px;">${pai.qtd}</strong></td>
                <td>
                    <button class="btn-edit" onclick="editarQtdPai(${index})">Editar Qtd</button>
                </td>
            `;
            tabelaPais.appendChild(tr);
        });

        // Renderiza Filhos
        tabelaFilhos.innerHTML = '';
        estoqueFilhos.forEach((filho, index) => {
            const tr = document.createElement('tr');
            
            // Estiliza o destino para chamar atenção se não estiver definido
            const corDestino = filho.destino === 'Não definido' ? 'color: #e74c3c; font-weight: bold;' : 'color: #2ecc71; font-weight: bold;';

            tr.innerHTML = `
                <td><strong>${filho.id}</strong></td>
                <td>${filho.origem}</td>
                <td>${filho.peca}</td>
                <td><strong style="font-size: 16px;">${filho.qtd}</strong></td>
                <td style="${corDestino}">${filho.destino}</td>
                <td>
                    <button class="btn-edit" style="background-color: #3498db; margin-right: 5px;" onclick="editarQtdFilho(${index})">Editar Qtd</button>
                    <button class="btn-primary" style="padding: 6px 12px; margin-top: 0;" onclick="destinarLinha(${index})">Enviar p/ Linha</button>
                </td>
            `;
            tabelaFilhos.appendChild(tr);
        });
    }

    // Funções globais no window para os botões inline do HTML funcionarem
    window.editarQtdPai = function(index) {
        const novaQtd = prompt(`Editando quantidade do lote ${estoquePais[index].id}.\nNova quantidade:`, estoquePais[index].qtd);
        if (novaQtd !== null && !isNaN(novaQtd) && novaQtd !== "") {
            estoquePais[index].qtd = parseInt(novaQtd);
            renderizarAlmoxarifado();
        }
    };

    window.editarQtdFilho = function(index) {
        const novaQtd = prompt(`Editando quantidade das peças cortadas ${estoqueFilhos[index].id}.\nNova quantidade (desconte refugo se houver):`, estoqueFilhos[index].qtd);
        if (novaQtd !== null && !isNaN(novaQtd) && novaQtd !== "") {
            estoqueFilhos[index].qtd = parseInt(novaQtd);
            renderizarAlmoxarifado();
        }
    };

    window.destinarLinha = function(index) {
        const linha = prompt(`Destinar o palete ${estoqueFilhos[index].id} (${estoqueFilhos[index].peca}) para qual Linha de Produção?\n(Ex: Economica, Stilo 1.0, etc)`);
        if (linha !== null && linha.trim() !== "") {
            estoqueFilhos[index].destino = linha.trim();
            renderizarAlmoxarifado();
        }
    };

    // Chamada inicial
    renderizarAlmoxarifado();
}

// ==========================================
// LÓGICA DO MÓDULO DE ESTOQUE E PEÇAS
// ==========================================
const formCadPeca = document.getElementById('formCadPeca');
const formMovEstoque = document.getElementById('formMovEstoque');
const tabelaEstoqueGeral = document.getElementById('tabelaEstoqueGeral');
const selectPecaEstoque = document.getElementById('selectPecaEstoque');

// Banco simulado no localStorage (ou inicia com alguns exemplos)
let catalogoPecas = JSON.parse(localStorage.getItem('catalogo_pecas_est')) || [
    { id: 'PEC-001', nome: 'Caixa Padrão', d1: 1760, d2: 50, d3: 25, qtd: 200 },
    { id: 'PEC-002', nome: 'Encosto Comum', d1: 1480, d2: 90, d3: 25, qtd: 150 }
];

if (tabelaEstoqueGeral || formCadPeca) {
    
    renderizarEstoque();

    // 1. Cadastrar Nova Peça com Dimensões
    if (formCadPeca) {
        formCadPeca.addEventListener('submit', function(event) {
            event.preventDefault();

            const novaPeca = {
                id: `PEC-${Math.floor(Math.random() * 9000) + 1000}`,
                nome: document.getElementById('pecaNome').value.trim(),
                d1: parseInt(document.getElementById('pecaComprimento').value),
                d2: parseInt(document.getElementById('pecaLargura').value),
                d3: parseInt(document.getElementById('pecaEspessura').value),
                qtd: 0 // Inicia zerado
            };

            catalogoPecas.push(novaPeca);
            localStorage.setItem('catalogo_pecas_est', JSON.stringify(catalogoPecas));
            
            renderizarEstoque();
            formCadPeca.reset();
            alert(`Sucesso! Peça ${novaPeca.nome} cadastrada.`);
        });
    }

    // 2. Movimentar Estoque (Adicionar ou Remover)
    if (formMovEstoque) {
        formMovEstoque.addEventListener('submit', function(event) {
            event.preventDefault();

            const idPeca = selectPecaEstoque.value;
            const tipo = document.getElementById('movTipo').value;
            const quantidade = parseInt(document.getElementById('movQtd').value);

            const peca = catalogoPecas.find(p => p.id === idPeca);
            if (!peca) return;

            if (tipo === 'entrada') {
                peca.qtd += quantidade;
            } else {
                if (quantidade > peca.qtd) {
                    alert(`Estoque insuficiente! Há apenas ${peca.qtd} unidades disponíveis.`);
                    return;
                }
                peca.qtd -= quantidade;
            }

            localStorage.setItem('catalogo_pecas_est', JSON.stringify(catalogoPecas));
            renderizarEstoque();
            formMovEstoque.reset();
            alert(`Estoque atualizado com sucesso!`);
        });
    }
}

// Função para desenhar a tabela e atualizar o select
function renderizarEstoque() {
    if (!tabelaEstoqueGeral) return;

    tabelaEstoqueGeral.innerHTML = '';
    selectPecaEstoque.innerHTML = '<option value="">Selecione uma peça...</option>';

    catalogoPecas.forEach((peca, index) => {
        // Preenche a tabela
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${peca.id}</strong></td>
            <td>${peca.nome}</td>
            <td>${peca.d1}mm x ${peca.d2}mm x ${peca.d3}mm</td>
            <td><strong style="font-size: 16px; color: ${peca.qtd > 0 ? '#2ecc71' : '#e74c3c'};">${peca.qtd}</strong></td>
            <td>
                <button class="btn-edit" onclick="removerPecaCatalogo(${index})" style="background-color: #e74c3c;">Excluir</button>
            </td>
        `;
        tabelaEstoqueGeral.appendChild(tr);

        // Preenche o select da movimentação
        const opt = document.createElement('option');
        opt.value = peca.id;
        opt.textContent = `${peca.nome} (${peca.d1}x${peca.d2}x${peca.d3}mm) - Saldo: ${peca.qtd}`;
        selectPecaEstoque.appendChild(opt);
    });
}

// Função global para excluir peça do catálogo
window.removerPecaCatalogo = function(index) {
    if (confirm(`Deseja realmente apagar a peça ${catalogoPecas[index].nome}?`)) {
        catalogoPecas.splice(index, 1);
        localStorage.setItem('catalogo_pecas_est', JSON.stringify(catalogoPecas));
        renderizarEstoque();
    }
};

// ==========================================
// LÓGICA DE PEDIDOS EXTRAS (Produção -> Estoque -> Serra)
// ==========================================
const formPedidoExtra = document.getElementById('formPedidoExtra');
const tabelaPedidosExtras = document.getElementById('tabelaPedidosExtras'); // Tela da Serra
const tabelaTriagemEstoque = document.getElementById('tabelaTriagemEstoque'); // Tela do Estoque

let listaPedidosExtras = JSON.parse(localStorage.getItem('pedidos_extras_salvos')) || [];

// 1. Envio do Pedido (Tela da Produção -> Vai para o Estoque)
if (formPedidoExtra) {
    formPedidoExtra.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const motivo = document.getElementById('extraMotivo').value.trim();
        if (motivo.length < 10) {
            alert('A justificativa está muito curta. Por favor, detalhe melhor.');
            return;
        }
        
        const novoPedido = {
            id: `EXT-${Math.floor(Math.random() * 9000) + 1000}`,
            peca: document.getElementById('extraPeca').value.trim(),
            qtd: parseInt(document.getElementById('extraQtd').value),
            motivo: motivo,
            status: 'Pendente no Estoque' // Cai na mão do estoque primeiro
        };
        
        listaPedidosExtras.unshift(novoPedido);
        localStorage.setItem('pedidos_extras_salvos', JSON.stringify(listaPedidosExtras));
        
        alert(`Pedido ${novoPedido.id} enviado para avaliação do Estoque!`);
        formPedidoExtra.reset();
    });
}

// 2. Tela do Estoque (Triagem)
if (tabelaTriagemEstoque) {
    renderizarTriagemEstoque();

    function renderizarTriagemEstoque() {
        tabelaTriagemEstoque.innerHTML = '';
        
        listaPedidosExtras.forEach((pedido, index) => {
            const tr = document.createElement('tr');
            
            let botoesAcao = '';
            if (pedido.status === 'Pendente no Estoque') {
                botoesAcao = `
                    <button class="btn-primary" style="background-color: #2ecc71; padding: 6px; margin: 2px; font-size: 12px;" onclick="atualizarPedidoExtra(${index}, 'Atendido pelo Estoque')">Fornecer do Estoque</button>
                    <button class="btn-primary" style="background-color: #e74c3c; padding: 6px; margin: 2px; font-size: 12px;" onclick="atualizarPedidoExtra(${index}, 'Enviado para Serra')">Solicitar à Serra</button>
                `;
            } else if (pedido.status === 'Cortado pela Serra') {
                botoesAcao = `<button class="btn-primary" style="background-color: #3498db; padding: 6px;" onclick="atualizarPedidoExtra(${index}, 'Repassado à Produção')">Repassar à Produção</button>`;
            } else {
                botoesAcao = `<span style="color: #7f8c8d;">Finalizado</span>`;
                tr.style.opacity = '0.6';
            }

            tr.innerHTML = `
                <td><strong>${pedido.id}</strong></td>
                <td>${pedido.peca}</td>
                <td><strong style="color: #e74c3c;">${pedido.qtd}</strong></td>
                <td style="font-size: 12px; max-width: 200px;"><em>"${pedido.motivo}"</em></td>
                <td style="font-weight: bold;">${pedido.status}</td>
                <td>${botoesAcao}</td>
            `;
            tabelaTriagemEstoque.appendChild(tr);
        });
    }

    window.atualizarPedidoExtra = function(index, novoStatus) {
        listaPedidosExtras[index].status = novoStatus;
        localStorage.setItem('pedidos_extras_salvos', JSON.stringify(listaPedidosExtras));
        renderizarTriagemEstoque();
    };
}

// 3. Tela da Serra (Recebe apenas os que o Estoque não tinha)
if (tabelaPedidosExtras) {
    renderizarPedidosSerra();

    function renderizarPedidosSerra() {
        tabelaPedidosExtras.innerHTML = '';
        
        // Filtra para mostrar apenas o que envolve a Serra
        const pedidosParaSerra = listaPedidosExtras.filter(p => p.status === 'Enviado para Serra' || p.status === 'Cortado pela Serra' || p.status === 'Repassado à Produção');

        if (pedidosParaSerra.length === 0) {
            tabelaPedidosExtras.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum pedido extra dependendo da Serra.</td></tr>';
            return;
        }

        pedidosParaSerra.forEach(pedido => {
            // Busca o index real no array original para poder alterar
            const realIndex = listaPedidosExtras.findIndex(p => p.id === pedido.id);
            const tr = document.createElement('tr');
            
            let botaoAcao = pedido.status === 'Enviado para Serra' 
                ? `<button class="btn-primary" style="background-color: #f39c12; padding: 6px;" onclick="concluirCorteExtra(${realIndex})">Informar Estoque: Corte Concluído</button>`
                : `<span style="color: #7f8c8d;">Devolvido ao Estoque</span>`;

            if (pedido.status !== 'Enviado para Serra') tr.style.opacity = '0.6';

            tr.innerHTML = `
                <td><strong>${pedido.id}</strong></td>
                <td>${pedido.peca}</td>
                <td><strong style="color: #e74c3c;">${pedido.qtd}</strong></td>
                <td style="font-size: 12px; max-width: 200px;"><em>"${pedido.motivo}"</em></td>
                <td style="color: #e74c3c; font-weight: bold;">${pedido.status}</td>
                <td>${botaoAcao}</td>
            `;
            tabelaPedidosExtras.appendChild(tr);
        });
    }

    window.concluirCorteExtra = function(index) {
        listaPedidosExtras[index].status = 'Cortado pela Serra';
        localStorage.setItem('pedidos_extras_salvos', JSON.stringify(listaPedidosExtras));
        renderizarPedidosSerra();
    };
}
document.addEventListener('DOMContentLoaded', () => {
    const formEntrada = document.getElementById('formEntrada');
    
    if (formEntrada) {
        formEntrada.addEventListener('submit', function(e) {
            e.preventDefault(); // Impede a página de recarregar
            
            const dadosPalete = {
                id_palete: document.getElementById('entID').value,
                quantidade: document.getElementById('entQtd').value,
                espessura: document.getElementById('entEsp').value,
                largura: document.getElementById('entLar').value,
                comprimento: document.getElementById('entCom').value
            };

        fetch('/api/paletes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosPalete)
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'sucesso') {
                    alert('✅ ' + data.mensagem);
                    formEntrada.reset(); // Limpa os campos para o próximo palete
                } else {
                    alert('Erro ao registrar: ' + data.mensagem);
                }
            })
            .catch(error => {
                alert('Erro de comunicação com o servidor.');
                console.error(error);
            });
        });
    }
});
   //comentario inutil só para teste 