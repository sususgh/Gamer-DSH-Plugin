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
$('pairRefresh')?.addEventListener('click',()=>{log('安全配对服务尚未启动，当前不能生成真实二维码。');});
