// ==========================================
// LÓGICA DE LOGIN
// ==========================================
const formLogin = document.getElementById('formLogin');

if (formLogin) {
    formLogin.addEventListener('submit', function(event) {
        event.preventDefault();
        const usuario = document.getElementById('usuario').value.trim().toLowerCase();
        const senha = document.getElementById('senha').value;

        if (usuario === 'kennedy' && senha === '123') window.location.href = 'admin.html';
        else if (usuario === 'pcp' && senha === '123') window.location.href = 'pcp.html';
        else if (usuario === 'serra' && senha === '123') window.location.href = 'serra.html';
        else if (usuario === 'almoxarifado' && senha === '123') window.location.href = 'almoxarifado.html';
        else if (usuario === 'producao' && senha === '123') window.location.href = 'producao.html';
        else alert('Usuário incorreto! Teste com: kennedy, pcp, serra, almoxarifado ou producao (senha: 123).');
    });
}

// ==========================================
// LÓGICA DO PAINEL DA SERRA / ENTRADA DE PALETES
// ==========================================
const formEntrada = document.getElementById('formEntrada');
const formConsumo = document.getElementById('formConsumo');
const tabelaPaletes = document.getElementById('tabelaPaletes');

let estoquePaletes = [
    { id: 'PAL-001', espessura: 25, largura: 150, comprimento: 3.0, pecas: 800 }
];

if (formEntrada) {
    formEntrada.addEventListener('submit', function(event) {
        event.preventDefault(); 
        
        const dadosPalete = {
            id_palete: document.getElementById('entID').value.trim().toUpperCase(),
            quantidade: document.getElementById('entQtd').value,
            espessura: document.getElementById('entEsp').value,
            largura: document.getElementById('entLar').value,
            comprimento: document.getElementById('entCom').value,
            estoqueDestino: document.getElementById('estoqueDestino') ? document.getElementById('estoqueDestino').value : 'Lidiane'
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
                formEntrada.reset(); 
                if (tabelaPaletes) {
                    estoquePaletes.push({ id: dadosPalete.id_palete, espessura: dadosPalete.espessura, largura: dadosPalete.largura, comprimento: dadosPalete.comprimento, pecas: dadosPalete.quantidade });
                    renderizarTabela();
                }
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

if (formConsumo) {
    renderizarTabela();
    formConsumo.addEventListener('submit', function(event) {
        event.preventDefault();
        const idBusca = document.getElementById('consID').value.trim().toUpperCase();
        const qtdRetirada = parseInt(document.getElementById('consQtd').value);
        
        let paleteEncontrado = estoquePaletes.find(p => p.id === idBusca);
        if (!paleteEncontrado) { alert("Palete não encontrado no estoque visual!"); return; }
        if (qtdRetirada > paleteEncontrado.pecas) { alert(`Quantidade inválida! O palete ${idBusca} tem apenas ${paleteEncontrado.pecas} peças.`); return; }

        paleteEncontrado.pecas -= qtdRetirada;
        alert(`Sucesso! ${qtdRetirada} peças retiradas do palete ${idBusca}.`);
        renderizarTabela();
        formConsumo.reset();
    });
}

function renderizarTabela() {
    if (!tabelaPaletes) return;
    tabelaPaletes.innerHTML = ''; 
    estoquePaletes.forEach(palete => {
        const tr = document.createElement('tr');
        const status = palete.pecas === 0 ? '<span style="color: red; font-weight: bold;">Finalizado</span>' : '<span style="color: green; font-weight: bold;">Em Uso</span>';
        if(palete.pecas === 0) tr.style.opacity = '0.5';
        tr.innerHTML = `<td><strong>${palete.id}</strong></td><td>${palete.espessura}mm x ${palete.largura}mm x ${palete.comprimento}m</td><td><strong style="font-size: 18px;">${palete.pecas}</strong></td><td>${status}</td>`;
        tabelaPaletes.appendChild(tr);
    });
}

// ==========================================
// LÓGICA DE OPs NA SERRA
// ==========================================
const tabelaOpsSerra = document.getElementById('tabelaOpsSerra');
if (tabelaOpsSerra) {
    let opsNaSerra = JSON.parse(localStorage.getItem('ops_salvas')) || [];
    renderizarOpsSerra();

    function renderizarOpsSerra() {
        tabelaOpsSerra.innerHTML = '';
        opsNaSerra.forEach((op, index) => {
            const tr = document.createElement('tr');
            let corStatus = '#e74c3c'; 
            if (op.status === 'Cortado (Aguardando Envio)') corStatus = '#f39c12'; 
            if (op.status === 'Enviado para Linha') corStatus = '#2ecc71'; 

            let botoesAcao = '';
            if (op.status === 'Pendente na Serra') botoesAcao = `<button class="btn-primary" style="padding: 6px 12px; margin: 0;" onclick="atualizarStatusOP(${index}, 'Cortado (Aguardando Envio)')">Concluir Corte</button>`;
            else if (op.status === 'Cortado (Aguardando Envio)') botoesAcao = `<button class="btn-primary" style="background-color: #3498db; padding: 6px 12px; margin: 0;" onclick="atualizarStatusOP(${index}, 'Enviado para Linha')">Enviar p/ ${op.linha}</button>`;
            else { botoesAcao = `<span style="color: #7f8c8d;">Finalizado</span>`; tr.style.opacity = '0.6'; }

            tr.innerHTML = `<td><strong>${op.numero}</strong></td><td><span style="background: #ecf0f1; padding: 4px 8px; border-radius: 4px;">${op.linha}</span></td><td>${op.produto}</td><td><strong style="font-size: 16px;">${op.pecas}</strong></td><td style="color: ${corStatus}; font-weight: bold;">${op.status}</td><td>${botoesAcao}</td>`;
            tabelaOpsSerra.appendChild(tr);
        });
    }
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
    "Economica": [{ id: "31.08.37.30", nome: "Amsterdã 1,80m (Suede Cinza)", pecasPorSofa: 42, receita: null }, { id: "31.08.37.33", nome: "Amsterdã 1,80m (Linho Bege)", pecasPorSofa: 42, receita: null }],
    "Stilo 1.0": [{ id: "15.99.01.00", nome: "Beegees 2,20m", pecasPorSofa: 65, receita: null }, { id: "302.139.488.", nome: "SOLOMONS SOFÁ-CAMA 4L 214cm BIPARTIDO", pecasPorSofa: 130, receita: [{ qtd: 4, d1: 600, d2: 70 }, { qtd: 4, d1: 1010, d2: 70 }, { qtd: 4, d1: 970, d2: 50 }, { qtd: 4, d1: 590, d2: 70 }, { qtd: 4, d1: 550, d2: 70 }, { qtd: 2, d1: 1000, d2: 40 }] }],
    "Hibrida": [{ id: "42.11.22.99", nome: "Athena Retrátil", pecasPorSofa: 88, receita: null }]
};
let linhaAtual = "";
let listaOPs = JSON.parse(localStorage.getItem('ops_salvas')) || []; 

if (formOP && tabsLinhas) {
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
        opProduto.disabled = false; opQtd.disabled = false; document.getElementById('opData').disabled = false; document.getElementById('btnGerarOP').disabled = false;
        opProduto.innerHTML = '<option value="">Selecione um modelo...</option>';
        const produtosDaLinha = catalogoProdutos[linha] || [];
        if (produtosDaLinha.length === 0) { opProduto.innerHTML = '<option value="">Nenhum produto cadastrado nesta linha</option>'; opProduto.disabled = true; return; }
        produtosDaLinha.forEach(prod => {
            const opt = document.createElement('option');
            opt.value = prod.id; opt.dataset.pecas = prod.pecasPorSofa; opt.textContent = `${prod.id} - ${prod.nome}`;
            opProduto.appendChild(opt);
        });
    }

    opQtd.addEventListener('input', calcularPreview);
    opProduto.addEventListener('change', calcularPreview);

    function calcularPreview() {
        const qtdSofas = parseInt(opQtd.value) || 0;
        const select = opProduto.options[opProduto.selectedIndex];
        if (qtdSofas > 0 && select && select.value !== "") {
            const produtoCompleto = catalogoProdutos[linhaAtual].find(p => p.id === select.value);
            const total = produtoCompleto.pecasPorSofa * qtdSofas;
            document.getElementById('previewBOM').classList.replace('resultado-oculto', 'resultado-visivel');
            if (produtoCompleto.receita) {
                let htmlReceita = `<ul style="max-height: 200px; overflow-y: auto; padding-left: 20px; font-size: 14px; color: #34495e;">`;
                produtoCompleto.receita.forEach(item => { htmlReceita += `<li style="margin-bottom: 4px;"><strong>${item.qtd * qtdSofas}x</strong> - Peça ${item.d1}mm x ${item.d2}mm</li>`; });
                htmlReceita += `</ul>`;
                document.getElementById('listaPecasPreview').innerHTML = htmlReceita;
            } else {
                document.getElementById('listaPecasPreview').innerHTML = `<li><strong>Caixas:</strong> ${(total * 0.4).toFixed(0)} peças</li><li><strong>Encostos:</strong> ${(total * 0.3).toFixed(0)} peças</li><li><strong>Assentos:</strong> ${(total * 0.3).toFixed(0)} peças</li>`;
            }
            document.getElementById('totalPecasPreview').textContent = total;
        } else {
            document.getElementById('previewBOM').classList.replace('resultado-visivel', 'resultado-oculto');
        }
    }
    
    formOP.addEventListener('submit', function(event) {
        event.preventDefault();
        const select = opProduto.options[opProduto.selectedIndex];
        const qtdSofas = parseInt(opQtd.value);
        const novaOP = { numero: `OP-${Math.floor(Math.random() * 10000)}`, linha: linhaAtual, produto: select.textContent, quantidade: qtdSofas, pecas: parseInt(select.dataset.pecas) * qtdSofas, status: 'Pendente na Serra' };
        listaOPs.unshift(novaOP);
        localStorage.setItem('ops_salvas', JSON.stringify(listaOPs));
        renderizarTabelaOPs();
        alert(`Sucesso! ${novaOP.numero} enviada para a Serra.`);
        formOP.reset(); document.getElementById('previewBOM').classList.replace('resultado-visivel', 'resultado-oculto');
    });

    function renderizarTabelaOPs() {
        const tbody = document.getElementById('tabelaOPs'); tbody.innerHTML = '';
        listaOPs.forEach(op => {
            const corStatus = op.status === 'Pendente na Serra' ? '#e74c3c' : (op.status === 'Enviado para Linha' ? '#2ecc71' : '#f39c12');
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><strong>${op.numero}</strong></td><td><span class="tab-btn active" style="padding: 4px 8px; font-size: 12px;">${op.linha}</span></td><td>${op.produto}</td><td>${op.quantidade}</td><td>${op.pecas}</td><td style="color: ${corStatus}; font-weight: bold;">${op.status}</td>`;
            tbody.appendChild(tr);
        });
    }
}

// ==========================================
// LÓGICA DO MÓDULO DE ESTOQUE E PEÇAS (SUPABASE)
// ==========================================
const formCadPeca = document.getElementById('formCadPeca');
const formMovEstoque = document.getElementById('formMovEstoque');
const tabelaEstoqueGeral = document.getElementById('tabelaEstoqueGeral');
const selectPecaEstoque = document.getElementById('selectPecaEstoque');

let catalogoPecas = [];

if (tabelaEstoqueGeral || formCadPeca) {
    carregarEstoqueDoBanco();

    if (formCadPeca) {
        formCadPeca.addEventListener('submit', function(event) {
            event.preventDefault();
            const novaPeca = {
                id: `PEC-${Math.floor(Math.random() * 9000) + 1000}`,
                nome: document.getElementById('pecaNome').value.trim(),
                d1: parseInt(document.getElementById('pecaComprimento').value),
                d2: parseInt(document.getElementById('pecaLargura').value),
                d3: parseInt(document.getElementById('pecaEspessura').value),
                estoqueDestino: document.getElementById('pecaEstoqueDestino').value,
                qtd: 0 
            };
            
            fetch('/api/pecas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novaPeca)
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'sucesso') {
                    alert(`Sucesso! Peça ${novaPeca.nome} (${novaPeca.estoqueDestino}) salva no banco de dados.`);
                    formCadPeca.reset();
                    carregarEstoqueDoBanco();
                } else alert('Erro: ' + data.erro);
            });
        });
    }

    if (formMovEstoque) {
        formMovEstoque.addEventListener('submit', function(event) {
            event.preventDefault();
            const payload = {
                id: selectPecaEstoque.value,
                tipo: document.getElementById('movTipo').value,
                quantidade: parseInt(document.getElementById('movQtd').value)
            };

            fetch('/api/pecas/movimentar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'sucesso') {
                    alert(`Estoque atualizado com sucesso no banco!`);
                    formMovEstoque.reset();
                    carregarEstoqueDoBanco();
                } else alert('Erro: ' + data.erro);
            });
        });
    }
}

function carregarEstoqueDoBanco() {
    if (!tabelaEstoqueGeral) return;
    fetch('/api/pecas')
    .then(res => res.json())
    .then(pecas => {
        catalogoPecas = pecas;
        tabelaEstoqueGeral.innerHTML = '';
        selectPecaEstoque.innerHTML = '<option value="">Selecione uma peça...</option>';

        pecas.forEach((peca) => {
            const dest = peca.estoqueDestino || 'N/A';
            const destColor = dest === 'Lidiane' ? '#8e44ad' : '#e67e22'; 
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${peca.id}</strong><br><span style="font-size:11px; background:${destColor}; color:#fff; padding:2px 4px; border-radius:3px;">${dest}</span></td>
                <td>${peca.nome}</td>
                <td>${peca.d1}mm x ${peca.d2}mm x ${peca.d3}mm</td>
                <td><strong style="font-size: 16px; color: ${peca.qtd > 0 ? '#2ecc71' : '#e74c3c'};">${peca.qtd}</strong></td>
                <td><button class="btn-edit" onclick="removerPecaCatalogo('${peca.id}')" style="background-color: #e74c3c;">Excluir</button></td>
            `;
            tabelaEstoqueGeral.appendChild(tr);

            const opt = document.createElement('option');
            opt.value = peca.id;
            opt.textContent = `${peca.nome} (${dest}) - Saldo: ${peca.qtd}`;
            selectPecaEstoque.appendChild(opt);
        });

        // ATIVA A BARRA DE PESQUISA (Select2)
        if(typeof $ !== 'undefined') {
            $('#selectPecaEstoque').select2();
        }

    })
    .catch(err => console.error("Erro ao buscar peças:", err));
}

window.removerPecaCatalogo = function(id_peca) {
    if (confirm(`Deseja apagar esta peça permanentemente do banco de dados?`)) {
        fetch(`/api/pecas/${id_peca}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'sucesso') carregarEstoqueDoBanco();
        });
    }
};

// ==========================================
// LÓGICA DE PEDIDOS EXTRAS (Produção -> Estoque -> Serra)
// ==========================================
const formPedidoExtra = document.getElementById('formPedidoExtra');
const tabelaTriagemEstoque = document.getElementById('tabelaTriagemEstoque'); 
const tabelaPedidosExtras = document.getElementById('tabelaPedidosExtras'); 

let listaPedidosExtras = JSON.parse(localStorage.getItem('pedidos_extras_salvos')) || [];

if (formPedidoExtra) {
    formPedidoExtra.addEventListener('submit', function(event) {
        event.preventDefault();
        const motivo = document.getElementById('extraMotivo').value.trim();
        if (motivo.length < 10) { alert('A justificativa está muito curta. Por favor, detalhe melhor.'); return; }
        
        const novoPedido = { id: `EXT-${Math.floor(Math.random() * 9000) + 1000}`, peca: document.getElementById('extraPeca').value.trim(), qtd: parseInt(document.getElementById('extraQtd').value), motivo: motivo, status: 'Pendente no Estoque' };
        listaPedidosExtras.unshift(novoPedido);
        localStorage.setItem('pedidos_extras_salvos', JSON.stringify(listaPedidosExtras));
        alert(`Pedido ${novoPedido.id} enviado para avaliação do Estoque!`);
        formPedidoExtra.reset();
    });
}

if (tabelaTriagemEstoque) {
    renderizarTriagemEstoque();
    function renderizarTriagemEstoque() {
        tabelaTriagemEstoque.innerHTML = '';
        listaPedidosExtras.forEach((pedido, index) => {
            const tr = document.createElement('tr');
            let botoesAcao = '';
            if (pedido.status === 'Pendente no Estoque') botoesAcao = `<button class="btn-primary" style="background-color: #2ecc71; padding: 6px; margin: 2px; font-size: 12px;" onclick="atualizarPedidoExtra(${index}, 'Atendido pelo Estoque')">Fornecer do Estoque</button><button class="btn-primary" style="background-color: #e74c3c; padding: 6px; margin: 2px; font-size: 12px;" onclick="atualizarPedidoExtra(${index}, 'Enviado para Serra')">Solicitar à Serra</button>`;
            else if (pedido.status === 'Cortado pela Serra') botoesAcao = `<button class="btn-primary" style="background-color: #3498db; padding: 6px;" onclick="atualizarPedidoExtra(${index}, 'Repassado à Produção')">Repassar à Produção</button>`;
            else { botoesAcao = `<span style="color: #7f8c8d;">Finalizado</span>`; tr.style.opacity = '0.6'; }
            tr.innerHTML = `<td><strong>${pedido.id}</strong></td><td>${pedido.peca}</td><td><strong style="color: #e74c3c;">${pedido.qtd}</strong></td><td style="font-size: 12px; max-width: 200px;"><em>"${pedido.motivo}"</em></td><td style="font-weight: bold;">${pedido.status}</td><td>${botoesAcao}</td>`;
            tabelaTriagemEstoque.appendChild(tr);
        });
    }
    window.atualizarPedidoExtra = function(index, novoStatus) {
        listaPedidosExtras[index].status = novoStatus;
        localStorage.setItem('pedidos_extras_salvos', JSON.stringify(listaPedidosExtras));
        renderizarTriagemEstoque();
    };
}

if (tabelaPedidosExtras) {
    renderizarPedidosSerra();
    function renderizarPedidosSerra() {
        tabelaPedidosExtras.innerHTML = '';
        const pedidosParaSerra = listaPedidosExtras.filter(p => p.status === 'Enviado para Serra' || p.status === 'Cortado pela Serra' || p.status === 'Repassado à Produção');
        if (pedidosParaSerra.length === 0) { tabelaPedidosExtras.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum pedido extra dependendo da Serra.</td></tr>'; return; }

        pedidosParaSerra.forEach(pedido => {
            const realIndex = listaPedidosExtras.findIndex(p => p.id === pedido.id);
            const tr = document.createElement('tr');
            let botaoAcao = pedido.status === 'Enviado para Serra' ? `<button class="btn-primary" style="background-color: #f39c12; padding: 6px;" onclick="concluirCorteExtra(${realIndex})">Informar Estoque: Corte Concluído</button>` : `<span style="color: #7f8c8d;">Devolvido ao Estoque</span>`;
            if (pedido.status !== 'Enviado para Serra') tr.style.opacity = '0.6';
            tr.innerHTML = `<td><strong>${pedido.id}</strong></td><td>${pedido.peca}</td><td><strong style="color: #e74c3c;">${pedido.qtd}</strong></td><td style="font-size: 12px; max-width: 200px;"><em>"${pedido.motivo}"</em></td><td style="color: #e74c3c; font-weight: bold;">${pedido.status}</td><td>${botaoAcao}</td>`;
            tabelaPedidosExtras.appendChild(tr);
        });
    }
    window.concluirCorteExtra = function(index) {
        listaPedidosExtras[index].status = 'Cortado pela Serra';
        localStorage.setItem('pedidos_extras_salvos', JSON.stringify(listaPedidosExtras));
        renderizarPedidosSerra();
    };
}

// ==========================================
// LÓGICA DE PEÇAS ENVIADAS PARA A LINHA COM FILTRO DE DATA
// ==========================================
const formPecaLinha = document.getElementById('formPecaLinha');
const tabelaPecasNaLinha = document.getElementById('tabelaPecasNaLinha');
const filtroDataLinha = document.getElementById('filtroDataLinha');
let listaPecasNaLinha = JSON.parse(localStorage.getItem('pecas_na_linha_salvas')) || [];

function obterDataLocalISO() {
    const hoje = new Date();
    const offset = hoje.getTimezoneOffset() * 60000;
    return new Date(hoje.getTime() - offset).toISOString().split('T')[0];
}

if (formPecaLinha && tabelaPecasNaLinha && filtroDataLinha) {
    
    filtroDataLinha.value = obterDataLocalISO();
    filtroDataLinha.addEventListener('change', renderizarPecasNaLinha);
    renderizarPecasNaLinha();

    formPecaLinha.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const select = document.getElementById('selectPecaLinha');
        const idPeca = select.value;
        const qtdStr = document.getElementById('pecaEnviadaQtd').value;
        const linha = document.getElementById('linhaDestinoSelect').value;
        const btnSubmit = e.target.querySelector('button[type="submit"]'); 
        
        if (!idPeca || !qtdStr || !linha) {
            alert("Por favor, selecione uma peça válida no estoque.");
            return;
        }

        const qtd = parseInt(qtdStr);
        // O Select2 muda a forma de acessar a option, então garantimos pegar a correta:
        const optionSelecionada = select.options[select.selectedIndex];
        const nomePeca = optionSelecionada ? optionSelecionada.dataset.nome : "";

        // Trava o botão contra cliques duplos
        btnSubmit.disabled = true;
        btnSubmit.textContent = "Processando...";

        try {
            const response = await fetch('/api/pecas/movimentar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: idPeca,
                    tipo: 'saida',
                    quantidade: qtd
                })
            });

            if (response.ok) {
                const novoEnvio = {
                    id: Date.now(),
                    data_envio: obterDataLocalISO(),
                    linha: linha,
                    peca: nomePeca,
                    quantidade: qtd
                };
                
                listaPecasNaLinha.unshift(novoEnvio);
                localStorage.setItem('pecas_na_linha_salvas', JSON.stringify(listaPecasNaLinha));
                
                filtroDataLinha.value = obterDataLocalISO();
                renderizarPecasNaLinha();
                formPecaLinha.reset();
                
                // Limpa o visual do Select2 após o reset do form
                if(typeof $ !== 'undefined') $('#selectPecaLinha').val(null).trigger('change');
                
                alert(`✅ Sucesso! ${qtd} unidades de ${nomePeca} enviadas para a linha ${linha}.`);
                
                carregarDropdownLinha();
                carregarEstoqueDoBanco(); 
            } else {
                const erro = await response.json();
                alert("❌ Operação negada pelo sistema: " + erro.erro);
            }
        } catch (error) {
            console.error("Erro na comunicação:", error);
            alert("Erro ao comunicar com o servidor. Verifique sua internet.");
        } finally {
            // Libera o botão novamente
            btnSubmit.disabled = false;
            btnSubmit.textContent = "Registrar Envio";
        }
    });
}

function renderizarPecasNaLinha() {
    if (!tabelaPecasNaLinha) return;
    tabelaPecasNaLinha.innerHTML = '';
    
    const dataSelecionada = filtroDataLinha.value;
    
    const listaFiltrada = listaPecasNaLinha.filter(item => {
        const dataItem = item.data_envio || new Date(item.id).toISOString().split('T')[0];
        return dataItem === dataSelecionada;
    });

    if (listaFiltrada.length === 0) {
        const dataFormatada = dataSelecionada.split('-').reverse().join('/');
        tabelaPecasNaLinha.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #7f8c8d;">Nenhum envio registrado para o dia ${dataFormatada}.</td></tr>`;
        return;
    }
    
    listaFiltrada.forEach((item) => {
        const realIndex = listaPecasNaLinha.findIndex(p => p.id === item.id);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span style="background: #eef2f3; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${item.linha}</span></td>
            <td>${item.peca}</td>
            <td><strong style="color: #27ae60; font-size: 16px;">${item.quantidade}</strong></td>
            <td><button class="btn-edit" style="background-color: #e74c3c; padding: 6px 12px;" onclick="removerPecaLinha(${realIndex})">Remover</button></td>
        `;
        tabelaPecasNaLinha.appendChild(tr);
    });
}

window.removerPecaLinha = function(index) {
    if (confirm("Deseja realmente remover este registro de envio para a linha?")) {
        listaPecasNaLinha.splice(index, 1);
        localStorage.setItem('pecas_na_linha_salvas', JSON.stringify(listaPecasNaLinha));
        renderizarPecasNaLinha();
    }
};

async function carregarDropdownLinha() {
    const select = document.getElementById('selectPecaLinha');
    if (!select) return; 

    try {
        const response = await fetch('/api/pecas');
        const pecas = await response.json();
        
        select.innerHTML = '<option value="">Selecione uma peça...</option>';

        pecas.forEach(p => {
            if (p.qtd > 0) {
                const option = document.createElement('option');
                option.value = p.id;
                option.textContent = `${p.nome} - Saldo: ${p.qtd} un.`; 
                option.dataset.nome = p.nome; 
                select.appendChild(option);
            }
        });

        // ATIVA A BARRA DE PESQUISA (Select2)
        if(typeof $ !== 'undefined') {
            $('#selectPecaLinha').select2();
        }

    } catch (error) {
        console.error("Erro ao carregar peças para o envio:", error);
        select.innerHTML = '<option value="">Erro ao carregar estoque</option>';
    }
}

// ==========================================
// LÓGICA DE EXPORTAÇÃO PARA EXCEL (.xlsx) - MÚLTIPLAS ABAS
// ==========================================
const btnExportarExcel = document.getElementById('btnExportarExcel');

if (btnExportarExcel) {
    btnExportarExcel.addEventListener('click', async function() {
        try {
            btnExportarExcel.textContent = "⏳ Gerando Relatório...";
            btnExportarExcel.disabled = true;

            const response = await fetch('/api/pecas');
            const pecas = await response.json();

            const enviosSalvos = JSON.parse(localStorage.getItem('pecas_na_linha_salvas')) || [];

            const dadosEstoque = pecas.map(p => ({
                "Código/ID": p.id,
                "Descrição da Peça": p.nome,
                "Estoque Pertencente": p.estoqueDestino || 'Lidiane',
                "Comprimento (mm)": p.d1,
                "Largura (mm)": p.d2,
                "Espessura (mm)": p.d3,
                "Saldo Atual": p.qtd
            }));

            const dadosEnvios = enviosSalvos.map(e => {
                let dataFormatada = e.data_envio;
                if (dataFormatada && dataFormatada.includes('-')) {
                    dataFormatada = dataFormatada.split('-').reverse().join('/');
                }
                
                return {
                    "Data do Envio": dataFormatada || "N/A",
                    "Linha de Produção": e.linha,
                    "Descrição da Peça": e.peca,
                    "Quantidade Enviada": e.quantidade
                };
            });

            const workbook = XLSX.utils.book_new();

            const worksheetEstoque = XLSX.utils.json_to_sheet(dadosEstoque);
            XLSX.utils.book_append_sheet(workbook, worksheetEstoque, "Estoque Atual");

            const worksheetEnvios = XLSX.utils.json_to_sheet(dadosEnvios);
            XLSX.utils.book_append_sheet(workbook, worksheetEnvios, "Envios p_ Linha");

            const dataHoje = new Date().toISOString().split('T')[0].split('-').reverse().join('-');
            XLSX.writeFile(workbook, `Relatorio_Geral_Estoque_${dataHoje}.xlsx`);

        } catch (error) {
            console.error("Erro ao gerar Excel:", error);
            alert("Erro ao gerar a planilha. Verifique sua conexão com a internet.");
        } finally {
            btnExportarExcel.textContent = "📊 Exportar Relatório Completo";
            btnExportarExcel.disabled = false;
        }
    });
}

carregarDropdownLinha();