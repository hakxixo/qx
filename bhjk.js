/*

薄荷健康

下载：https://apps.apple.com/cn/app/id457856023


规则随开随用。
功能：解锁超级会员，去广告|解锁音频课程| 薄荷电台|图文课程等。

Tg频道 https://t.me/iosapp520

作者: ios鸡神


[rewrite]
# 会员
^https://api\.boohee\.com/app-interface/v1/user/user_info url script-response-body https://raw.githubusercontent.com/gjwj666/qx/main/bhjk.js
# 广告
^https://api\.boohee\.com/app-interface/v1/ad/info url 302 & request-header Connection: close


[mitm]
hostname = api.boohee.com



*/


let body = $response.body;

// 修改member字段为true
body = body.replace(/"member":\w+/, '"member":true');

// 修改state字段为1
body = body.replace(/"state":"",/, '"state":"1",');

// 修改expired_at字段为"2199-01-01 00:00:00"
body = body.replace(/"expired_at":".*?",/, '"expired_at":"2199-01-01 00:00:00",');

$done({ body });