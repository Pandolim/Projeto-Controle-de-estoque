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

const linhasProducao = ["Stilo 1.0", "Stilo 2.0", "Stilo 3.0", "Economica", "Hibrida", "Desenvolvimento", "BUX", "Sem Linha Cadastrada"];
let catalogoProdutos = {}; // Agora será preenchido pelo Banco de Dados!
let linhaAtual = "";
let listaOPs = JSON.parse(localStorage.getItem('ops_salvas')) || []; 

if (formOP && tabsLinhas) {
    renderizarTabelaOPs();
    carregarSofasDoBanco(); // Puxa todos os dados assim que a tela abre

    // Função que busca do banco e organiza os sofás nas caixinhas das linhas
    async function carregarSofasDoBanco() {
        try {
            // OBS: Esta rota precisará ser criada na Vercel depois (ex: /api/sofas)
            const response = await fetch('/api/sofas'); 
            const sofas = await response.json();
            
            // Inicializa o catálogo vazio para todas as linhas
            linhasProducao.forEach(linha => catalogoProdutos[linha] = []);
            
            // Distribui os sofás do banco nas suas linhas corretas
            sofas.forEach(sofa => {
                const nomeLinha = sofa.linha_producao || "Sem Linha Cadastrada";
                if(catalogoProdutos[nomeLinha]) {
                    catalogoProdutos[nomeLinha].push({
                        id: sofa.id_codigo,
                        nome: sofa.nome,
                        // Simplificando o cálculo de peças para a UI por enquanto
                        pecasPorSofa: 50 
                    });
                }
            });
            
            construirBotoesLinhas();
        } catch (error) {
            console.error("Erro ao carregar os sofás do banco:", error);
            // Fallback (mantém os antigos caso a API falhe)
            catalogoProdutos = {
                "Economica": [{ id: "31.08.37.30", nome: "Amsterdã 1,80m (Suede Cinza)", pecasPorSofa: 42}],
                "Stilo 1.0": [{ id: "15.99.01.00", nome: "Beegees 2,20m", pecasPorSofa: 65}]
            };
            construirBotoesLinhas();
        }
    }

    function construirBotoesLinhas() {
        tabsLinhas.innerHTML = '';
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
    }

    function selecionarLinha(linha) {
        linhaAtual = linha;
        linhaSelecionadaTexto.textContent = linha;
        opProduto.disabled = false; opQtd.disabled = false; document.getElementById('opData').disabled = false; document.getElementById('btnGerarOP').disabled = false;
        
        opProduto.innerHTML = '<option value="">Digite o código ou nome do sofá...</option>';
        const produtosDaLinha = catalogoProdutos[linha] || [];
        
        if (produtosDaLinha.length === 0) { 
            opProduto.innerHTML = '<option value="">Nenhum produto cadastrado nesta linha</option>'; 
            opProduto.disabled = true; 
            // Atualiza o visual do Select2
            if(typeof $ !== 'undefined') $('#opProduto').trigger('change');
            return; 
        }
        
        produtosDaLinha.forEach(prod => {
            const opt = document.createElement('option');
            opt.value = prod.id; 
            opt.dataset.pecas = prod.pecasPorSofa; 
            opt.textContent = `${prod.id} - ${prod.nome}`;
            opProduto.appendChild(opt);
        });
        
        // Avisa ao jQuery/Select2 que a lista interna mudou e ele precisa se redesenhar
        if(typeof $ !== 'undefined') {
            $('#opProduto').val(null).trigger('change');
        }
    }

    opQtd.addEventListener('input', calcularPreview);
    if(typeof $ !== 'undefined') {
        // O Select2 muda o evento de "change", então escutamos pelo jQuery
        $('#opProduto').on('change', calcularPreview);
    } else {
        opProduto.addEventListener('change', calcularPreview);
    }

    function calcularPreview() {
        const qtdSofas = parseInt(opQtd.value) || 0;
        const selectValue = opProduto.value;
        const optionSelecionada = opProduto.options[opProduto.selectedIndex];
        
        if (qtdSofas > 0 && selectValue !== "") {
            const pecasPorSofa = optionSelecionada ? parseInt(optionSelecionada.dataset.pecas) : 0;
            const total = pecasPorSofa * qtdSofas;
            
            document.getElementById('previewBOM').classList.replace('resultado-oculto', 'resultado-visivel');
            document.getElementById('listaPecasPreview').innerHTML = `<li><strong>Madeira Estrutural Estimada:</strong> ${(total * 0.8).toFixed(0)} peças</li>`;
            document.getElementById('totalPecasPreview').textContent = total;
        } else {
            document.getElementById('previewBOM').classList.replace('resultado-visivel', 'resultado-oculto');
        }
    }
    
    formOP.addEventListener('submit', function(event) {
        event.preventDefault();
        const optionSelecionada = opProduto.options[opProduto.selectedIndex];
        const qtdSofas = parseInt(opQtd.value);
        
        const novaOP = { 
            numero: `OP-${Math.floor(Math.random() * 10000)}`, 
            linha: linhaAtual, 
            produto: optionSelecionada.textContent, 
            quantidade: qtdSofas, 
            pecas: parseInt(optionSelecionada.dataset.pecas) * qtdSofas, 
            status: 'Pendente na Serra' 
        };
        
        listaOPs.unshift(novaOP);
        localStorage.setItem('ops_salvas', JSON.stringify(listaOPs));
        renderizarTabelaOPs();
        alert(`Sucesso! ${novaOP.numero} enviada para a Serra.`);
        
        formOP.reset(); 
        if(typeof $ !== 'undefined') $('#opProduto').val(null).trigger('change');
        document.getElementById('previewBOM').classList.replace('resultado-visivel', 'resultado-oculto');
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
// LÓGICA DO MÓDULO DE ESTOQUE E PEÇAS (SUPABASE) E FILTROS DE TABELA
// ==========================================
const formCadPeca = document.getElementById('formCadPeca');
const formMovEstoque = document.getElementById('formMovEstoque');
const tabelaEstoqueGeral = document.getElementById('tabelaEstoqueGeral');
const selectPecaEstoque = document.getElementById('selectPecaEstoque');

// Captura os novos campos de filtro do HTML
const buscaEstoqueGeral = document.getElementById('buscaEstoqueGeral');
const filtroOcultarZeradas = document.getElementById('filtroOcultarZeradas');

// Adiciona "escutadores" para refazer a tabela toda vez que o usuário digitar ou clicar
if (buscaEstoqueGeral) {
    buscaEstoqueGeral.addEventListener('input', renderizarTabelaEstoqueGeral);
}
if (filtroOcultarZeradas) {
    filtroOcultarZeradas.addEventListener('change', renderizarTabelaEstoqueGeral);
}

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
}
    if (formMovEstoque) {
        formMovEstoque.addEventListener('submit', function(event) {
            event.preventDefault();
            const payload = {
                id: selectPecaEstoque.value,
                tipo: document.getElementById('movTipo').value,
                quantidade: parseInt(document.getElementById('movQtd').value),
                usuario: localStorage.getItem('usuarioLogado') || 'Não Registrado' // <-- Capturando o usuário!
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

function carregarEstoqueDoBanco() {
    if (!tabelaEstoqueGeral) return;
    fetch('/api/pecas')
    .then(res => res.json())
    .then(pecas => {
        catalogoPecas = pecas; // Salva na memória global do navegador
        
        // Atualiza o dropdown de Movimentação de Estoque
        selectPecaEstoque.innerHTML = '<option value="">Selecione uma peça...</option>';
        pecas.forEach((peca) => {
            const dest = peca.estoqueDestino || 'N/A';
            const opt = document.createElement('option');
            opt.value = peca.id;
            opt.textContent = `${peca.nome} (${dest}) - Saldo: ${peca.qtd}`;
            
            // Garantia: Pinta a opção nativa caso o Select2 falhe em carregar
            if (dest === 'Mobly') opt.style.backgroundColor = '#FEBA4F';
            else if (dest === 'Lidiane') opt.style.backgroundColor = '#C6E6FB';
            
            selectPecaEstoque.appendChild(opt);
        });

        // Configuração especial do Select2 para injetar as cores do seu coordenador
        if(typeof $ !== 'undefined') {
            $('#selectPecaEstoque').select2({
                templateResult: function (data) {
                    // Ignora o item vazio de placeholder ("Selecione uma peça...")
                    if (!data.id) return data.text;
                    
                    // Cria uma caixinha virtual para cada item da lista
                    const $item = $('<span>' + data.text + '</span>');
                    $item.css({
                        'display': 'block',
                        'padding': '5px 10px',
                        'color': '#000', // Texto escuro para dar contraste
                        'border-radius': '4px',
                        'margin-bottom': '2px'
                    });
                    
                    // Pinta o fundo de acordo com a palavra encontrada no texto
                    if (data.text.includes('(Mobly)')) {
                        $item.css('background-color', '#FEBA4F'); // Laranja Pastel
                    } else if (data.text.includes('(Lidiane)')) {
                        $item.css('background-color', '#C6E6FB'); // Azul Ártico
                    }
                    
                    return $item;
                }
            });
        }

        // Chama a função que desenha a tabela filtrada
        renderizarTabelaEstoqueGeral();
    })
    .catch(err => console.error("Erro ao buscar peças:", err));
}

function renderizarTabelaEstoqueGeral() {
    if (!tabelaEstoqueGeral) return;
    tabelaEstoqueGeral.innerHTML = ''; // Limpa a tabela
    
    // Pega o que o usuário digitou e o status da caixinha
    const termoBusca = buscaEstoqueGeral ? buscaEstoqueGeral.value.toLowerCase() : '';
    const ocultarZeradas = filtroOcultarZeradas ? filtroOcultarZeradas.checked : false;

    // Filtra a lista principal antes de desenhar
    const pecasFiltradas = catalogoPecas.filter(peca => {
        // 1. Regra de ocultar zeradas
        if (ocultarZeradas && peca.qtd <= 0) return false;
        
        // 2. Regra da barra de pesquisa (busca por nome, id ou medidas)
        if (termoBusca) {
            const textoBusca = `${peca.nome} ${peca.id} ${peca.d1} ${peca.d2} ${peca.d3}`.toLowerCase();
            if (!textoBusca.includes(termoBusca)) return false;
        }
        
        return true; // Se passou pelos filtros, aparece na tela
    });

    // Se a busca não encontrou nada
    if (pecasFiltradas.length === 0) {
        tabelaEstoqueGeral.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #7f8c8d;">Nenhuma peça encontrada com esses filtros.</td></tr>`;
        return;
    }

    // Desenha apenas as peças que sobraram no filtro
    pecasFiltradas.forEach((peca) => {
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
    });
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
const filtroDataPedidos = document.getElementById('filtroDataPedidos');

let listaPedidosExtras = JSON.parse(localStorage.getItem('pedidos_extras_salvos')) || [];

async function carregarDropdownPedidosExtras() {
    const selectExtra = document.getElementById('extraPeca');
    if (!selectExtra) return;

    try {
        const response = await fetch('/api/pecas');
        const pecas = await response.json();
        
        selectExtra.innerHTML = '<option value="">Selecione uma peça...</option>';

        pecas.forEach(p => {
            const option = document.createElement('option');
            option.value = p.nome; 
            option.textContent = `${p.nome} - Saldo Atual: ${p.qtd} un.`; 
            selectExtra.appendChild(option);
        });

        if(typeof $ !== 'undefined') {
            $('#extraPeca').select2();
        }
    } catch (error) {
        console.error("Erro ao carregar peças para o pedido extra:", error);
        selectExtra.innerHTML = '<option value="">Erro ao carregar catálogo</option>';
    }
}

if (formPedidoExtra) {
    carregarDropdownPedidosExtras();

    formPedidoExtra.addEventListener('submit', function(event) {
        event.preventDefault();
        const motivo = document.getElementById('extraMotivo').value.trim();
        if (motivo.length < 10) { alert('A justificativa está muito curta. Por favor, detalhe melhor.'); return; }
        
        const linhaSolicitante = document.getElementById('extraLinha').value;
        const pecaSelecionada = document.getElementById('extraPeca').value;

        if (!linhaSolicitante || !pecaSelecionada) {
            alert('Por favor, selecione a linha solicitante e a peça desejada.');
            return;
        }
        
        const novoPedido = { 
            id: `EXT-${Math.floor(Math.random() * 9000) + 1000}`, 
            data_pedido: obterDataLocalISO(), // Grava a data do pedido
            linha: linhaSolicitante, 
            peca: pecaSelecionada, 
            qtd: parseInt(document.getElementById('extraQtd').value), 
            motivo: motivo, 
            status: 'Pendente no Estoque' 
        };
        
        listaPedidosExtras.unshift(novoPedido);
        localStorage.setItem('pedidos_extras_salvos', JSON.stringify(listaPedidosExtras));
        alert(`Pedido ${novoPedido.id} da linha ${linhaSolicitante} enviado para avaliação do Estoque!`);
        
        formPedidoExtra.reset();
        if(typeof $ !== 'undefined') $('#extraPeca').val(null).trigger('change'); 
    });
}

if (tabelaTriagemEstoque) {
    if (filtroDataPedidos) {
        filtroDataPedidos.value = obterDataLocalISO();
        filtroDataPedidos.addEventListener('change', renderizarTriagemEstoque);
    }
    renderizarTriagemEstoque();

    function renderizarTriagemEstoque() {
        tabelaTriagemEstoque.innerHTML = '';
        const dataSelecionada = filtroDataPedidos ? filtroDataPedidos.value : obterDataLocalISO();
        
        // Filtra pela data (Se for um pedido muito antigo e não tiver data, assume a de hoje provisoriamente)
        const listaFiltrada = listaPedidosExtras.filter(p => {
            const dataItem = p.data_pedido || obterDataLocalISO();
            return dataItem === dataSelecionada;
        });

        if (listaFiltrada.length === 0) {
            const dataFormatada = dataSelecionada.split('-').reverse().join('/');
            tabelaTriagemEstoque.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #7f8c8d;">Nenhum pedido extra registrado para o dia ${dataFormatada}.</td></tr>`;
            return;
        }

        listaFiltrada.forEach((pedido) => {
            const realIndex = listaPedidosExtras.findIndex(p => p.id === pedido.id);
            const tr = document.createElement('tr');
            let botoesAcao = '';
            
            if (pedido.status === 'Pendente no Estoque') botoesAcao = `<button class="btn-primary" style="background-color: #2ecc71; padding: 6px; margin: 2px; font-size: 12px;" onclick="atualizarPedidoExtra(${realIndex}, 'Atendido pelo Estoque')">Fornecer do Estoque</button><button class="btn-primary" style="background-color: #e74c3c; padding: 6px; margin: 2px; font-size: 12px;" onclick="atualizarPedidoExtra(${realIndex}, 'Enviado para Serra')">Solicitar à Serra</button>`;
            else if (pedido.status === 'Cortado pela Serra') botoesAcao = `<button class="btn-primary" style="background-color: #3498db; padding: 6px;" onclick="atualizarPedidoExtra(${realIndex}, 'Repassado à Produção')">Repassar à Produção</button>`;
            else { botoesAcao = `<span style="color: #7f8c8d;">Finalizado</span>`; tr.style.opacity = '0.6'; }
            
            const badgeLinha = pedido.linha ? `<br><span style="font-size: 11px; background-color: #34495e; color: white; padding: 2px 4px; border-radius: 3px; display: inline-block; margin-top: 4px;">Linha: ${pedido.linha}</span>` : '';

            tr.innerHTML = `<td><strong>${pedido.id}</strong></td><td>${pedido.peca} ${badgeLinha}</td><td><strong style="color: #e74c3c;">${pedido.qtd}</strong></td><td style="font-size: 12px; max-width: 200px;"><em>"${pedido.motivo}"</em></td><td style="font-weight: bold;">${pedido.status}</td><td>${botoesAcao}</td>`;
            tabelaTriagemEstoque.appendChild(tr);
        });
    }

    // AGORA ESTA FUNÇÃO FAZ A MÁGICA COM O BANCO DE DADOS E CONFIRMA A QUANTIDADE
    window.atualizarPedidoExtra = async function(index, novoStatus) {
        const pedido = listaPedidosExtras[index];

        try {
            if (novoStatus === 'Atendido pelo Estoque') {
                // Pergunta a quantidade real antes de dar a baixa
                let qtdInput = prompt(`Pedido original: ${pedido.qtd} peças.\nQuantas peças estão sendo efetivamente fornecidas do estoque agora?`, pedido.qtd);
                if (qtdInput === null) return; // Operador clicou em Cancelar
                
                let qtdFornecida = parseInt(qtdInput);
                if (isNaN(qtdFornecida) || qtdFornecida <= 0) { alert("Quantidade inválida!"); return; }

                // 1. Acha o ID real da peça no catálogo pela descrição
                const pecaBanco = catalogoPecas.find(p => p.nome === pedido.peca);
                if (!pecaBanco) {
                    alert("⚠️ Erro: Peça não encontrada no catálogo para dar baixa. Registre a saída manualmente.");
                    return;
                }

                // 2. Dá baixa no Supabase COM A QUANTIDADE REAL
                const resBaixa = await fetch('/api/pecas/movimentar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: pecaBanco.id, tipo: 'saida', quantidade: qtdFornecida })
                });

                if (!resBaixa.ok) {
                    alert(`❌ Operação negada: O estoque atual não possui ${qtdFornecida} peças para atender esse pedido.`);
                    return; 
                }

              // 3. Lança no Relatório de Envios 
            await fetch('/api/envios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data_envio: obterDataLocalISO(), 
                    linha: pedido.linha, 
                    peca: pedido.peca, 
                    quantidade: qtdFornecida, 
                    is_extra: false,
                    usuario: localStorage.getItem('usuarioLogado') || 'Não Registrado' // <-- Capturando o usuário aqui!
                })
            });

                pedido.qtd = qtdFornecida; // Atualiza no visual da tela
                alert(`✅ Pedido atendido! ${qtdFornecida} peças deduzidas do estoque e lançadas na Saída de Linha.`);

            } else if (novoStatus === 'Repassado à Produção') {
                // Pergunta a quantidade real do repasse
                let qtdInput = prompt(`O pedido pedia ${pedido.qtd} peças.\nQuantas peças vindas da serra estão sendo repassadas à produção agora?`, pedido.qtd);
                if (qtdInput === null) return;
                
                let qtdFornecida = parseInt(qtdInput);
                if (isNaN(qtdFornecida) || qtdFornecida <= 0) { alert("Quantidade inválida!"); return; }

               // Lança direto no Relatório de Envios (Corte Extra)
            await fetch('/api/envios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data_envio: obterDataLocalISO(), 
                    linha: pedido.linha, 
                    peca: pedido.peca, 
                    quantidade: qtdFornecida, 
                    is_extra: true,
                    usuario: localStorage.getItem('usuarioLogado') || 'Não Registrado' // <-- Usuário adicionado aqui também!
                })
            });

                pedido.qtd = qtdFornecida; // Atualiza visual
                alert(`✅ Repasse concluído! ${qtdFornecida} peças lançadas na Saída de Linha com etiqueta [EXTRA].`);
            }
            
            // Atualiza o status visual
            pedido.status = novoStatus;
            localStorage.setItem('pedidos_extras_salvos', JSON.stringify(listaPedidosExtras));
            renderizarTriagemEstoque();
            if (typeof renderizarPedidosSerra === 'function') renderizarPedidosSerra();
            
            // Força as tabelas da nuvem a atualizarem
            if (typeof carregarEstoqueDoBanco === 'function') carregarEstoqueDoBanco();
            if (typeof carregarEnviosDoBanco === 'function') carregarEnviosDoBanco();

        } catch (error) {
            console.error(error);
            alert("Erro de conexão ao processar o pedido.");
        }
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

            const badgeLinha = pedido.linha ? `<br><span style="font-size: 11px; background-color: #34495e; color: white; padding: 2px 4px; border-radius: 3px; display: inline-block; margin-top: 4px;">Linha: ${pedido.linha}</span>` : '';

            tr.innerHTML = `<td><strong>${pedido.id}</strong></td><td>${pedido.peca} ${badgeLinha}</td><td><strong style="color: #e74c3c;">${pedido.qtd}</strong></td><td style="font-size: 12px; max-width: 200px;"><em>"${pedido.motivo}"</em></td><td style="color: #e74c3c; font-weight: bold;">${pedido.status}</td><td>${botaoAcao}</td>`;
            tabelaPedidosExtras.appendChild(tr);
        });
    }
   window.concluirCorteExtra = function(index) {
        const pedido = listaPedidosExtras[index];
        
        // Pergunta a quantidade real cortada pela serra
        let qtdInput = prompt(`O pedido original era de ${pedido.qtd} peças.\nQuantas peças foram efetivamente CORTADAS?`, pedido.qtd);
        if (qtdInput === null) return; // Operador cancelou
        
        let qtdCortada = parseInt(qtdInput);
        if (isNaN(qtdCortada) || qtdCortada <= 0) {
            alert("Quantidade inválida!");
            return;
        }

        // Atualiza a quantidade do pedido para a real cortada
        listaPedidosExtras[index].qtd = qtdCortada; 
        listaPedidosExtras[index].status = 'Cortado pela Serra';
        
        localStorage.setItem('pedidos_extras_salvos', JSON.stringify(listaPedidosExtras));
        renderizarPedidosSerra();
        
        // Atualiza a tabela do estoque também, se estiver na mesma página
        const tabelaTriagemEstoque = document.getElementById('tabelaTriagemEstoque');
        if (tabelaTriagemEstoque && typeof renderizarTriagemEstoque === 'function') {
            renderizarTriagemEstoque();
        }
    };
    };


// ==========================================
// LÓGICA DE PEÇAS ENVIADAS PARA A LINHA E NUVEM
// ==========================================
const formPecaLinha = document.getElementById('formPecaLinha');
const tabelaPecasNaLinha = document.getElementById('tabelaPecasNaLinha');
const filtroDataLinha = document.getElementById('filtroDataLinha');

// AGORA A LISTA COMEÇA VAZIA E É PREENCHIDA PELA NUVEM (Adeus, localStorage!)
let listaPecasNaLinha = []; 

function obterDataLocalISO() {
    const hoje = new Date();
    const offset = hoje.getTimezoneOffset() * 60000;
    return new Date(hoje.getTime() - offset).toISOString().split('T')[0];
}

// NOVA FUNÇÃO: Busca os envios salvos no Supabase
async function carregarEnviosDoBanco() {
    if (!tabelaPecasNaLinha) return;
    try {
        const response = await fetch('/api/envios');
        listaPecasNaLinha = await response.json();
        renderizarPecasNaLinha();
    } catch (error) {
        console.error("Erro ao carregar histórico de envios:", error);
    }
}

if (formPecaLinha && tabelaPecasNaLinha && filtroDataLinha) {
    
    filtroDataLinha.value = obterDataLocalISO();
    filtroDataLinha.addEventListener('change', renderizarPecasNaLinha);
    
    // Carrega o histórico da nuvem assim que a página abre
    carregarEnviosDoBanco();

    formPecaLinha.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const select = document.getElementById('selectPecaLinha');
        const idPeca = select.value;
        const qtdStr = document.getElementById('pecaEnviadaQtd').value;
        const linha = document.getElementById('linhaDestinoSelect').value;
        
        const checkExtra = document.getElementById('checkPedidoExtra');
        const isPedidoExtra = checkExtra ? checkExtra.checked : false;

        const btnSubmit = e.target.querySelector('button[type="submit"]'); 
        
        if (!idPeca || !qtdStr || !linha) {
            alert("Por favor, selecione uma peça válida no estoque.");
            return;
        }

        const qtd = parseInt(qtdStr);
        const optionSelecionada = select.options[select.selectedIndex];
        const nomePeca = optionSelecionada ? optionSelecionada.dataset.nome : "";

        btnSubmit.disabled = true;
        btnSubmit.textContent = "Processando...";

        try {
            // 1. SE NÃO FOR EXTRA, DÁ BAIXA NO ESTOQUE PRIMEIRO
            if (!isPedidoExtra) {
                const response = await fetch('/api/pecas/movimentar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: idPeca, tipo: 'saida', quantidade: qtd })
                });

                if (!response.ok) {
                    const erro = await response.json();
                    alert("❌ Operação negada pelo sistema: " + erro.erro);
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = "Registrar Envio";
                    return; // Interrompe se deu erro (ex: falta de saldo)
                }
            }

            // 2. SALVA O RELATÓRIO DO ENVIO NO SUPABASE
            await fetch('/api/envios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data_envio: obterDataLocalISO(),
                    linha: linha,
                    peca: nomePeca,
                    quantidade: qtd,
                    is_extra: isPedidoExtra
                })
            });
            
            filtroDataLinha.value = obterDataLocalISO();
            formPecaLinha.reset();
            
            if (checkExtra) checkExtra.checked = false;
            if(typeof $ !== 'undefined') $('#selectPecaLinha').val(null).trigger('change');
            
            alert(`✅ Sucesso! ${qtd} unidades de ${nomePeca} enviadas para a linha ${linha}. ${isPedidoExtra ? '(Registrado como Corte Extra)' : ''}`);
            
            // Atualiza tudo visualmente puxando os novos dados da nuvem
            carregarDropdownLinha();
            carregarEstoqueDoBanco(); 
            carregarEnviosDoBanco(); 
            
        } catch (error) {
            console.error("Erro na comunicação:", error);
            alert("Erro ao comunicar com o servidor. Verifique sua internet.");
        } finally {
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
        const dataItem = item.data_envio;
        return dataItem === dataSelecionada;
    });

    if (listaFiltrada.length === 0) {
        const dataFormatada = dataSelecionada.split('-').reverse().join('/');
        tabelaPecasNaLinha.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #7f8c8d;">Nenhum envio registrado para o dia ${dataFormatada}.</td></tr>`;
        return;
    }
    
    listaFiltrada.forEach((item) => {
        const tr = document.createElement('tr');
        const badgeExtra = item.is_extra ? `<span style="background-color: #e74c3c; color: white; font-size: 10px; padding: 2px 5px; border-radius: 3px; margin-left: 8px; vertical-align: middle;">EXTRA</span>` : '';

        // O botão remover agora envia o ID real do banco (item.id)
        tr.innerHTML = `
            <td><span style="background: #eef2f3; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${item.linha}</span></td>
            <td>${item.peca} ${badgeExtra}</td>
            <td><strong style="color: #27ae60; font-size: 16px;">${item.quantidade}</strong></td>
            <td><button class="btn-edit" style="background-color: #e74c3c; padding: 6px 12px;" onclick="removerPecaLinha(${item.id})">Remover</button></td>
        `;
        tabelaPecasNaLinha.appendChild(tr);
    });
}

window.removerPecaLinha = async function(id) {
    if (confirm("Deseja realmente remover este registro de envio do banco de dados?")) {
        try {
            await fetch(`/api/envios/${id}`, { method: 'DELETE' });
            carregarEnviosDoBanco(); // Atualiza a tabela na tela
        } catch(e) {
            alert("Erro ao excluir. Verifique sua conexão.");
        }
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
            const dest = p.estoqueDestino || 'Lidiane'; // Garante que tenha um destino
            const option = document.createElement('option');
            option.value = p.id;
            // 1. Adicionamos a tag (Mobly) ou (Lidiane) no texto!
            option.textContent = `${p.nome} (${dest}) - Saldo: ${p.qtd} un.`; 
            option.dataset.nome = p.nome; 
            
            // 2. Cores de fallback para o HTML nativo
            if (dest === 'Mobly') option.style.backgroundColor = '#FEBA4F';
            else if (dest === 'Lidiane') option.style.backgroundColor = '#C6E6FB';

            select.appendChild(option);
        });

        // 3. O "Truque" das cores no Select2 (Igual fizemos no outro!)
        if(typeof $ !== 'undefined') {
            $('#selectPecaLinha').select2({
                templateResult: function (data) {
                    if (!data.id) return data.text;
                    
                    const $item = $('<span>' + data.text + '</span>');
                    $item.css({
                        'display': 'block',
                        'padding': '5px 10px',
                        'color': '#000',
                        'border-radius': '4px',
                        'margin-bottom': '2px'
                    });
                    
                    if (data.text.includes('(Mobly)')) {
                        $item.css('background-color', '#FEBA4F'); 
                    } else if (data.text.includes('(Lidiane)')) {
                        $item.css('background-color', '#C6E6FB'); 
                    }
                    
                    return $item;
                }
            });
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

            // 1. Busca os dados de Estoque e Movimentações
            const response = await fetch('/api/pecas');
            const pecas = await response.json();

            const responseMov = await fetch('/api/movimentacoes');
            const movimentacoes = await responseMov.json();

            const enviosSalvos = listaPecasNaLinha; 

            // Aba 1: Estoque Atual
            const dadosEstoque = pecas.map(p => ({
                "Código/ID": p.id,
                "Descrição da Peça": p.nome,
                "Estoque Pertencente": p.estoqueDestino || 'Lidiane',
                "Comprimento (mm)": p.d1,
                "Largura (mm)": p.d2,
                "Espessura (mm)": p.d3,
                "Saldo Atual": p.qtd
            }));

            // Aba 2: Envios p/ Linha (Agora com Hora e Estoque Afetado)
            const dadosEnvios = enviosSalvos.map(e => {
                let dataHoraEnvio = e.data_envio;
                
                // Tenta formatar para pegar Data e Hora completas
                if (dataHoraEnvio) {
                    const dateObj = new Date(dataHoraEnvio);
                    if (!isNaN(dateObj) && dataHoraEnvio.includes('T')) {
                        dataHoraEnvio = dateObj.toLocaleString('pt-BR');
                    } else if (dataHoraEnvio.includes('-')) {
                        // Se for um registro muito antigo apenas com YYYY-MM-DD
                        dataHoraEnvio = dataHoraEnvio.split('-').reverse().join('/');
                    }
                }
                
                // Cruza o nome da peça com o catálogo para descobrir o estoque de origem
                const pecaCatalogo = pecas.find(p => p.nome === e.peca);
                const estoqueAfetado = pecaCatalogo && pecaCatalogo.estoqueDestino ? pecaCatalogo.estoqueDestino : 'Lidiane';
                
                return {
                    "Data e Hora": dataHoraEnvio || "N/A",
                    "Linha de Produção": e.linha,
                    "Descrição da Peça": e.peca,
                    "Estoque Afetado": estoqueAfetado,
                    "Quantidade Enviada": e.quantidade,
                    "Corte Extra?": e.is_extra ? "Sim" : "Não",
                    "Usuário Responsável": e.usuario || "Não Registrado"
                };
            });

            // Aba 3: Movimentações do Estoque (Nomes e Termos ajustados)
            const dadosMovimentacoes = movimentacoes.map(m => {
                let dataHora = m.data_movimento;
                if (dataHora) {
                    const dateObj = new Date(dataHora);
                    if (!isNaN(dateObj)) {
                        dataHora = dateObj.toLocaleString('pt-BR');
                    }
                }
                return {
                    "Data e Hora": dataHora || "N/A",
                    "Usuário Responsável": m.usuario || "Não Registrado",
                    "Peça Movimentada": m.peca,
                    "Tipo de Movimento": m.tipo === 'entrada' ? 'Entrada no Estoque' : 'Saída do Estoque',
                    "Quantidade": m.quantidade,
                    "Estoque Afetado": m.estoque_destino || 'Lidiane'
                };
            });

            // Monta o arquivo e as abas
            const workbook = XLSX.utils.book_new();

            const worksheetEstoque = XLSX.utils.json_to_sheet(dadosEstoque);
            XLSX.utils.book_append_sheet(workbook, worksheetEstoque, "Estoque Atual");

            const worksheetEnvios = XLSX.utils.json_to_sheet(dadosEnvios);
            XLSX.utils.book_append_sheet(workbook, worksheetEnvios, "Envios p_ Linha");

            const worksheetMovimentacoes = XLSX.utils.json_to_sheet(dadosMovimentacoes);
            // Nome da aba atualizado
            XLSX.utils.book_append_sheet(workbook, worksheetMovimentacoes, "Movimentações do Estoque");

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
    // ==========================================
// LÓGICA DE ABRIR E FECHAR MÓDULOS
// ==========================================
window.toggleModulo = function(idConteudo, elementoHeader) {
    const conteudo = document.getElementById(idConteudo);
    const icone = elementoHeader.querySelector('.icone-toggle');

    if (conteudo.classList.contains('aberto')) {
        // Se está aberto, fecha
        conteudo.classList.remove('aberto');
        icone.textContent = '+';
    } else {
        // Se está fechado, abre
        conteudo.classList.add('aberto');
        icone.textContent = '−'; // Usando o sinal de menos
    }
};
}
carregarDropdownLinha();