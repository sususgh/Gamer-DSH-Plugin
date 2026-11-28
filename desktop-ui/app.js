const $=id=>document.getElementById(id);
const log=(message)=>{const list=$('eventLog');const row=document.createElement('div');row.className='event';const t=document.createElement('time');t.textContent=new Date().toLocaleTimeString('zh-CN',{hour12:false});const dot=document.createElement('span');dot.className='event-dot';const p=document.createElement('p');p.textContent=message;row.append(t,dot,p);list.prepend(row);while(list.children.length>8)list.lastChild.remove();};
let mode='USB';
document.querySelectorAll('.choice').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');mode=btn.dataset.mode;$('transportMode').textContent=mode==='USB'?'USB / ADB':'Wi-Fi / LAN';log('连接方式已选择：'+mode+'。等待设备桥接服务接入。');}));
$('connectBtn').addEventListener('click',()=>{log('已请求设备连接；当前原型尚未接入 ADB / Wi-Fi 桥接服务。');$('globalState').textContent='等待设备桥接服务';});
$('stopBtn').addEventListener('click',()=>{log('停止请求已记录。真实运行时接入后，此按钮将向 Agent Coordinator 发送紧急停止指令。');});
$('probeBtn').addEventListener('click',()=>{log('模型健康检查暂不可执行：尚未配置本地推理运行时。');$('modelState').textContent='等待推理适配器';});
$('modelConfigBtn').addEventListener('click',()=>{const primary=prompt('主模型标识（例如本地服务中的模型 ID）：');if(primary){$('activeModel').textContent=primary;$('modelState').textContent='已保存到本次界面会话；尚未连接模型服务';log('主模型候选已填写：'+primary+'。等待运行时探测。');}const fallback=prompt('备用模型标识（可留空）：');if(fallback!==null&&fallback.trim()){$('fallbackModel').textContent=fallback.trim();log('备用模型候选已填写：'+fallback.trim()+'。尚未执行真实健康检查。');}});
$('clearLog').addEventListener('click',()=>{$('eventLog').replaceChildren();log('日志已清空。');});
const canvas=$('flowCanvas'),ctx=canvas.getContext('2d');let phase=0;
function draw(){const dpr=Math.max(1,window.devicePixelRatio||1),w=canvas.clientWidth,h=150;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);for(let j=0;j<2;j++){ctx.beginPath();for(let x=0;x<=w;x+=3){const y=h/2+Math.sin(x*.023+phase+j*1.5)*(15+j*8)+Math.sin(x*.009-phase*.7)*(7+j*4);if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle=j===0?'rgba(91,190,199,.72)':'rgba(160,145,211,.58)';ctx.lineWidth=j===0?2:1.6;ctx.stroke();}phase+=.025;requestAnimationFrame(draw);}draw();window.addEventListener('resize',()=>{canvas.width=0;});

/* Model selection UI is intentionally empty until the real local-model registry reports installed models. */
$('selectAllModels')?.addEventListener('click',()=>{log('模型列表尚未从本地运行时加载，暂时没有可选择的模型。');});
/* Desktop-generated, real QR pairing. The UI must be served by desktop-runtime/server.js. */
const pairQrImage=$('pairQrImage');
const pairQrEmpty=$('pairQrEmpty');
const pairHostSelect=$('pairHostSelect');
const pairRefresh=$('pairRefresh');
const pairStop=$('pairStop');
let pairExpiryTimer=null;
let pairGenerating=false;
let lastPairHost='';

function setPairState(text){$('pairState').textContent=text;}
function clearPairQr(){
  if(pairQrImage){pairQrImage.hidden=true;pairQrImage.removeAttribute('src');}
  if(pairQrEmpty)pairQrEmpty.hidden=false;
  $('pairQrCaption').textContent='正在等待自动生成…';
  $('pairExpires').textContent='5 分钟 · 未生成';
  if(pairStop)pairStop.disabled=true;
  if(pairExpiryTimer){clearInterval(pairExpiryTimer);pairExpiryTimer=null;}
}
async function generatePairQr({automatic=false}={}){
  if(pairGenerating||!pairHostSelect?.value)return;
  pairGenerating=true;
  try{
    pairRefresh.disabled=true;
    setPairState(automatic?'正在自动生成安全二维码…':'正在生成安全二维码…');
    const response=await fetch('/api/pairing/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({host:pairHostSelect.value}),cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'HTTP '+response.status);
    if(!data.qrDataUrl||!Number.isFinite(data.expiresAt))throw new Error('二维码服务返回数据不完整');
    pairQrImage.src=data.qrDataUrl;pairQrImage.hidden=false;pairQrEmpty.hidden=true;
    $('pairQrCaption').textContent='真实二维码 · 手机扫码';
    $('pairHost').textContent=data.host+':'+data.port;
    $('pairExpires').textContent='05:00';
    setPairState('二维码已自动生成 · 等待手机扫码');
    pairStop.disabled=false;
    if(pairExpiryTimer)clearInterval(pairExpiryTimer);
    const expiresAt=data.expiresAt;
    pairExpiryTimer=setInterval(()=>{
      const remaining=Math.max(0,expiresAt-Date.now());
      const mm=String(Math.floor(remaining/60000)).padStart(2,'0');
      const ss=String(Math.floor((remaining%60000)/1000)).padStart(2,'0');
      $('pairExpires').textContent=mm+':'+ss;
      if(remaining<=0){
        clearInterval(pairExpiryTimer);pairExpiryTimer=null;clearPairQr();
        setPairState('二维码已过期，正在自动刷新…');
        log('配对二维码已过期，正在自动生成新二维码。');
        setTimeout(()=>generatePairQr({automatic:true}),1200);
      }
    },250);
    log((automatic?'自动':'手动')+'生成电脑端安全二维码：'+data.host+':'+data.port+'，有效期 5 分钟。');
  }catch(error){
    setPairState('生成失败：'+error.message);
    $('pairQrCaption').textContent='生成失败，请点击重新生成';
    log('二维码生成失败：'+error.message);
  }finally{
    pairGenerating=false;
    pairRefresh.disabled=!pairHostSelect?.value;
  }
}
async function loadPairNetworks({autoGenerate=false}={}){
  try{
    const response=await fetch('/api/network/interfaces',{cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.json();
    const addresses=data.addresses||[];
    const previous=pairHostSelect.value;
    pairHostSelect.replaceChildren();
    for(const item of addresses){
      const option=document.createElement('option');
      option.value=item.address;option.textContent=item.name+' · '+item.address;
      pairHostSelect.append(option);
    }
    if(!pairHostSelect.options.length){
      const option=document.createElement('option');option.value='';option.textContent='未发现局域网 IPv4 地址';pairHostSelect.append(option);
      $('pairHost').textContent='未发现局域网地址';
      setPairState('请连接 Wi-Fi 或检查网络');
      pairRefresh.disabled=true;
      return;
    }
    if(addresses.some(item=>item.address===previous))pairHostSelect.value=previous;
    const host=pairHostSelect.value;
    $('pairHost').textContent=host;
    pairRefresh.disabled=false;
    if(autoGenerate||host!==lastPairHost){
      lastPairHost=host;
      await generatePairQr({automatic:true});
    }else if(!pairQrImage.src||pairQrImage.hidden){
      setPairState('配对服务已就绪，正在自动生成二维码…');
      await generatePairQr({automatic:true});
    }
  }catch(error){
    pairHostSelect.replaceChildren();
    const option=document.createElement('option');option.value='';option.textContent='桌面配对服务未启动';pairHostSelect.append(option);
    setPairState('请通过启动脚本打开桌面控制台');
    pairRefresh.disabled=true;
    log('无法连接桌面配对服务：'+error.message+'。请勿直接双击 index.html。');
  }
}
pairHostSelect?.addEventListener('change',()=>{
  $('pairHost').textContent=pairHostSelect.value||'未选择';
  lastPairHost=pairHostSelect.value;
  generatePairQr({automatic:true});
});
pairRefresh?.addEventListener('click',()=>generatePairQr());
pairStop?.addEventListener('click',async()=>{
  try{
    const response=await fetch('/api/pairing/stop',{method:'POST',cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    clearPairQr();setPairState('二维码已撤销');log('电脑端配对二维码已撤销。');
  }catch(error){setPairState('撤销失败：'+error.message);log('撤销二维码失败：'+error.message);}
});
loadPairNetworks({autoGenerate:true});
window.addEventListener('online',()=>loadPairNetworks({autoGenerate:true}));
setInterval(()=>loadPairNetworks(),30000);


$('visionTestBtn')?.addEventListener('click',()=>{log('视觉自检请求已记录；当前仓库尚未接入帧采集、OCR 或目标检测运行时。');$('visionEngineState').textContent='运行时未接入';});
$('researchBtn')?.addEventListener('click',()=>{log('攻略检索检查请求已记录；联网搜索适配器尚未接入，当前不会生成未经来源核验的攻略。');$('researchState').textContent='搜索适配器未接入';});
$('memoryBtn')?.addEventListener('click',()=>{log('经验记忆检查请求已记录；本地存储、检索与用户清除接口尚未接入。');$('memoryState').textContent='记忆库未接入';});


/* Optional community TTS bridge. The model weights stay outside this repository. */
const ttsEndpoint=$('ttsEndpoint');
const ttsAudio=$('ttsAudio');
const savedTtsEndpoint=localStorage.getItem('gamer.tts.endpoint');
if(savedTtsEndpoint&&ttsEndpoint)ttsEndpoint.value=savedTtsEndpoint;
const getTtsBase=()=>{const raw=(ttsEndpoint?.value||'').trim().replace(/\/+$/,'');if(!raw)throw new Error('请填写 TTS 服务地址');const u=new URL(raw);if(!['http:','https:'].includes(u.protocol))throw new Error('只支持 HTTP(S) 地址');return raw;};
$('ttsHealthBtn')?.addEventListener('click',async()=>{
  try{
    const base=getTtsBase();localStorage.setItem('gamer.tts.endpoint',base);
    $('ttsState').textContent='正在检测…';
    const response=await fetch(base+'/health',{method:'GET'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const data=await response.json();
    if(data.status!=='ok'||data.loaded!==true)throw new Error('服务在线，但音色模型尚未加载');
    $('ttsState').textContent='已连接 · '+(data.model||'TTS 模型')+' · '+(data.device||'device');
    log('派蒙 TTS 服务健康检查通过。');
  }catch(e){$('ttsState').textContent='连接失败：'+e.message;log('派蒙 TTS 检查失败：'+e.message);}
});
$('ttsPreviewBtn')?.addEventListener('click',async()=>{
  try{
    const base=getTtsBase();localStorage.setItem('gamer.tts.endpoint',base);
    const text=($('ttsText')?.value||'').trim();if(!text)throw new Error('请输入试听文本');
    $('ttsState').textContent='正在合成语音…';
    const response=await fetch(base+'/tts_to_audio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,length_scale:1.0})});
    if(!response.ok){let detail='HTTP '+response.status;try{const data=await response.json();detail=data.error?.message||detail;}catch{}throw new Error(detail);}
    const blob=await response.blob();if(!blob.type.includes('audio'))throw new Error('服务返回的不是音频文件');
    if(ttsAudio.dataset.objectUrl)URL.revokeObjectURL(ttsAudio.dataset.objectUrl);
    const objectUrl=URL.createObjectURL(blob);ttsAudio.dataset.objectUrl=objectUrl;ttsAudio.src=objectUrl;
    await ttsAudio.play();$('ttsState').textContent='语音合成成功 · 正在播放';log('派蒙 TTS 试听合成成功。');
  }catch(e){$('ttsState').textContent='试听失败：'+e.message;log('派蒙 TTS 试听失败：'+e.message);}
});
