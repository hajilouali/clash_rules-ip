const maxConfigItems = 500
const maxPerType = 300
const includeOriginalConfigs = 0

const subLinks = [
  "https://raw.githubusercontent.com/freefq/free/master/v2",
  "https://raw.githubusercontent.com/Pawdroid/Free-servers/main/sub",
  "https://raw.githubusercontent.com/AzadNetCH/Clash/main/V2Ray.txt",
  "https://raw.githubusercontent.com/Leon406/SubCrawler/main/sub/share/v2",
  "https://raw.githubusercontent.com/ermaozi/get_subscribe/main/subscribe/v2ray.txt",
  "https://raw.githubusercontent.com/xiyaowong/freeFQ/main/v2ray",
  "https://raw.githubusercontent.com/iwxf/free-v2ray/master/index.html",
  "https://raw.githubusercontent.com/Jsnzkpg/Jsnzkpg/Jsnzkpg/Jsnzkpg",
  "https://raw.githubusercontent.com/aiboboxx/v2rayfree/main/v2",
  "https://raw.githubusercontent.com/peasoft/NoMoreWalls/master/list.txt",
  "https://raw.githubusercontent.com/ssrsub/ssr/master/V2Ray",
  "https://raw.fastgit.org/codingbox/Free-Node-Merge/main/node.txt",
  "https://raw.githubusercontent.com/vpei/Free-Node-Merge/main/o/node.txt",
  "https://sub.pmsub.me/base64"
]
const cnfLinks = [
  "https://raw.githubusercontent.com/mahdibland/ShadowsocksAggregator/master/sub/sub_merge.txt",
  "https://raw.githubusercontent.com/hossein-mohseni/Free-V2ray-Config/main/configs.txt",
  "https://raw.githubusercontent.com/Bardiafa/Free-V2ray-Config/main/Splitted/vmess.txt",
  "https://raw.githubusercontent.com/LonUp/NodeList/main/V2RAY/Latest.txt",
  "https://raw.githubusercontent.com/awesome-vpn/awesome-vpn/master/all"
]
const cleanIPLink = "https://raw.githubusercontent.com/coldwater-10/clash_rules/main/List%20of%20clean%20IPs.txt"
const operatorList = ["AST", "HWB", "IRC", "MBT", "MCI", "MKB", "PRS", "RTL", "SHT", "ZTL", "PIS", "DAT", "SAB", "ASR", "FAN", "ZTL", "SFR", "DID", "LAY", "MAH", "TAK", "PET", "AND", "RES", "AFR", "ARA", "SAM", "APT", "ALL", "PLUS", "TEST", "ENG", "FA"]
const addressList = ["discord.com", "cloudflare.com", "nginx.com", "cdnjs.com", "vimeo.com", "networksolutions.com"]
const fpList = ["chrome", "chrome", "chrome", "firefox", "safari", "edge", "ios", "android", "360", "qq", "random", "random"]
const alpnList = ["http/1.1", "h2,http/1.1", "h2,http/1.1"]
var cleanIPs = []

export default {
  async fetch(request) {
    var url = new URL(request.url)
    var pathParts = url.pathname.replace(/^\/|\/$/g, "").split("/")
    var type = pathParts[0].toLowerCase()
    if (["sub", "clash"].includes(type)) {
      if (pathParts[1] !== undefined) {
        var operator = pathParts[1].toUpperCase()
        if (operatorList.includes(operator)) {
          cleanIPs = await fetch(cleanIPLink).then(r => r.text()).then(t => t.split("\n"))
          cleanIPs = cleanIPs.filter(line => (line.search(operator) > 0))
          cleanIPs = cleanIPs.map(line => line.split(" ")[0].trim())
        } else {
          cleanIPs = [operator.toLowerCase()]
        }
      }

      var configList = []
      for (var subLink of subLinks) {
        try {
          configList = configList.concat(await fetch(subLink).then(r => r.text()).then(a => atob(a)).then(t => t.split("\n")))
        } catch (e) { }
      }
      for (var cnfLink of cnfLinks) {
        try {
          configList = configList.concat(await fetch(cnfLink).then(r => r.text()).then(t => t.split("\n")))
        } catch (e) { }
      }
      
      var vmessConfigList = configList.filter(cnf => (cnf.search("vmess://") == 0))
      var trojanConfigList = configList.filter(cnf => (cnf.search("trojan://") == 0))
      var ssConfigList = configList.filter(cnf => (cnf.search("ss://") == 0))
      var mergedConfigList = []
      
      if (type == "sub") {
        if (includeOriginalConfigs) {
          mergedConfigList = mergedConfigList.concat(getMultipleRandomElements(vmessConfigList, maxPerType))
        }
        mergedConfigList = mergedConfigList.concat(
          getMultipleRandomElements(
            vmessConfigList.map(decodeVmess).map(cnf => mixConfig(cnf, url, "vmess")).filter(cnf => (!!cnf && cnf.id)).map(encodeVmess).filter(cnf => !!cnf),
            maxPerType
          )
        )

        if (includeOriginalConfigs) {
          mergedConfigList = mergedConfigList.concat(getMultipleRandomElements(trojanConfigList, maxPerType))
          mergedConfigList = mergedConfigList.concat(getMultipleRandomElements(ssConfigList, maxPerType))
        }

        return new Response(btoa(getMultipleRandomElements(mergedConfigList, maxConfigItems).join("\n")));
      } else { // clash
        if (includeOriginalConfigs) {
          mergedConfigList = mergedConfigList.concat(
            getMultipleRandomElements(
              vmessConfigList.map(decodeVmess).filter(cnf => (cnf && cnf.id)).map(cnf => toClash(cnf, "vmess")).filter(cnf => (cnf && cnf.uuid)),
              maxPerType
            )
          )
        }
        mergedConfigList = mergedConfigList.concat(
          getMultipleRandomElements(
            vmessConfigList.map(decodeVmess).map(cnf => mixConfig(cnf, url, "vmess")).filter(cnf => (cnf && cnf.id)).map(cnf => toClash(cnf, "vmess")),
            maxPerType
          )
        )
        return new Response(toYaml(mergedConfigList));
      }
    } else {
      var url = new URL(request.url)
      var newUrl = new URL("https://" + url.pathname.replace(/^\/|\/$/g, ""))
      return fetch(new Request(newUrl, request));
    }
  }
}

function encodeVmess(conf) {
  try {
    return "vmess://" + btoa(JSON.stringify(conf))
  } catch {
    return null
  }
}

function decodeVmess(conf) {
  try {
    return JSON.parse(atob(conf.substr(8)))
  } catch {
    return {}
  }
}

function mixConfig(conf, url, protocol) {
  try {
    if (conf.tls != "tls") {
      return {}
    }
    var addr = conf.sni
    if (!addr) {
      if (conf.add && !isIp(conf.add)) {
        addr = conf.add
      } else if (conf.host && !isIp(conf.host)) {
        addr = conf.host
      }
    }
    if (!addr) {
      return conf
    }
    conf.name = (conf.name ? conf.name : conf.ps) + '-Worker'
    conf.sni = url.hostname
    if (cleanIPs.length) {
      conf.add = cleanIPs[Math.floor(Math.random() * cleanIPs.length)]
    } else {
      conf.add = addressList[Math.floor(Math.random() * addressList.length)]
    }
    
    if (protocol == "vmess") {
      conf.sni = url.hostname
      conf.host = url.hostname
      if (conf.path == undefined) {
        conf.path = ""
      }
      conf.path = "/" + addr + ":" + conf.port + "/" + conf.path.replace(/^\//g, "")
      conf.fp = fpList[Math.floor(Math.random() * fpList.length)]
      conf.alpn = alpnList[Math.floor(Math.random() * alpnList.length)]
      conf.port = 443
    }
    return conf
  } catch (e) {
    return {}
  }
}

function getMultipleRandomElements(arr, num) {
  var shuffled = arr //[...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, num)
}

function isIp(str) {
  try {
    if (str == "" || str == undefined) return false
    if (!/^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])(\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])){2}\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-4])$/.test(str)) {
      return false
    }
    var ls = str.split('.')
    if (ls == null || ls.length != 4 || ls[3] == "0" || parseInt(ls[3]) === 0) {
      return false
    }
    return true
  } catch (e) { }
  return false
}

function toClash(conf, protocol) {
  const regexUUID = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi
  var config = {}
  try {
    config = {
      name: conf.name ? conf.name : conf.ps,
      type: protocol,
      server: conf.add,
      port: conf.port,
      uuid: conf.id,
      alterId: 0,
      tls: true,
      cipher: conf.cipher ? conf.cipher : "auto",
      "skip-cert-verify": true,
      servername: conf.sni,
      network: conf.net,
      "ws-opts": {
        path: conf.path,
        headers: {
          host: conf.host
        }
      }
    }
    config.name = config.name.replace(/[^\x20-\x7E]/g, "").replace(/[\s\/:|\[\]@\(\)\.]/g, "") + "-" + Math.floor(Math.random() * 10000)
    if (!regexUUID.test(config.uuid)) {
      return {}
    }
    return config
  } catch (e) {
    return {}
  }
}

function toYaml(configList) {
  var yaml = 
`
mixed-port: 7890
allow-lan: true
tcp-concurrent: true
enable-process: true
find-process-mode: always
global-client-fingerprint: chrome
geodata-mode: true
geox-url:
  geoip: "https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geoip.dat"
  geosite: "https://cdn.jsdelivr.net/gh/Loyalsoldier/v2ray-rules-dat@release/geosite.dat"
  mmdb: "https://cdn.jsdelivr.net/gh/Loyalsoldier/geoip@release/Country.mmdb"
mode: rule
log-level: info
ipv6: true
external-controller: 127.0.0.1:9090
profile:
  store-selected: false 
  store-fake-ip: true
dns:
  enable: true
  listen: 127.0.0.1:53 
  ipv6: true
  prefer-h3: true
  default-nameserver: 
    - '127.0.0.1'
    - '1.1.1.1'
  enhanced-mode: fake-ip
  use-hosts: true
  nameserver:
    - '127.0.0.1'
    - '1.1.1.1'
  fallback:
    - "https://1.1.1.1/dns-query"
    - "https://8.8.8.8/dns-query"
    - "https://9.9.9.9/dns-query"
    - "https://rubyfish.cn/dns-query"
  fallback-filter:
    geoip: false
    ipcidr:
      - '0.0.0.0/8'
      - '10.0.0.0/8'
      - '100.64.0.0/10'
      - '127.0.0.0/8'
      - '169.254.0.0/16'
      - '172.16.0.0/12'
      - '192.0.0.0/24'
      - '192.0.2.0/24'
      - '192.88.99.0/24'
      - '192.168.0.0/16'
      - '198.18.0.0/15'
      - '198.51.100.0/24'
      - '203.0.113.0/24'
      - '224.0.0.0/3'
      - '240.0.0.0/4'
      - '::1/128'
      - '64:ff9b:1::/48'
      - 'fc00::/7'
      - 'fe80::/10'


rule-providers:
  iran:
    type: http
    behavior: classical
    url: >-
      https://github.com/bootmortis/iran-hosted-domains/releases/latest/download/clash_rules.yaml
    path: ./ruleset/iran.yaml
    interval: 432000
  steam:
    type: http
    behavior: classical
    url: >-
      https://raw.githubusercontent.com/coldwater-10/clash_rules/main/steam.yaml
    path: ./ruleset/steam.yaml
    interval: 432000
  add:
    type: http
    behavior: classical
    url: https://raw.githubusercontent.com/coldwater-10/clash_rules/main/add.yaml
    path: ./ruleset/add.yaml
    interval: 432000
  Purification:
    type: http
    behavior: classical
    url: >-
      https://raw.githubusercontent.com/coldwater-10/clash_rules/main/Purification%20app.yaml
    path: ./ruleset/Purification.yaml
    interval: 432000
  Global:
    type: http
    behavior: classical
    url: >-
      https://raw.githubusercontent.com/coldwater-10/clash_rules/main/Global%20tracking.yaml
    path: ./ruleset/Global.yaml
    interval: 432000
  AntiAd:
    type: http
    behavior: domain
    url: >-
      https://raw.githubusercontent.com/privacy-protection-tools/anti-AD/master/anti-ad-clash.yaml
    path: ./ruleset/AntiAd.yaml
    interval: 432000


proxies:
${configList.map(cnf => "  - " + JSON.stringify(cnf)).join("\n")}

proxy-groups:

  - name: 📶 انتخاب نوع اتصال
    type: select
    proxies:
      - UrlTest 📍
      - Fallback ➡️
      - LoadBalance(ch) ♻️
      - LoadBalance(rr) ⏳
      - select 🤏🏻
      - DIRECT
      - REJECT

  - name: select 🤏🏻
    type: select
    proxies:
${configList.map(cnf => "      - " + cnf.name.trim()).join("\n")}

  - name: UrlTest 📍
    type: url-test
    url: http://clients3.google.com/generate_204
    interval: 300
    proxies:
${configList.map(cnf => "      - " + cnf.name.trim()).join("\n")}

  - name: Fallback ➡️
    type: fallback
    url: http://clients3.google.com/generate_204
    interval: 300
    proxies:
${configList.map(cnf => "      - " + cnf.name.trim()).join("\n")}

  - name: LoadBalance(ch) ♻️
    type: load-balance
    strategy: consistent-hashing
    url: http://clients3.google.com/generate_204
    interval: 300
    proxies:
${configList.map(cnf => "      - " + cnf.name.trim()).join("\n")}

  - name: LoadBalance(rr) ⏳
    type: load-balance
    strategy: round-robin
    url: http://clients3.google.com/generate_204
    interval: 300
    tolerance: 100
    proxies:
${configList.map(cnf => "      - " + cnf.name.trim()).join("\n")}

  - name: 🎮 استیم
    type: select
    proxies:
      - DIRECT
      - REJECT
      - 📶 انتخاب نوع اتصال
  - name: 🛑 رهگیری جهانی
    type: select
    proxies:
      - REJECT
      - DIRECT
      - 📶 انتخاب نوع اتصال
  - name: 🍃 تصفیه برنامه
    type: select
    proxies:
      - REJECT
      - DIRECT
      - 📶 انتخاب نوع اتصال
  - name: 🆎 تبلیغات
    type: select
    proxies:
      - REJECT
      - DIRECT
      - 📶 انتخاب نوع اتصال
  - name: 🇮🇷 سایتای ایرانی
    type: select
    proxies:
      - DIRECT
      - REJECT
      - 📶 انتخاب نوع اتصال

rules:
  - DOMAIN-SUFFIX,ir,🇮🇷 سایتای ایرانی
  - GEOIP,IR,🇮🇷 سایتای ایرانی
  - GEOSITE,category-ir,🇮🇷 سایتای ایرانی
  - RULE-SET,iran,🇮🇷 سایتای ایرانی
  - DOMAIN-KEYWORD,freeserver.top,🇮🇷 سایتای ایرانی
  - DOMAIN-KEYWORD,sermovie.xyz,🇮🇷 سایتای ایرانی
  - DOMAIN-KEYWORD,mobo-dl-filter-nakon.xyz,🇮🇷 سایتای ایرانی
  - RULE-SET,steam,🎮 استیم
  - GEOSITE,category-ads-all,🆎 تبلیغات 
  - RULE-SET,add,🆎 تبلیغات
  - RULE-SET,AntiAd,🆎 تبلیغات
  - RULE-SET,Purification,🍃 تصفیه برنامه
  - RULE-SET,Global,🛑 رهگیری جهانی
  - GEOSITE,win-spy,🛑 رهگیری جهانی
  - MATCH,📶 انتخاب نوع اتصال
`
   return yaml
}
