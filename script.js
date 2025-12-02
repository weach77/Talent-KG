// --- 配置部分 ---
const conceptDefinitions = {
    "姓名": { color: "#FF9999", displayLabel: "姓名" },
    "单位": { color: "#99FF99", displayLabel: "单位" },
    "地区": { color: "#FFCC99", displayLabel: "地区" },
    "研究领域": { color: "#99FFCC", displayLabel: "研究领域" }
};

const relationDefinitions = {
    "拥有": { displayLabel: "拥有" },
    "就职于": { displayLabel: "就职于" },
    "所在地区": { displayLabel: "所在地区" },
    "是": { displayLabel: "是" },
    "参与项目": { displayLabel: "参与项目" },
    "所研究领域": { displayLabel: "所研究领域" }
};

// --- 全局变量 ---
let originalNodesMap = new Map();
let originalEdgesArray = [];
let allNodeIds = [];
let currentNetworkInstance = null;
let currentNodesDataset = null;
let currentEdgesDataset = null;
let controlsVisible = true;
let nodeTypeStatsCache = null; // 【优化】缓存节点类型统计

// --- 初始化UI元素 ---
function initializeUIElements() {
    createLoadingIndicator();
    createStatisticsPanel();
    createNodeDetailsPanel();
}

// --- 加载指示器 ---
function createLoadingIndicator() {
    const loader = document.createElement('div');
    loader.id = 'loading-indicator';
    loader.innerHTML = `
        <div class="loader-content">
            <div class="spinner"></div>
            <p>正在加载数据...</p>
        </div>
    `;
    loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 999;
        font-size: 18px;
        color: white;
    `;

    const style = document.createElement('style');
    style.textContent = `
        .loader-content {
            text-align: center;
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
        .spinner {
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top: 4px solid white;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(loader);
}

function showLoadingIndicator(show) {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

// --- 统计面板 ---
function createStatisticsPanel() {
    const panel = document.createElement('div');
    panel.id = 'statistics-panel';
    panel.innerHTML = `
        <div class="stats-header">
            <h3>图谱统计</h3>
            <button class="close-btn" onclick="toggleStatisticsPanel()">−</button>
        </div>
        <div class="stats-content">
            <div class="stat-item">
                <span class="stat-label">总节点数:</span>
                <span class="stat-value" id="total-nodes">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">总关系数:</span>
                <span class="stat-value" id="total-edges">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">当前节点数:</span>
                <span class="stat-value" id="current-nodes">0</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">当前关系数:</span>
                <span class="stat-value" id="current-edges">0</span>
            </div>
            <hr style="margin: 10px 0;">
            <div class="stat-breakdown">
                <h4>节点类型分布</h4>
                <div id="node-type-stats"></div>
            </div>
        </div>
    `;
    panel.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        width: 250px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 5px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 100;
        font-size: 13px;
        font-family: Arial, sans-serif;
        max-height: 400px;
        overflow-y: auto;
    `;

    const style = document.createElement('style');
    style.textContent = `
        #statistics-panel {
            display: none;
        }
        #statistics-panel.show {
            display: block;
        }
        .stats-header {
            background: #f0f0f0;
            padding: 8px 12px;
            border-bottom: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
        }
        .stats-header h3 {
            margin: 0;
            font-size: 14px;
            font-weight: bold;
        }
        .close-btn {
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .close-btn:hover {
            color: #000;
        }
        .stats-content {
            padding: 10px;
            display: block;
        }
        .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        .stat-label {
            font-weight: bold;
            color: #333;
        }
        .stat-value {
            color: #0066cc;
            font-weight: bold;
        }
        .stat-breakdown {
            margin-top: 10px;
        }
        .stat-breakdown h4 {
            margin: 5px 0;
            font-size: 12px;
            color: #333;
        }
        .type-stat {
            padding: 3px 0;
            font-size: 12px;
            display: flex;
            justify-content: space-between;
        }
        .type-color {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 5px;
            vertical-align: middle;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(panel);
    
    panel.classList.add('show');
}

function updateStatisticsPanel() {
    const totalNodes = originalNodesMap.size;
    const totalEdges = originalEdgesArray.length;
    const currentNodes = currentNodesDataset ? currentNodesDataset.length : 0;
    const currentEdges = currentEdgesDataset ? currentEdgesDataset.length : 0;

    document.getElementById('total-nodes').textContent = totalNodes;
    document.getElementById('total-edges').textContent = totalEdges;
    document.getElementById('current-nodes').textContent = currentNodes;
    document.getElementById('current-edges').textContent = currentEdges;

    updateNodeTypeStats();
}

function updateNodeTypeStats() {
    const typeStats = {};
    originalNodesMap.forEach((node) => {
        const match = node.title.match(/类型: ([^\n]+)/);
        const type = match ? match[1] : '未知';
        typeStats[type] = (typeStats[type] || 0) + 1;
    });

    const typeStatsDiv = document.getElementById('node-type-stats');
    if (!typeStatsDiv) return;

    typeStatsDiv.innerHTML = '';
    Object.entries(typeStats).forEach(([type, count]) => {
        const config = Object.values(conceptDefinitions).find(c => c.displayLabel === type) || { color: '#CCCCCC' };
        const typeDiv = document.createElement('div');
        typeDiv.className = 'type-stat';
        typeDiv.innerHTML = `
            <span>
                <span class="type-color" style="background-color: ${config.color};"></span>
                <span>${type}</span>
            </span>
            <span>${count}</span>
        `;
        typeStatsDiv.appendChild(typeDiv);
    });
}

function toggleStatisticsPanel() {
    const panel = document.getElementById('statistics-panel');
    const content = panel.querySelector('.stats-content');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        panel.querySelector('.close-btn').textContent = '−';
    } else {
        content.style.display = 'none';
        panel.querySelector('.close-btn').textContent = '+';
    }
}

// --- 节点详情面板 ---
function createNodeDetailsPanel() {
    const panel = document.createElement('div');
    panel.id = 'node-details-panel';
    panel.innerHTML = `
        <div class="details-header">
            <h3>节点详情</h3>
            <button class="close-btn" onclick="hideNodeDetails()">✕</button>
        </div>
        <div class="details-content" id="details-content">
            <p style="color: #999; text-align: center;">选择图谱中的节点查看详情</p>
        </div>
    `;
    panel.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        width: 320px;
        max-height: 400px;
        background: white;
        border: 1px solid #ddd;
        border-radius: 5px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 100;
        font-size: 13px;
        font-family: Arial, sans-serif;
        overflow: hidden;
    `;

    const style = document.createElement('style');
    style.textContent = `
        #node-details-panel {
            display: none !important;
            flex-direction: column;
        }
        #node-details-panel.show {
            display: flex !important;
        }
        .details-header {
            background: #f0f0f0;
            padding: 10px 12px;
            border-bottom: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
        }
        .details-header h3 {
            margin: 0;
            font-size: 14px;
            font-weight: bold;
        }
        .details-header .close-btn {
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 24px;
            height: 24px;
            transition: color 0.2s;
        }
        .details-header .close-btn:hover {
            color: #000;
        }
        .details-content {
            padding: 12px;
            overflow-y: auto;
            flex: 1;
        }
        .detail-row {
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #f0f0f0;
        }
        .detail-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }
        .detail-label {
            font-weight: bold;
            color: #333;
            margin-bottom: 3px;
        }
        .detail-value {
            color: #666;
            word-break: break-all;
            background: #f9f9f9;
            padding: 5px;
            border-radius: 3px;
            font-size: 12px;
            white-space: pre-wrap;
        }
        .relation-list {
            font-size: 12px;
            color: #666;
        }
        .relation-item {
            padding: 3px 0;
            padding-left: 15px;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(panel);
}

// --- 获取节点类型 ---
function getNodeTypeFromTitle(title) {
    const match = title.match(/类型: ([^\n]+)/);
    return match ? match[1] : '未知';
}

// --- 显示节点详情 ---
function showNodeDetails(nodeId) {
    const node = originalNodesMap.get(nodeId);
    if (!node) return;

    const relatedEdges = originalEdgesArray.filter(edge =>
        edge.from === nodeId || edge.to === nodeId
    );

    const detailsContent = document.getElementById('details-content');
    let html = `
        <div class="detail-row">
            <div class="detail-label">节点名称</div>
            <div class="detail-value">${escapeHtml(node.label)}</div>
        </div>
    `;

    const nodeType = getNodeTypeFromTitle(node.title);
    const typesToHideProps = ['单位', '地区', '研究领域'];

    if (!typesToHideProps.includes(nodeType)) {
        const props = node.properties || {};
        const propKeys = Object.keys(props).filter(k => k !== 'name' && k !== 'id');
        if (propKeys.length > 0) {
            html += `
                <div class="detail-row">
                    <div class="detail-label">属性</div>
                    <div class="detail-value">
                        ${propKeys.map(k => `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(props[k]))}</div>`).join('')}
                    </div>
                </div>
            `;
        }
    }

    if (relatedEdges.length > 0) {
        html += `
            <div class="detail-row">
                <div class="detail-label">相关关系 (${relatedEdges.length})</div>
                <div class="relation-list">
        `;
        relatedEdges.forEach(edge => {
            const relatedNode = originalNodesMap.get(edge.from === nodeId ? edge.to : edge.from);
            const direction = edge.from === nodeId ? '→' : '←';
            html += `
                <div class="relation-item">
                    ${direction} <strong>${escapeHtml(edge.label)}</strong>: ${escapeHtml(relatedNode?.label || '未知')}
                </div>
            `;
        });
        html += `</div></div>`;
    }

    detailsContent.innerHTML = html;
    const panel = document.getElementById('node-details-panel');
    panel.classList.add('show');
}

function hideNodeDetails() {
    const panel = document.getElementById('node-details-panel');
    if (panel) {
        panel.classList.remove('show');
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// --- 节点处理逻辑 ---
function processNode(nodeData, nodesMap, allIds) {
    if (nodesMap.has(nodeData.elementId)) return;

    const nodeLabel = nodeData.labels[0];
    const config = conceptDefinitions[nodeLabel] || { color: "#CCCCCC", displayLabel: nodeLabel };

    let nodeLabelValue = nodeData.properties.name || nodeData.properties.value || nodeData.elementId;

    nodesMap.set(nodeData.elementId, {
        id: nodeData.elementId,
        label: nodeLabelValue,
        color: config.color,
        title: `ID: ${nodeData.elementId}\n类型: ${config.displayLabel}\n值: ${nodeData.properties.value || nodeData.properties.name || 'N/A'}\n属性: ${JSON.stringify(nodeData.properties, null, 2) || 'N/A'}`,
        properties: nodeData.properties || {}
    });
    allIds.push(nodeData.elementId);
}

// --- 页面加载 ---
window.addEventListener('DOMContentLoaded', function() {
    initializeUIElements();
    showLoadingIndicator(true);

    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error(`网络请求失败: ${response.statusText}`);
            return response.json();
        })
        .then(neo4jData => {
            if (!Array.isArray(neo4jData) || neo4jData.length === 0)
                throw new Error('数据格式无效或数据为空');

            neo4jData.forEach(item => {
                try {
                    const { n: nodeN, r: rel, m: nodeM } = item;
                    if (!nodeN || !nodeM || !rel) return;

                    processNode(nodeN, originalNodesMap, allNodeIds);
                    processNode(nodeM, originalNodesMap, allNodeIds);

                    const relConfig = relationDefinitions[rel.type] || { displayLabel: rel.type };
                    originalEdgesArray.push({
                        from: nodeN.elementId,
                        to: nodeM.elementId,
                        label: relConfig.displayLabel,
                        arrows: 'to',
                        title: `关系: ${relConfig.displayLabel}\nID: ${rel.elementId}\n属性: ${JSON.stringify(rel.properties, null, 2) || 'N/A'}`
                    });
                } catch (error) {
                    console.error('处理数据项时出错:', error, item);
                }
            });

            console.log(`数据加载完成: ${originalNodesMap.size} 个节点, ${originalEdgesArray.length} 条边`);
            initializeGraph();
        })
        .catch(error => {
            console.error('加载或处理数据时出错:', error);
            showLoadingIndicator(false);
            const container = document.getElementById('mynetwork');
            if (container) container.innerHTML = `<p style="color:red; text-align:center;">数据加载失败: ${escapeHtml(error.message)}</p>`;
        });
});

// --- 初始化图谱 ---
function initializeGraph() {
    const container = document.getElementById('mynetwork');
    if (!container) return console.error('未找到图谱容器');

    const nodesDataset = new vis.DataSet(Array.from(originalNodesMap.values()));
    const edgesDataset = new vis.DataSet(originalEdgesArray);

    currentNodesDataset = nodesDataset.get();
    currentEdgesDataset = edgesDataset.get();

    const data = { nodes: nodesDataset, edges: edgesDataset };
    const options = {
        autoResize: true,
        height: '100%',
        width: '100%',
        nodes: {
            shape: 'dot',
            size: 16,
            font: { size: 14, color: '#000' },
            borderWidth: 2
        },
        edges: {
            width: 2,
            color: { inherit: 'from' },
            smooth: { type: 'continuous' }
        },
        physics: {
            stabilization: true,
            barnesHut: { gravitationalConstant: -3000, springLength: 150, springConstant: 0.04 }
        },
        interaction: {
            hover: false, // 取消鼠标悬停 tooltip
            tooltipDelay: 200
        }
    };

    currentNetworkInstance = new vis.Network(container, data, options);

    currentNetworkInstance.on('selectNode', function(params) {
        if (params.nodes.length > 0) showNodeDetails(params.nodes[0]);
    });

    currentNetworkInstance.on('deselectNode', function() {
        hideNodeDetails();
    });

    showLoadingIndicator(false);
    updateStatisticsPanel();
}