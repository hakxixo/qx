
/*
 * 脚本功能：爱加速VPN节点提取 - QuantumultX本地版
 * 软件版本：1.0
 * 脚本作者：基于CatVPN脚本改编
 * 更新时间：2026年01月29日
 * 使用声明：此脚本仅供学习与交流，请在下载使用24小时内删除！请勿在中国大陆转载与贩卖！
 *******************************
[rewrite_local]
# > 爱加速VPN节点提取
^https?:\/\/api\.91ajs\.com\/(v1\/server|server\/list|server\/list\?.*)$ url script-response-body https://github.com/hakxixo/qx/blob/main/xmnnnnnnly.js

[mitm]
hostname = api.91ajs.com
*******************************
*/

// 环境检测
const $ = new Env('爱加速节点提取');

function Env(name) {
  return {
    name: name,
    notify: (title, subtitle, message) => {
      if (typeof $notify !== 'undefined') {
        $notify(title, subtitle, message);
      } else if (typeof $notification !== 'undefined') {
        $notification.post(title, subtitle, message);
      }
    },
    log: (message) => {
      console.log(`[${name}] ${message}`);
    }
  };
}

// 安全JSON解析
function safeJsonParse(str) { 
  try { return JSON.parse(str) } catch { return null } 
}

// Base64编码
function base64Encode(str) {
  if (typeof $base64 !== "undefined") {
    return $base64.encode(str);
  } else if (typeof btoa !== "undefined") {
    return btoa(unescape(encodeURIComponent(str)));
  } else {
    return Buffer.from(str).toString('base64');
  }
}

// 生成Shadowsocks节点
function generateSSNode(serverInfo, isPro = false) {
  try {
    const { host, port, password, method, country_name, id } = serverInfo;
    if (!host || !port || !password) return null;

    const typeText = isPro ? "付费" : "免费";
    const remarks = `${typeText}-${country_name || '未知'}-${id || host}`;
    const method_used = method || "aes-256-gcm";

    return `ss://${base64Encode(`${method_used}:${password}@${host}:${port}`)}#${encodeURIComponent(remarks)}`;
  } catch (e) {
    return null;
  }
}

// 生成VMess节点
function generateVMessNode(serverInfo, isPro = false) {
  try {
    const { host, port, uuid, alterId, country_name, id } = serverInfo;
    if (!host || !port || !uuid) return null;

    const typeText = isPro ? "付费" : "免费";
    const remarks = `${typeText}-${country_name || '未知'}-${id || host}`;
    const alterId_used = alterId || 0;

    const vmessConfig = {
      v: "2",
      ps: remarks,
      add: host,
      port: port,
      id: uuid,
      aid: alterId_used,
      net: "tcp",
      type: "none",
      host: "",
      path: "",
      tls: ""
    };

    return `vmess://${base64Encode(JSON.stringify(vmessConfig))}`;
  } catch (e) {
    return null;
  }
}

// 生成Trojan节点
function generateTrojanNode(serverInfo, isPro = false) {
  try {
    const { host, port, password, country_name, id } = serverInfo;
    if (!host || !port || !password) return null;

    const typeText = isPro ? "付费" : "免费";
    const remarks = `${typeText}-${country_name || '未知'}-${id || host}`;

    return `trojan://${password}@${host}:${port}?allowInsecure=1#${encodeURIComponent(remarks)}`;
  } catch (e) {
    return null;
  }
}

// 处理服务器配置
function processServerConfig(server, isPro = false) {
  try {
    if (!server) return null;

    // 爱加速可能的字段映射
    const serverInfo = {
      host: server.host || server.ip || server.server || server.address,
      port: server.port || 443,
      password: server.password || server.pass || server.key || server.pwd,
      method: server.method || server.cipher || "aes-256-gcm",
      uuid: server.uuid || server.id || server.user_id,
      alterId: server.alterId || server.aid || 0,
      country_name: server.country || server.area || server.location || server.region || '未知',
      id: server.id || server.name || server.server_id || server.node_id
    };

    // 根据不同协议类型生成节点
    const protocol = (server.type || server.protocol || '').toLowerCase();
    if (protocol === 'ss' || protocol === 'shadowsocks') {
      return generateSSNode(serverInfo, isPro);
    } else if (protocol === 'vmess' || protocol === 'v2ray') {
      return generateVMessNode(serverInfo, isPro);
    } else if (protocol === 'trojan') {
      return generateTrojanNode(serverInfo, isPro);
    } else {
      // 默认尝试生成Shadowsocks节点
      return generateSSNode(serverInfo, isPro);
    }
  } catch (e) {
    $.log(`处理服务器配置失败: ${e.message}`);
    return null;
  }
}

// 主处理逻辑
function handleAijiasuResponse() {
  $.log("开始处理爱加速节点响应数据");
  
  if (typeof $response === 'undefined' || !$response.body) {
    $.log("响应数据不存在或为空");
    $.notify("爱加速节点提取失败", "", "响应数据不存在");
    return $done({});
  }

  const originalBody = $response.body;
  const responseData = safeJsonParse(originalBody);
  
  if (!responseData) {
    $.log("响应数据不是有效的JSON格式");
    $.notify("爱加速节点提取失败", "", "响应数据格式错误");
    return $done({ body: originalBody });
  }

  try {
    let servers = [];
    
    // 尝试不同的数据结构
    if (responseData.data && Array.isArray(responseData.data)) {
      servers = responseData.data;
    } else if (responseData.servers && Array.isArray(responseData.servers)) {
      servers = responseData.servers;
    } else if (responseData.list && Array.isArray(responseData.list)) {
      servers = responseData.list;
    } else if (responseData.items && Array.isArray(responseData.items)) {
      servers = responseData.items;
    } else if (responseData.nodes && Array.isArray(responseData.nodes)) {
      servers = responseData.nodes;
    } else if (Array.isArray(responseData)) {
      servers = responseData;
    } else {
      $.log("未找到服务器列表数据，尝试查找其他字段");
      // 打印所有可能的字段用于调试
      Object.keys(responseData).forEach(key => {
        if (Array.isArray(responseData[key])) {
          $.log(`发现数组字段: ${key}, 长度: ${responseData[key].length}`);
        }
      });
      throw new Error("未找到服务器列表");
    }

    const allNodes = [];
    let processedCount = 0;

    // 处理所有服务器
    servers.forEach((server, index) => {
      const isPro = server.is_pro || server.isVip || server.vip || server.premium || false;
      const node = processServerConfig(server, isPro);
      if (node) {
        allNodes.push(node);
        processedCount++;
      } else {
        $.log(`处理第${index + 1}个服务器失败: ${JSON.stringify(server).substring(0, 100)}`);
      }
    });

    if (allNodes.length === 0) {
      throw new Error(`未生成任何节点，共处理${servers.length}个服务器`);
    }

    // 生成节点文本
    const nodeText = allNodes.join('\n');
    
    // 通知用户
    $.notify(
      "爱加速节点提取成功", 
      `共提取 ${allNodes.length} 个节点 (处理${processedCount}/${servers.length})`,
      `节点已准备就绪，可查看日志或剪贴板`
    );
    
    $.log(`成功提取 ${allNodes.length} 个节点，处理了 ${processedCount}/${servers.length} 个服务器`);
    $.log("节点列表:");
    allNodes.forEach((node, index) => {
      $.log(`${index + 1}: ${node}`);
    });
    
    // 将节点保存到剪贴板（如果支持）
    if (typeof $clipboard !== "undefined") {
      $clipboard.copy(nodeText);
      $.log("节点信息已复制到剪贴板");
    }
    
  } catch (error) {
    $.log(`处理失败: ${error.message}`);
    $.notify("爱加速节点提取失败", "", error.message);
  }

  // 原样返回响应数据
  $done({ body: originalBody });
}

// 入口执行
if (typeof $response !== "undefined") {
  handleAijiasuResponse();
} else {
  $.log("非响应拦截环境，脚本不执行");
  $done({});
}